import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  label: string;
  hint?: string;
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  existingUrl?: string;
}

export default function VoiceRecorder({
  label,
  hint,
  value,
  onChange,
  existingUrl,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onChange(audioBlob);
        setRecordedDuration(duration);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
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

  const playRecording = () => {
    if (value || existingUrl) {
      const url = value ? URL.createObjectURL(value) : existingUrl!;
      audioRef.current = new Audio(url);

      audioRef.current.onended = () => {
        setIsPlaying(false);
      };

      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onChange(null);
    setRecordedDuration(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasRecording = value !== null || existingUrl;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
        {/* Record/Stop Button */}
        {!hasRecording && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-blue-500 text-white'
            }`}
          >
            {isRecording ? (
              <Square className="w-5 h-5" fill="white" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Play/Pause Button */}
        {hasRecording && (
          <button
            type="button"
            onClick={isPlaying ? pausePlayback : playRecording}
            className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
        )}

        {/* Info */}
        <div className="flex-1">
          {isRecording ? (
            <>
              <p className="text-sm font-medium text-red-600">Recording...</p>
              <p className="text-xs text-gray-500">{formatTime(duration)} • Tap to stop</p>
            </>
          ) : hasRecording ? (
            <>
              <p className="text-sm font-medium text-gray-900">Recording saved</p>
              <p className="text-xs text-gray-500">
                {formatTime(recordedDuration || 0)} • Tap to play
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">Record Voice Note</p>
              <p className="text-xs text-gray-500">{hint || 'Tap to start recording'}</p>
            </>
          )}
        </div>

        {/* Delete Button */}
        {hasRecording && !isRecording && (
          <button
            type="button"
            onClick={deleteRecording}
            className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
