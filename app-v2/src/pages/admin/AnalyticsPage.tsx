import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { adminService } from '@/services/adminService';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  FileText,
  Users,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
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

interface DashboardStats {
  totalAnalyses: number;
  totalUsers: number;
  pendingAnalyses: number;
  approvedAnalyses: number;
  rejectedAnalyses: number;
}

// Mock data for features not yet implemented in API
const MOCK_WEEKLY_DATA = [
  { day: 'Mon', count: 8 },
  { day: 'Tue', count: 12 },
  { day: 'Wed', count: 6 },
  { day: 'Thu', count: 15 },
  { day: 'Fri', count: 10 },
  { day: 'Sat', count: 4 },
  { day: 'Sun', count: 3 },
];

const MOCK_PLATFORM_DATA = [
  { name: 'Instagram Reels', icon: '📸', videos: 52, views: '680K', percentage: 58, color: '#ec4899' },
  { name: 'YouTube Shorts', icon: '🎬', videos: 28, views: '420K', percentage: 35, color: '#ef4444' },
  { name: 'YouTube Long', icon: '▶️', videos: 9, views: '100K', percentage: 10, color: '#dc2626' },
];

const MOCK_TOP_VIDEOS = [
  { title: 'Dance Challenge', postedAgo: '5d ago', creator: 'Rahul Sharma', platform: 'Instagram', views: '125K', likes: '8.2K', comments: '342' },
  { title: 'Cooking Hack', postedAgo: '1w ago', creator: 'Priya Patel', platform: 'YouTube Shorts', views: '98K', likes: '5.1K', comments: '189' },
];

type TimePeriod = 'today' | 'week' | 'month' | 'all';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [analyticsData, dashboardStats] = await Promise.all([
        adminService.getAnalyticsData(),
        adminService.getDashboardStats(),
      ]);

      setAnalytics(analyticsData);
      setStats(dashboardStats);
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

  const getMaxBarHeight = () => {
    return Math.max(...MOCK_WEEKLY_DATA.map(d => d.count));
  };

  if (loading) {
    return (
      <>
        <Header title="Analytics" subtitle="Performance metrics" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </>
    );
  }

  const weeklyChange = getWeeklyChange();
  const maxBarHeight = getMaxBarHeight();

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
        {/* Time Period Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setTimePeriod(period.id as TimePeriod)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                timePeriod === period.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {period.label}
            </button>
          ))}
        </motion.div>

        {/* Main Stat - Total Views */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white"
        >
          <p className="text-purple-100 text-sm mb-1">Total Views</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold">1.2M</p>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium mb-1">
              <TrendingUp className="w-3 h-3" />
              23%
            </span>
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Scripts This Week */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Scripts Submitted</span>
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
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <TrendingUp className="w-3 h-3" />
                5%
              </span>
            </div>
          </div>

          {/* Videos Posted */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Videos Posted</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">89</span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <TrendingUp className="w-3 h-3" />
                18%
              </span>
            </div>
          </div>

          {/* Avg Engagement */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">Avg. Engagement</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">4.2%</span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <TrendingDown className="w-3 h-3" />
                0.3%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Weekly Posts Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Posts This Week</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {MOCK_WEEKLY_DATA.map((day, index) => {
              const heightPercent = (day.count / maxBarHeight) * 100;
              return (
                <motion.div
                  key={day.day}
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs font-semibold text-gray-700">{day.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md transition-all"
                    style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                  />
                  <span className="text-[10px] text-gray-500">{day.day}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">By Platform</h3>
          <div className="space-y-4">
            {MOCK_PLATFORM_DATA.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${platform.color}15` }}
                >
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{platform.name}</p>
                  <p className="text-xs text-gray-500">{platform.videos} videos • {platform.views} views</p>
                </div>
                <div className="w-16">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${platform.percentage}%`, background: platform.color }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
                <motion.div
                  key={writer.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                >
                  {/* Rank Badge */}
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

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {writer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{writer.name}</p>
                    <p className="text-xs text-gray-500">
                      {writer.count} approved • {writer.rate || 85}% rate
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-base font-bold text-gray-800">
                    ⭐ {(9.5 - index * 0.5).toFixed(1)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No data available</p>
          )}
        </motion.div>

        {/* Top Performing Videos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              🔥 Top Performing Videos
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {MOCK_TOP_VIDEOS.map((video, index) => (
              <motion.div
                key={video.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{video.title}</h4>
                    <p className="text-xs text-gray-500">Posted {video.postedAgo} • by {video.creator}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {video.platform === 'Instagram' ? '📸' : '🎬'} {video.platform}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg py-2 px-3">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px]">Views</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{video.views}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2 px-3">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                      <Heart className="w-3 h-3" />
                      <span className="text-[10px]">Likes</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{video.likes}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2 px-3">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                      <MessageCircle className="w-3 h-3" />
                      <span className="text-[10px]">Comments</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{video.comments}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pipeline Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline Distribution</h3>

          {analytics?.stageDistribution && analytics.stageDistribution.length > 0 ? (
            <div className="space-y-3">
              {analytics.stageDistribution
                .sort((a, b) => {
                  const order = ['PLANNING', 'SHOOTING', 'READY_FOR_EDIT', 'EDITING', 'READY_TO_POST', 'POSTED'];
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

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Overall Summary</h3>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalAnalyses || 0}</div>
              <div className="text-xs text-gray-500">Total Scripts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats?.pendingAnalyses || 0}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats?.rejectedAnalyses || 0}</div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
