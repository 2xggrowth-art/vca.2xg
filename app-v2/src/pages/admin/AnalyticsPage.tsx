import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { adminService } from '@/services/adminService';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  FileText,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { ProductionStageLabels, ProductionStageColors } from '@/types';

interface AnalyticsData {
  scriptsThisWeek: number;
  scriptsLastWeek: number;
  approvalRate: number;
  avgTimeToApproval: number;
  topWriters: { name: string; count: number; rate?: number }[];
  stageDistribution: { stage: string; count: number }[];
}

interface PerformanceMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videosPosted: number;
  platformBreakdown: { platform: string; count: number; views: number }[];
  topVideos: { id: string; title: string; content_id: string; platform: string; posted_at: string; post_views: number; post_likes: number; post_comments: number; profile_name: string }[];
  postsPerDay: { date: string; count: number }[];
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const getPlatformLabel = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'instagram_reel': return 'Instagram Reels';
    case 'youtube_shorts': return 'YouTube Shorts';
    case 'youtube_long': return 'YouTube Long';
    default: return platform || 'Other';
  }
};

const getPlatformIcon = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'instagram_reel': return '📸';
    case 'youtube_shorts': return '🎬';
    case 'youtube_long': return '▶️';
    default: return '📹';
  }
};

const getPlatformColor = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'instagram_reel': return '#ec4899';
    case 'youtube_shorts': return '#ef4444';
    case 'youtube_long': return '#dc2626';
    default: return '#6b7280';
  }
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [analyticsData, performanceMetrics] = await Promise.all([
        adminService.getAnalyticsData(),
        adminService.getPerformanceMetrics(),
      ]);

      setAnalytics(analyticsData);
      setMetrics(performanceMetrics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getWeeklyChange = () => {
    if (!analytics) return 0;
    if (analytics.scriptsLastWeek === 0) return analytics.scriptsThisWeek > 0 ? 100 : 0;
    return Math.round(
      ((analytics.scriptsThisWeek - analytics.scriptsLastWeek) / analytics.scriptsLastWeek) * 100
    );
  };

  if (loading) {
    return (
      <>
        <Header title="Analytics" subtitle="Performance metrics" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </>
    );
  }

  const weeklyChange = getWeeklyChange();
  const maxBarCount = Math.max(...(metrics?.postsPerDay?.map(d => d.count) || [1]));
  const totalPlatformCount = metrics?.platformBreakdown?.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <>
      <Header
        title="Analytics"
        subtitle="Content performance overview"
        showBack
        rightAction={
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Main Stat - Total Views */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white"
        >
          <p className="text-purple-100 text-sm mb-1">Total Views</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold">{formatNumber(metrics?.totalViews || 0)}</p>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-purple-200" />
              <span className="text-sm text-purple-100">{formatNumber(metrics?.totalLikes || 0)} likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-purple-200" />
              <span className="text-sm text-purple-100">{formatNumber(metrics?.totalComments || 0)} comments</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Scripts This Week */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Scripts This Week</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {analytics?.scriptsThisWeek || 0}
              </span>
              {weeklyChange !== 0 && (
                <span
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    weeklyChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {weeklyChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(weeklyChange)}%
                </span>
              )}
            </div>
          </div>

          {/* Approval Rate */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Approval Rate</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-green-600">
                {analytics?.approvalRate || 0}%
              </span>
            </div>
          </div>

          {/* Videos Posted */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Videos Posted</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{metrics?.videosPosted || 0}</span>
          </div>

          {/* Avg Engagement */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">Avg. Engagement</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {metrics && metrics.totalViews > 0
                ? `${(((metrics.totalLikes + metrics.totalComments) / metrics.totalViews) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
        </motion.div>

        {/* Weekly Posts Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Posts This Week</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {(metrics?.postsPerDay || []).map((day, index) => {
              const heightPercent = maxBarCount > 0 ? (day.count / maxBarCount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{day.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md transition-all"
                    style={{ height: `${heightPercent}%`, minHeight: day.count > 0 ? '8px' : '2px' }}
                  />
                  <span className="text-[10px] text-gray-500">{day.date}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform Breakdown */}
        {metrics?.platformBreakdown && metrics.platformBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-4">By Platform</h3>
            <div className="space-y-4">
              {metrics.platformBreakdown
                .sort((a, b) => b.count - a.count)
                .map((platform) => {
                  const percentage = Math.round((platform.count / totalPlatformCount) * 100);
                  const color = getPlatformColor(platform.platform);
                  return (
                    <div key={platform.platform} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `${color}15` }}
                      >
                        {getPlatformIcon(platform.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{getPlatformLabel(platform.platform)}</p>
                        <p className="text-xs text-gray-500">{platform.count} videos &bull; {formatNumber(platform.views)} views</p>
                      </div>
                      <div className="w-16">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percentage}%`, background: color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* Top Performing Videos */}
        {metrics?.topVideos && metrics.topVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Top Performing Videos</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {metrics.topVideos.map((video) => (
                <div key={video.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{video.title}</h4>
                      <p className="text-xs text-gray-500">
                        {video.content_id} &bull; {video.profile_name} &bull;{' '}
                        {video.posted_at ? new Date(video.posted_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {getPlatformIcon(video.platform)} {getPlatformLabel(video.platform)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg py-2 px-3">
                      <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                        <Eye className="w-3 h-3" />
                        <span className="text-[10px]">Views</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{formatNumber(video.post_views)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2 px-3">
                      <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                        <Heart className="w-3 h-3" />
                        <span className="text-[10px]">Likes</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{formatNumber(video.post_likes)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2 px-3">
                      <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                        <MessageCircle className="w-3 h-3" />
                        <span className="text-[10px]">Comments</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{formatNumber(video.post_comments)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Script Writers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Top Script Writers</h3>
          {analytics?.topWriters && analytics.topWriters.length > 0 ? (
            <div className="space-y-1">
              {analytics.topWriters.slice(0, 5).map((writer, index) => (
                <div
                  key={writer.name}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                        ? 'bg-gray-200 text-gray-600'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {writer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{writer.name}</p>
                    <p className="text-xs text-gray-500">{writer.count} scripts</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No data available</p>
          )}
        </motion.div>

        {/* Pipeline Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline Distribution</h3>
          {analytics?.stageDistribution && analytics.stageDistribution.length > 0 ? (
            <div className="space-y-3">
              {analytics.stageDistribution
                .sort((a, b) => {
                  const order = ['PLANNING', 'SHOOTING', 'READY_FOR_EDIT', 'EDITING', 'EDIT_REVIEW', 'READY_TO_POST', 'POSTED'];
                  return order.indexOf(a.stage) - order.indexOf(b.stage);
                })
                .map((item) => {
                  const maxCount = Math.max(...analytics.stageDistribution.map(s => s.count));
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  const colorClass = ProductionStageColors[item.stage] || 'bg-gray-100 text-gray-800';
                  const bgClass = colorClass.split(' ')[0].replace('text-', 'bg-').replace('-800', '-500');

                  return (
                    <div key={item.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          {ProductionStageLabels[item.stage] || item.stage}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${bgClass || 'bg-primary'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No data available</p>
          )}
        </motion.div>

        {/* No metrics hint */}
        {metrics && metrics.totalViews === 0 && metrics.videosPosted > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800">
              No view/like data yet. Posting managers can update metrics from the Posted tab.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
