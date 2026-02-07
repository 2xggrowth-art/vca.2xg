import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, FileText } from 'lucide-react';
import { videographerService } from '@/services/videographerService';
import type { ViralAnalysis } from '@/types';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function MyScriptsPage() {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<ViralAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const data = await videographerService.getMyScripts();
      setScripts(data);
    } catch (error) {
      console.error('Failed to load scripts:', error);
      toast.error('Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  // Filter scripts
  const filteredScripts = scripts.filter((s) => {
    if (filter === 'all') return true;
    return s.status.toLowerCase() === filter;
  });

  // Get counts
  const counts = {
    all: scripts.length,
    pending: scripts.filter((s) => s.status === 'PENDING').length,
    approved: scripts.filter((s) => s.status === 'APPROVED').length,
    rejected: scripts.filter((s) => s.status === 'REJECTED').length,
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[11px] font-semibold rounded-full uppercase">
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full uppercase">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-[11px] font-semibold rounded-full uppercase">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // Get shoot type badge
  const getShootTypeBadge = (shootType?: string) => {
    const type = (shootType || 'indoor').toLowerCase();
    if (type.includes('outdoor')) return { emoji: '🌳', label: 'Outdoor' };
    if (type.includes('both')) return { emoji: '🏠🌳', label: 'Both' };
    return { emoji: '🏠', label: 'Indoor' };
  };

  // Get platform badge
  const getPlatformBadge = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('youtube') && p.includes('short')) return { emoji: '🎬', label: 'YouTube Shorts' };
    if (p.includes('youtube')) return { emoji: '▶️', label: 'YouTube' };
    if (p.includes('tiktok')) return { emoji: '🎵', label: 'TikTok' };
    return { emoji: '📸', label: 'Instagram' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Scripts</h1>
          <p className="text-sm text-gray-500">{scripts.length} scripts submitted</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === status ? 'bg-white/20' : 'bg-gray-200'
              }`}
            >
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Scripts List */}
      {filteredScripts.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">No Scripts Found</h3>
          <p className="text-gray-500 text-sm mb-4">
            {filter === 'all'
              ? "You haven't submitted any scripts yet"
              : `No ${filter} scripts`}
          </p>
          <Link
            to="/videographer/new-script"
            className="inline-block px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg"
          >
            Submit a Script
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScripts.map((script) => {
            const platform = getPlatformBadge(script.platform);
            const shootType = getShootTypeBadge(script.shoot_type);

            return (
              <div
                key={script.id}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {script.title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Submitted {formatTimeAgo(script.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(script.status)}
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {platform.emoji} {platform.label}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {shootType.emoji} {shootType.label}
                  </span>
                  {script.profile?.name && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {script.profile.name}
                    </span>
                  )}
                </div>

                {/* Feedback for rejected */}
                {script.status === 'REJECTED' && script.feedback && (
                  <div className="bg-red-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-red-700 mb-1">Feedback:</p>
                    <p className="text-sm text-red-600">{script.feedback}</p>
                  </div>
                )}

                {/* Content ID for approved */}
                {script.status === 'APPROVED' && script.content_id && (
                  <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-green-700 mb-1">Content ID:</p>
                    <p className="text-sm text-green-600 font-mono">{script.content_id}</p>
                  </div>
                )}

                {/* Hook preview */}
                {script.hook && (
                  <p className="text-sm text-gray-600 line-clamp-2">{script.hook}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
