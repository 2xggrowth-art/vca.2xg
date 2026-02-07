import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Video, Clock, Eye, ExternalLink, Loader2, MapPin, Film, Music } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui';
import { editorService } from '@/services/editorService';
import type { ViralAnalysis } from '@/types';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'shorts' | 'reels' | 'long';

// File type icons and labels
const getFileTypeInfo = (fileType: string) => {
  const types: Record<string, { icon: string; label: string }> = {
    'RAW_FOOTAGE': { icon: '🎬', label: 'Raw' },
    'A_ROLL': { icon: '🎬', label: 'A-Roll' },
    'B_ROLL': { icon: '🎞️', label: 'B-Roll' },
    'HOOK': { icon: '🎣', label: 'Hook' },
    'BODY': { icon: '📝', label: 'Body' },
    'CTA': { icon: '📢', label: 'CTA' },
    'AUDIO_CLIP': { icon: '🎵', label: 'Audio' },
    'OTHER': { icon: '📁', label: 'Other' },
    'raw-footage': { icon: '🎬', label: 'Raw' },
  };
  return types[fileType] || { icon: '📁', label: fileType };
};

export default function EditorAvailablePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ViralAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ViralAnalysis | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await editorService.getAvailableProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'shorts') return p.platform === 'youtube_shorts';
    if (filter === 'reels') return p.platform === 'instagram_reel';
    if (filter === 'long') return p.platform === 'youtube_long';
    return true;
  });

  const counts = {
    all: projects.length,
    shorts: projects.filter((p) => p.platform === 'youtube_shorts').length,
    reels: projects.filter((p) => p.platform === 'instagram_reel').length,
    long: projects.filter((p) => p.platform === 'youtube_long').length,
  };

  // Get raw files for footage preview grid
  const getRawFiles = (project: ViralAnalysis) => {
    const rawTypes = ['RAW_FOOTAGE', 'A_ROLL', 'B_ROLL', 'HOOK', 'BODY', 'CTA', 'AUDIO_CLIP', 'OTHER', 'raw-footage'];
    return project.production_files?.filter(
      (f: any) => rawTypes.includes(f.file_type) && !f.is_deleted
    ) || [];
  };

  const openViewer = (project: ViralAnalysis) => {
    setSelectedProject(project);
    setShowViewer(true);
  };

  const handlePick = async (projectId: string) => {
    try {
      setPicking(true);
      await editorService.pickProject({ analysisId: projectId });
      toast.success('Project picked successfully!');
      setShowViewer(false);
      navigate(`/editor/project/${projectId}`);
    } catch (error: any) {
      console.error('Failed to pick project:', error);
      toast.error(error.message || 'Failed to pick project');
      setPicking(false);
    }
  };

  const handleReject = (projectId: string) => {
    editorService.rejectProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setShowViewer(false);
    toast.success('Project hidden from list');
  };

  const getFileCount = (project: ViralAnalysis) => {
    return project.production_files?.filter((f: any) => !f.is_deleted).length || 0;
  };

  const getTotalSize = (project: ViralAnalysis) => {
    const totalBytes = project.production_files
      ?.filter((f: any) => !f.is_deleted)
      .reduce((sum: number, f: any) => sum + (f.file_size || 0), 0) || 0;

    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    }
    return `${(totalBytes / 1024 / 1024).toFixed(0)} MB`;
  };

  const getPlatformLabel = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'instagram_reel': return 'Reel';
      case 'youtube_shorts': return 'Shorts';
      case 'youtube_long': return 'YouTube';
      default: return 'Video';
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Available Projects" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Available Projects" subtitle={`${filteredProjects.length} ready for edit`} showBack />

      <div className="px-4 py-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4">
          {[
            { id: 'all' as FilterType, label: 'All' },
            { id: 'reels' as FilterType, label: 'Instagram' },
            { id: 'shorts' as FilterType, label: 'YT Shorts' },
            { id: 'long' as FilterType, label: 'YT Long' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === tab.id ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Project Cards */}
        <div className="space-y-3">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title || 'Untitled'}</h3>
                    <p className="text-sm text-gray-400 font-mono">{project.content_id || 'No ID'}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-full">
                    {getPlatformLabel(project.platform)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-xs px-2 py-1 bg-primary/10 rounded text-primary font-medium">
                    {project.profile?.name || 'No profile'}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    <Video className="w-3 h-3 inline mr-1" />
                    {getFileCount(project)} files
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {getTotalSize(project)}
                  </span>
                  {project.shoot_type && (
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {project.shoot_type}
                    </span>
                  )}
                  {project.deadline && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Videographer info */}
                {project.videographer && (
                  <p className="text-xs text-gray-500 mb-3">
                    Shot by: {project.videographer.full_name || project.videographer.email}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewer(project)}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 active:bg-gray-200"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => handlePick(project.id)}
                    disabled={picking}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-editor rounded-lg text-sm font-medium text-white active:opacity-90 disabled:opacity-50"
                  >
                    {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pick Project'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Projects Available</h3>
            <p className="text-gray-500 text-sm">Check back later for new projects to edit</p>
          </div>
        )}
      </div>

      {/* Project Viewer Modal */}
      {showViewer && selectedProject && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div>
              <h3 className="text-white font-semibold">{selectedProject.title || 'Untitled'}</h3>
              <p className="text-white/70 text-sm">{selectedProject.content_id || 'No ID'}</p>
            </div>
            <button
              onClick={() => setShowViewer(false)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-48 overflow-y-auto">
            <div className="bg-white/10 rounded-2xl p-6 w-full max-w-sm">
              {selectedProject.reference_url ? (
                <a
                  href={selectedProject.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center mb-6"
                >
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 mx-auto">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-white/70 text-sm mb-2">Reference Video</p>
                  <span className="inline-flex items-center gap-1 text-primary text-sm">
                    Open in app <ExternalLink className="w-3 h-3" />
                  </span>
                </a>
              ) : (
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 mx-auto">
                    <Play className="w-10 h-10 text-white/50 ml-1" />
                  </div>
                  <p className="text-white/50 text-sm">No reference video</p>
                </div>
              )}

              {/* Why Viral */}
              {selectedProject.why_viral && (
                <div className="mb-4">
                  <h4 className="text-white/60 text-xs uppercase tracking-wide mb-2">Why It's Viral</h4>
                  <p className="text-white text-sm">{selectedProject.why_viral}</p>
                </div>
              )}

              {/* How to Replicate */}
              {selectedProject.how_to_replicate && (
                <div className="mb-4">
                  <h4 className="text-white/60 text-xs uppercase tracking-wide mb-2">How to Replicate</h4>
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedProject.how_to_replicate}</p>
                </div>
              )}

              {/* Footage Preview Grid */}
              <div>
                <h4 className="text-white/60 text-xs uppercase tracking-wide mb-3">Uploaded Footage</h4>
                <div className="grid grid-cols-3 gap-2">
                  {getRawFiles(selectedProject).slice(0, 6).map((file: any) => {
                    const typeInfo = getFileTypeInfo(file.file_type);
                    return (
                      <div key={file.id} className="bg-white/10 rounded-lg p-2 text-center">
                        <div className="text-xl mb-1">{typeInfo.icon}</div>
                        <p className="text-white text-[10px] truncate">{file.file_name?.split('.')[0] || 'file'}</p>
                        <p className="text-white/50 text-[9px]">{typeInfo.label}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/50 text-xs text-center mt-2">
                  {getRawFiles(selectedProject).length} files • {getTotalSize(selectedProject)}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar">
              <span className="px-3 py-1.5 bg-white/20 rounded-full text-white text-sm whitespace-nowrap">
                {selectedProject.profile?.name || 'No profile'}
              </span>
              <span className="px-3 py-1.5 bg-white/20 rounded-full text-white text-sm whitespace-nowrap">
                {getFileCount(selectedProject)} files
              </span>
              {selectedProject.deadline && (
                <span className="px-3 py-1.5 bg-white/20 rounded-full text-white text-sm whitespace-nowrap">
                  Due: {new Date(selectedProject.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white"
                onClick={() => handleReject(selectedProject.id)}
              >
                Skip
              </Button>
              <Button
                className="flex-1 bg-editor"
                onClick={() => handlePick(selectedProject.id)}
                disabled={picking}
              >
                {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pick This Project'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
