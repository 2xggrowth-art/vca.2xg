import { useState, useRef } from 'react';
import { MicrophoneIcon, StopIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/solid';

interface AudioRecorderProps {
  label: string;
  audioBlob: Blob | null;
  audioUrl: string;
  onRecordingComplete: (blob: Blob) => void;
  onDelete: () => void;
  required?: boolean;
}

export default function AudioRecorder({
  label,
  audioBlob,
  audioUrl,
  onRecordingComplete,
  onDelete,
  required = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleDelete = () => {
    onDelete();
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasAudio = audioBlob || audioUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="space-y-3">
        {/* Recording Controls */}
        {!hasAudio && (
          <div className="flex items-center space-x-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                <MicrophoneIcon className="w-5 h-5 mr-2" />
                Start Recording
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm font-medium"
                >
                  <StopIcon className="w-5 h-5 mr-2" />
                  Stop Recording
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-gray-700">{formatTime(recordingTime)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Audio Playback */}
        {hasAudio && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <PlayIcon className="w-5 h-5 text-primary-600" />
                <audio controls className="flex-1" src={audioBlob ? URL.createObjectURL(audioBlob) : audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="ml-3 text-red-600 hover:text-red-700 transition"
                title="Delete recording"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          {hasAudio
            ? 'Audio recorded. You can play it back or delete to record again.'
            : 'Click the button to start recording your audio.'}
        </p>
      </div>
    </div>
  );
}
