import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Play, Pause, FileText, Video, Mic, Upload, Clock, MapPin, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui';
import { videographerService } from '@/services/videographerService';
import type { ViralAnalysis } from '@/types';
import toast from 'react-hot-toast';

type TabType = 'script' | 'files' | 'info';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ViralAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('script');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await videographerService.getProjectById(id!);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      navigate('/videographer/my-projects');
    } finally {
      setLoading(false);
    }
  };

  const playVoiceNote = (url: string, noteType: string) => {
    if (playingAudio === noteType) {
      audioElement?.pause();
      setPlayingAudio(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    setAudioElement(audio);
    setPlayingAudio(noteType);
  };

  const handleMarkComplete = async () => {
    try {
      setMarkingComplete(true);
      await videographerService.markShootingComplete(id!);
      toast.success('Shooting marked as complete!');
      navigate('/videographer/my-projects');
    } catch (error: any) {
      console.error('Failed to mark complete:', error);
      toast.error(error.message || 'Failed to mark as complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  const getFileCount = () => {
    return project?.production_files?.filter((f: any) => !f.is_deleted).length || 0;
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'SHOOTING': return { label: 'Shooting', color: 'bg-orange-100 text-orange-700' };
      case 'READY_FOR_EDIT': return { label: 'Ready for Edit', color: 'bg-purple-100 text-purple-700' };
      case 'EDITING': return { label: 'Editing', color: 'bg-pink-100 text-pink-700' };
      case 'READY_TO_POST': return { label: 'Ready to Post', color: 'bg-green-100 text-green-700' };
      case 'POSTED': return { label: 'Posted', color: 'bg-emerald-100 text-emerald-700' };
      default: return { label: 'Planning', color: 'bg-blue-100 text-blue-700' };
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Project" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Header title="Project" showBack />
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
        </div>
      </>
    );
  }

  const stageInfo = getStageLabel(project.production_stage);

  return (
    <>
      <Header
        title={project.title || 'Untitled'}
        subtitle={project.content_id || 'No ID'}
        showBack
        rightAction={
          <span className={`px-2 py-1 text-[11px] font-semibold rounded-full uppercase ${stageInfo.color}`}>
            {stageInfo.label}
          </span>
        }
      />

      <div className="px-4 py-4 pb-32">
        {/* Quick Info Bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar">
          <span className="px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium whitespace-nowrap">
            {project.profile?.name || 'No profile'}
          </span>
          <span className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-sm whitespace-nowrap flex items-center gap-1 capitalize">
            <MapPin className="w-3 h-3" />
            {project.shoot_type || 'Indoor'}
          </span>
          {project.deadline && (
            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-sm whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due {new Date(project.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Reference Video Link */}
        {project.reference_url && (
          <a
            href={project.reference_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl mb-4 text-white"
          >
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Play className="w-6 h-6 ml-0.5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Reference Video</p>
              <p className="text-sm text-white/80">Tap to view original</p>
            </div>
            <ExternalLink className="w-5 h-5 text-white/80" />
          </a>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {[
            { id: 'script', label: 'Script', icon: FileText },
            { id: 'files', label: 'Files', icon: Video },
            { id: 'info', label: 'Info', icon: Mic },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'script' && (
          <div className="space-y-4 animate-fade-in">
            {/* Why Viral */}
            {project.why_viral && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Why It's Viral
                </h3>
                <p className="text-gray-800">{project.why_viral}</p>
              </div>
            )}

            {/* How To Replicate */}
            {project.how_to_replicate && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  How To Replicate
                </h3>
                <p className="text-gray-800 whitespace-pre-wrap">{project.how_to_replicate}</p>
              </div>
            )}

            {/* Voice Notes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Voice Notes</h3>
              {project.hook_voice_note_url && (
                <button
                  onClick={() => playVoiceNote(project.hook_voice_note_url!, 'hook')}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {playingAudio === 'hook' ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary ml-0.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Hook Explanation</p>
                    <p className="text-sm text-gray-500">{playingAudio === 'hook' ? 'Playing...' : 'Tap to play'}</p>
                  </div>
                </button>
              )}
              {project.why_viral_voice_note_url && (
                <button
                  onClick={() => playVoiceNote(project.why_viral_voice_note_url!, 'whyViral')}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {playingAudio === 'whyViral' ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary ml-0.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Why Viral</p>
                    <p className="text-sm text-gray-500">{playingAudio === 'whyViral' ? 'Playing...' : 'Tap to play'}</p>
                  </div>
                </button>
              )}
              {project.how_to_replicate_voice_note_url && (
                <button
                  onClick={() => playVoiceNote(project.how_to_replicate_voice_note_url!, 'howTo')}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {playingAudio === 'howTo' ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary ml-0.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Replication Steps</p>
                    <p className="text-sm text-gray-500">{playingAudio === 'howTo' ? 'Playing...' : 'Tap to play'}</p>
                  </div>
                </button>
              )}
              {!project.hook_voice_note_url && !project.why_viral_voice_note_url && !project.how_to_replicate_voice_note_url && (
                <p className="text-sm text-gray-400">No voice notes available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Uploaded Files</h3>
              <span className="text-xs text-gray-500">{getFileCount()} files</span>
            </div>

            {project.production_files && project.production_files.length > 0 ? (
              <div className="space-y-2">
                {project.production_files
                  .filter((file: any) => !file.is_deleted)
                  .map((file: any) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Video className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {file.file_type} • {(file.file_size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </a>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No files uploaded yet</p>
              </div>
            )}

            {project.production_stage === 'SHOOTING' && (
              <Link to={`/videographer/upload/${id}`}>
                <Button fullWidth className="mt-4 bg-videographer">
                  <Upload className="w-5 h-5" />
                  Upload Footage
                </Button>
              </Link>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
              {[
                { label: 'Content ID', value: project.content_id || 'Not assigned' },
                { label: 'Profile', value: project.profile?.name || 'Not set' },
                { label: 'Platform', value: project.platform?.replace('_', ' ') || 'Not set' },
                { label: 'Shoot Type', value: project.shoot_type || 'Indoor' },
                { label: 'Priority', value: project.priority || 'Normal' },
                { label: 'Target Emotion', value: project.target_emotion || 'Not set' },
                { label: 'Deadline', value: project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-900 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      {project.production_stage === 'SHOOTING' && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-4 max-w-mobile mx-auto">
          {getFileCount() > 0 ? (
            <Button
              fullWidth
              size="lg"
              variant="success"
              onClick={handleMarkComplete}
              disabled={markingComplete}
            >
              {markingComplete ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Mark Shooting Complete
                </>
              )}
            </Button>
          ) : (
            <Link to={`/videographer/upload/${id}`}>
              <Button fullWidth size="lg" className="bg-videographer shadow-lg">
                <Upload className="w-5 h-5" />
                Upload Footage
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
