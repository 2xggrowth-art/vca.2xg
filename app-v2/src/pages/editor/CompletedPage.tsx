import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { CheckCircle, Video, Loader2, Eye, Star, Trophy, Award } from 'lucide-react';
import { editorService } from '@/services/editorService';
import type { ViralAnalysis } from '@/types';
import toast from 'react-hot-toast';

type TimeFilter = 'all' | 'week' | 'month';

// Helper to check if date is within time range
const isWithinTimeRange = (dateString: string, range: TimeFilter) => {
  if (range === 'all') return true;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / 86400000;

  if (range === 'week') return diffDays <= 7;
  if (range === 'month') return diffDays <= 30;
  return true;
};

// Simulate performance data (in a real app, this would come from the backend)
const getPerformanceData = (project: ViralAnalysis) => {
  // Generate consistent "random" data based on project ID
  const hash = project.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const views = Math.floor((hash % 200) + 20) * 1000; // 20K - 220K views
  const rating = 4 + (hash % 10) / 10; // 4.0 - 4.9 rating
  const isTopPerformer = views > 100000 && rating >= 4.5;
  const isGood = views > 50000 && rating >= 4.0;

  return {
    views: views >= 1000000 ? `${(views / 1000000).toFixed(1)}M` : `${Math.round(views / 1000)}K`,
    rating: rating.toFixed(1),
    badge: isTopPerformer ? 'top' : isGood ? 'good' : null,
  };
};

export default function EditorCompletedPage() {
  const [projects, setProjects] = useState<ViralAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await editorService.getMyProjects();
      // Filter to completed projects only
      const completed = data.filter((p) =>
        ['READY_TO_POST', 'POSTED'].includes(p.production_stage || '')
      );
      setProjects(completed);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getFileCount = (project: ViralAnalysis) => {
    return project.production_files?.filter((f: any) => !f.is_deleted).length || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'READY_TO_POST': return { label: 'Ready to Post', color: 'bg-blue-100 text-blue-700' };
      case 'POSTED': return { label: 'Posted', color: 'bg-emerald-100 text-emerald-700' };
      default: return { label: 'Completed', color: 'bg-green-100 text-green-700' };
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Completed Edits" subtitle="Your editing history" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </>
    );
  }

  // Filter projects by time
  const filteredProjects = projects.filter((p) =>
    isWithinTimeRange(p.updated_at || p.created_at, timeFilter)
  );

  // Calculate stats
  const totalCompleted = projects.length;
  const weekCount = projects.filter((p) => isWithinTimeRange(p.updated_at || p.created_at, 'week')).length;
  const monthCount = projects.filter((p) => isWithinTimeRange(p.updated_at || p.created_at, 'month')).length;

  // Calculate simulated total views and avg rating
  const avgRating = projects.length > 0
    ? (projects.reduce((sum, p) => sum + parseFloat(getPerformanceData(p).rating), 0) / projects.length).toFixed(1)
    : '0.0';

  return (
    <>
      <Header title="Completed Edits" subtitle="Your editing history" showBack />

      <div className="px-4 py-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalCompleted}</p>
            <p className="text-xs text-gray-500 uppercase">Total Edits</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">1.2M</p>
            <p className="text-xs text-gray-500 uppercase">Total Views</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-editor">{avgRating}</p>
            <p className="text-xs text-gray-500 uppercase">Avg Rating</p>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4">
          {[
            { id: 'all' as TimeFilter, label: 'All', count: totalCompleted },
            { id: 'week' as TimeFilter, label: 'This Week', count: weekCount },
            { id: 'month' as TimeFilter, label: 'This Month', count: monthCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                timeFilter === tab.id
                  ? 'bg-editor text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                timeFilter === tab.id ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Project List */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-3">
            {filteredProjects.map((project, index) => {
              const stageInfo = getStageLabel(project.production_stage);
              const perfData = getPerformanceData(project);
              return (
                <Link
                  key={project.id}
                  to={`/editor/project/${project.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 card-press animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title || 'Untitled'}</h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {project.content_id || 'No ID'} • Completed {formatDate(project.updated_at || project.created_at)}
                      </p>
                    </div>
                    {perfData.badge === 'top' && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">
                        <Trophy className="w-3 h-3" />
                        Top Performer
                      </span>
                    )}
                    {perfData.badge === 'good' && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-full">
                        <Award className="w-3 h-3" />
                        Good
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                      {project.platform === 'instagram_reel' ? '📸 Instagram' : project.platform === 'youtube_shorts' ? '🎬 YouTube Shorts' : '▶️ YouTube'}
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                      <Eye className="w-3 h-3" />
                      {perfData.views} views
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-50 rounded text-yellow-700">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {perfData.rating}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {timeFilter === 'all' ? 'No Completed Edits' : `No edits ${timeFilter === 'week' ? 'this week' : 'this month'}`}
            </h3>
            <p className="text-gray-500 text-sm mb-4">Your editing history will appear here</p>
            <Link
              to="/editor/available"
              className="inline-flex items-center gap-2 px-4 py-2 bg-editor text-white rounded-lg text-sm font-medium"
            >
              Browse Available Projects
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
