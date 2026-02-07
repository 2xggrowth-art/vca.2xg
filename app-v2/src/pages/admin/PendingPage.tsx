import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, FileText } from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { ViralAnalysis } from '@/types';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'instagram' | 'youtube_shorts' | 'youtube_long';

export default function PendingPage() {
  const [scripts, setScripts] = useState<ViralAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPendingAnalyses();
      setScripts(data);
    } catch (error) {
      console.error('Failed to load pending scripts:', error);
      toast.error('Failed to load pending scripts');
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter((script) => {
    if (filter === 'all') return true;
    if (filter === 'instagram') return script.platform === 'instagram_reel';
    if (filter === 'youtube_shorts') return script.platform === 'youtube_shorts';
    if (filter === 'youtube_long') return script.platform === 'youtube_long';
    return true;
  });

  const counts = {
    all: scripts.length,
    instagram: scripts.filter((s) => s.platform === 'instagram_reel').length,
    youtube_shorts: scripts.filter((s) => s.platform === 'youtube_shorts').length,
    youtube_long: scripts.filter((s) => s.platform === 'youtube_long').length,
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'instagram_reel':
        return '📸';
      case 'youtube_shorts':
        return '🎬';
      case 'youtube_long':
        return '▶️';
      default:
        return '📹';
    }
  };

  const getPlatformLabel = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case 'instagram_reel':
        return 'Instagram';
      case 'youtube_shorts':
        return 'YT Shorts';
      case 'youtube_long':
        return 'YouTube';
      default:
        return 'Video';
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'youtube_shorts', label: 'YT Shorts' },
    { id: 'youtube_long', label: 'YouTube' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4"
      >
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === f.id ? 'bg-white/20' : 'bg-gray-200'
              }`}
            >
              {counts[f.id]}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredScripts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No pending scripts</h3>
          <p className="text-gray-500 text-sm">All scripts have been reviewed</p>
        </motion.div>
      )}

      {/* Script Cards */}
      <div className="space-y-3">
        {filteredScripts.map((script, index) => (
          <motion.div
            key={script.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{script.title || 'Untitled'}</h3>
                  <p className="text-gray-500 text-sm">
                    {script.full_name || script.email} • {formatTimeAgo(script.created_at)}
                  </p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {getPlatformIcon(script.platform)} {getPlatformLabel(script.platform)}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {script.shoot_type === 'outdoor' ? '🌳' : '🏠'} {script.shoot_type || 'Indoor'}
                </span>
                {script.content_rating && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    ⭐ {script.content_rating}
                  </span>
                )}
              </div>

              <Link
                to={`/admin/review/${script.id}`}
                className="block w-full py-2 bg-purple-500 text-white text-center rounded-lg text-sm font-medium active:bg-purple-600"
              >
                Review
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
