import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '@/services/assignmentService';
import { getDriveDownloadUrl } from '@/services/googleDriveOAuthService';
import { productionFilesService } from '@/services/productionFilesService';
import { postingManagerService } from '@/services/postingManagerService';
import {
  MegaphoneIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  EyeIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  FilmIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  LinkIcon,
  HashtagIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { ViralAnalysis, ProductionFile, SetPostingDetailsData, MarkAsPostedData } from '@/types';
import { ProductionStageV2, PostingPlatform, PostingPlatformLabels, UserRole } from '@/types';
import BottomNavigation from '@/components/BottomNavigation';

// Tab types
type TabType = 'home' | 'topost' | 'calendar';

// Calendar helper functions
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const formatMonthYear = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function PostingManagerDashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'home';

  // Modal states
  const [selectedAnalysis, setSelectedAnalysis] = useState<ViralAnalysis | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);

  // Posting form state
  const [postingPlatform, setPostingPlatform] = useState<PostingPlatform | ''>('');
  const [postingCaption, setPostingCaption] = useState('');
  const [postingHeading, setPostingHeading] = useState('');
  const [postingHashtags, setPostingHashtags] = useState('');
  const [scheduledPostTime, setScheduledPostTime] = useState('');
  const [postedUrl, setPostedUrl] = useState('');
  const [keepInQueueForMorePlatforms, setKeepInQueueForMorePlatforms] = useState(false);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch posting stats for home tab
  const { data: postingStats } = useQuery({
    queryKey: ['posting-manager', 'stats'],
    queryFn: () => postingManagerService.getPostingStats(),
  });

  // Fetch available projects (READY_TO_POST queue)
  const { data: availableProjects = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['posting-manager', 'available'],
    queryFn: () => postingManagerService.getReadyToPostProjects(),
  });

  // Fetch my assigned projects
  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['posting-manager', 'assignments'],
    queryFn: () => assignmentService.getMyAssignedAnalyses(),
  });

  const myAssignedProjects = assignmentsData?.data || [];

  // Fetch scheduled posts for calendar
  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ['posting-manager', 'scheduled'],
    queryFn: () => postingManagerService.getScheduledPosts(),
  });

  // Fetch files for selected analysis
  const { data: productionFiles = [] } = useQuery({
    queryKey: ['production-files', selectedAnalysis?.id],
    queryFn: () => productionFilesService.getFiles(selectedAnalysis!.id),
    enabled: !!selectedAnalysis?.id,
  });

  // Filter to show edited and final videos
  const videoFiles = productionFiles.filter((f: ProductionFile) => {
    const fileType = f.file_type as string;
    return fileType === 'edited-video' || fileType === 'final-video' ||
      fileType === 'EDITED_VIDEO' || fileType === 'FINAL_VIDEO';
  });

  // Set posting details mutation
  const setPostingDetailsMutation = useMutation({
    mutationFn: (data: SetPostingDetailsData) => postingManagerService.setPostingDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posting-manager'] });
      toast.success('Posting details saved successfully');
      closePostingModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save posting details');
    },
  });

  // Mark as posted mutation
  const markAsPostedMutation = useMutation({
    mutationFn: (data: MarkAsPostedData) => postingManagerService.markAsPosted(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posting-manager'] });
      if (variables.keepInQueue) {
        toast.success('Post recorded! Set up posting info for the next platform.');
        // Reset for next platform
        setPostedUrl('');
        setKeepInQueueForMorePlatforms(false);
        // Refresh the selected analysis to show cleared posting details
        if (selectedAnalysis) {
          postingManagerService.getProjectById(selectedAnalysis.id).then(updated => {
            setSelectedAnalysis(updated);
          });
        }
      } else {
        toast.success('Content marked as posted!');
        closeDetailModal();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark as posted');
    },
  });

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Modal handlers
  const openDetailModal = (analysis: ViralAnalysis) => {
    setSelectedAnalysis(analysis);
    setPostedUrl(analysis.posted_url || '');
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAnalysis(null);
    setPostedUrl('');
  };

  const openPostingModal = (analysis: ViralAnalysis) => {
    setSelectedAnalysis(analysis);
    setPostingPlatform(analysis.posting_platform || '');
    setPostingCaption(analysis.posting_caption || '');
    setPostingHeading(analysis.posting_heading || '');
    setPostingHashtags(analysis.posting_hashtags?.join(', ') || '');
    setScheduledPostTime(analysis.scheduled_post_time?.slice(0, 16) || '');
    setIsPostingModalOpen(true);
  };

  const closePostingModal = () => {
    setIsPostingModalOpen(false);
    setSelectedAnalysis(null);
    resetPostingForm();
  };

  const resetPostingForm = () => {
    setPostingPlatform('');
    setPostingCaption('');
    setPostingHeading('');
    setPostingHashtags('');
    setScheduledPostTime('');
  };

  // Handle save posting details
  const handleSavePostingDetails = () => {
    if (!selectedAnalysis || !postingPlatform) return;

    const hashtagsArray = postingHashtags
      .split(',')
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(tag => tag.length > 0);

    setPostingDetailsMutation.mutate({
      analysisId: selectedAnalysis.id,
      postingPlatform: postingPlatform as PostingPlatform,
      postingCaption,
      postingHeading: postingHeading || undefined,
      postingHashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
      scheduledPostTime: scheduledPostTime ? new Date(scheduledPostTime).toISOString() : undefined,
    });
  };

  // Handle mark as posted
  const handleMarkAsPosted = () => {
    if (!selectedAnalysis || !postedUrl) {
      toast.error('Please enter the live post URL');
      return;
    }

    markAsPostedMutation.mutate({
      analysisId: selectedAnalysis.id,
      postedUrl,
      keepInQueue: keepInQueueForMorePlatforms,
    });
  };

  // Check if platform requires heading
  const requiresHeading = postingPlatform && ['YOUTUBE_SHORTS', 'YOUTUBE_VIDEO', 'TIKTOK'].includes(postingPlatform);

  // Calendar navigation
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: { date: Date | null; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    while (days.length < 42) {
      days.push({ date: null, isCurrentMonth: false });
    }

    return days;
  }, [calendarDate]);

  // Group scheduled posts by date
  const calendarEvents = useMemo(() => {
    const events: Record<string, ViralAnalysis[]> = {};
    scheduledPosts.forEach(post => {
      const dateStr = post.scheduled_post_time?.split('T')[0];
      if (dateStr) {
        if (!events[dateStr]) events[dateStr] = [];
        events[dateStr].push(post);
      }
    });
    return events;
  }, [scheduledPosts]);

  // Filtered available projects based on search
  const filteredAvailable = useMemo(() => {
    if (!searchQuery) return availableProjects;
    const query = searchQuery.toLowerCase();
    return availableProjects.filter(p =>
      p.content_id?.toLowerCase().includes(query) ||
      p.hook?.toLowerCase().includes(query) ||
      p.title?.toLowerCase().includes(query)
    );
  }, [availableProjects, searchQuery]);

  // Priority color helper
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <MegaphoneIcon className="w-6 h-6 mr-2 text-pink-600" />
            Posting Manager
          </h1>
        </div>

        {/* Tab Navigation (Desktop) */}
        <div className="hidden md:flex px-4 border-t border-gray-100">
          <button
            onClick={() => handleTabChange('home')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'home'
                ? 'text-pink-600 border-pink-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('topost')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              currentTab === 'topost'
                ? 'text-pink-600 border-pink-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            To Post
            {availableProjects.length > 0 && (
              <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {availableProjects.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('calendar')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'calendar'
                ? 'text-pink-600 border-pink-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* HOME TAB - Dashboard Stats */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Ready to Post</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{postingStats?.readyToPost || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Scheduled Today</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{postingStats?.scheduledToday || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Posted This Week</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{postingStats?.postedThisWeek || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Posted This Month</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{postingStats?.postedThisMonth || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <MegaphoneIcon className="w-5 h-5 text-pink-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* My Assigned Projects */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">My Assigned Projects</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {loadingAssignments ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                  </div>
                ) : myAssignedProjects.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MegaphoneIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p>No assigned projects yet</p>
                    <p className="text-sm mt-1">Pick projects from the "To Post" tab</p>
                  </div>
                ) : (
                  myAssignedProjects.slice(0, 5).map(project => (
                    <div
                      key={project.id}
                      onClick={() => openDetailModal(project)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                              {project.content_id || project.id.slice(0, 8)}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(project.priority)}`}>
                              {project.priority || 'NORMAL'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {project.hook || project.title || 'Untitled'}
                          </p>
                          {project.posting_platform && (
                            <p className="text-xs text-gray-500 mt-1">
                              {PostingPlatformLabels[project.posting_platform as PostingPlatform]}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.production_stage === ProductionStageV2.POSTED
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {project.production_stage === ProductionStageV2.POSTED ? 'Posted' : 'Ready'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TO POST TAB - Available Projects Queue */}
        {currentTab === 'topost' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, title, or hook..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            {/* Projects List */}
            {loadingAvailable ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <RocketLaunchIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No projects ready to post</p>
                <p className="text-sm text-gray-400 mt-1">Projects will appear here after editing is complete</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAvailable.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                            {project.content_id || project.id.slice(0, 8)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${getPriorityColor(project.priority)}`}>
                            {project.priority || 'NORMAL'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {project.hook || project.title || 'Untitled'}
                        </p>
                      </div>
                    </div>

                    {/* Project Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {project.editor && (
                        <span>Editor: {project.editor.full_name || project.editor.email}</span>
                      )}
                      {project.profile?.name && (
                        <span>Profile: {project.profile.name}</span>
                      )}
                    </div>

                    {/* Video Files Preview */}
                    {project.production_files && project.production_files.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <FilmIcon className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700">
                          {project.production_files.filter(f =>
                            ['EDITED_VIDEO', 'FINAL_VIDEO', 'edited-video', 'final-video'].includes(f.file_type)
                          ).length} video(s) ready
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDetailModal(project)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => openPostingModal(project)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <PlayCircleIcon className="w-4 h-4" />
                        Set Posting Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB - Schedule View */}
        {currentTab === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatMonthYear(calendarDate)}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
                  >
                    Today
                  </button>
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Mobile: List View */}
              <div className="md:hidden">
                <div className="space-y-2">
                  {Object.entries(calendarEvents)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dateStr, posts]) => (
                      <div key={dateStr} className="border-l-2 border-pink-500 pl-3 py-2">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          {new Date(dateStr).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {posts.map(post => (
                          <div
                            key={post.id}
                            onClick={() => openDetailModal(post)}
                            className="bg-gray-50 rounded-lg p-2 mb-2 cursor-pointer hover:bg-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-pink-600">
                                {post.content_id}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                post.production_stage === ProductionStageV2.POSTED
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {post.production_stage === ProductionStageV2.POSTED ? 'Posted' : 'Scheduled'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 line-clamp-1 mt-1">
                              {post.hook || post.title || 'Untitled'}
                            </p>
                            {post.scheduled_post_time && (
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(post.scheduled_post_time).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  {Object.keys(calendarEvents).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarDaysIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p>No scheduled posts</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: Grid View */}
              <div className="hidden md:block">
                <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 px-2 py-3 text-center text-xs font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const dateStr = day.date?.toISOString().split('T')[0];
                    const dayEvents = dateStr ? calendarEvents[dateStr] || [] : [];
                    const isToday = day.date?.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] bg-white p-2 ${
                          !day.isCurrentMonth ? 'bg-gray-50' : ''
                        }`}
                      >
                        {day.date && (
                          <>
                            <div className={`text-sm font-medium mb-1 ${
                              isToday
                                ? 'w-7 h-7 bg-pink-600 text-white rounded-full flex items-center justify-center'
                                : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {day.date.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 2).map(event => (
                                <div
                                  key={event.id}
                                  onClick={() => openDetailModal(event)}
                                  className={`text-xs p-1 rounded truncate cursor-pointer ${
                                    event.production_stage === ProductionStageV2.POSTED
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                  title={event.hook || event.title}
                                >
                                  {event.content_id || event.hook?.slice(0, 15)}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{dayEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedAnalysis && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end md:items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeDetailModal} />
            <div className="relative bg-white w-full md:max-w-2xl md:rounded-xl md:mx-4 rounded-t-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Project Details</h2>
                <button onClick={closeDetailModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Project Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-pink-600 bg-pink-50 px-2 py-1 rounded">
                      {selectedAnalysis.content_id || selectedAnalysis.id.slice(0, 8)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(selectedAnalysis.priority)}`}>
                      {selectedAnalysis.priority || 'NORMAL'}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {selectedAnalysis.hook || selectedAnalysis.title || 'Untitled'}
                  </h3>
                  {selectedAnalysis.profile?.name && (
                    <p className="text-sm text-gray-500 mt-1">Profile: {selectedAnalysis.profile.name}</p>
                  )}
                </div>

                {/* Reference URL */}
                {selectedAnalysis.reference_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Video</label>
                    <a
                      href={selectedAnalysis.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-pink-600 hover:text-pink-700 underline break-all"
                    >
                      {selectedAnalysis.reference_url}
                    </a>
                  </div>
                )}

                {/* Admin Remarks */}
                {selectedAnalysis.admin_remarks && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-800 uppercase mb-1">Admin Remarks</p>
                    <p className="text-sm text-gray-800">{selectedAnalysis.admin_remarks}</p>
                  </div>
                )}

                {/* Video Files */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Videos for Posting</label>
                  {videoFiles.length > 0 ? (
                    <div className="space-y-2">
                      {videoFiles.map((file: ProductionFile) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <DocumentIcon className="w-5 h-5 text-pink-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                              <p className="text-xs text-gray-500">{file.file_type}</p>
                            </div>
                          </div>
                          <a
                            href={getDriveDownloadUrl(file.file_id || file.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <FilmIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No videos uploaded yet</p>
                    </div>
                  )}
                </div>

                {/* Previously Posted URLs (multi-platform tracking) */}
                {selectedAnalysis.posted_urls && selectedAnalysis.posted_urls.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-800 uppercase mb-2">
                      Already Posted ({selectedAnalysis.posted_urls.length} platform{selectedAnalysis.posted_urls.length > 1 ? 's' : ''})
                    </p>
                    <div className="space-y-2">
                      {selectedAnalysis.posted_urls.map((post, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700 underline truncate max-w-[80%]"
                          >
                            {post.url}
                          </a>
                          <span className="text-xs text-gray-500">
                            {new Date(post.posted_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posting Info (if set) */}
                {selectedAnalysis.posting_platform && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-800 uppercase mb-2">Posting Details</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Platform:</span> {PostingPlatformLabels[selectedAnalysis.posting_platform as PostingPlatform]}</p>
                      {selectedAnalysis.posting_heading && (
                        <p><span className="text-gray-600">Heading:</span> {selectedAnalysis.posting_heading}</p>
                      )}
                      {selectedAnalysis.posting_caption && (
                        <p><span className="text-gray-600">Caption:</span> {selectedAnalysis.posting_caption}</p>
                      )}
                      {selectedAnalysis.posting_hashtags && selectedAnalysis.posting_hashtags.length > 0 && (
                        <p><span className="text-gray-600">Hashtags:</span> {selectedAnalysis.posting_hashtags.map(h => `#${h}`).join(' ')}</p>
                      )}
                      {selectedAnalysis.scheduled_post_time && (
                        <p><span className="text-gray-600">Scheduled:</span> {new Date(selectedAnalysis.scheduled_post_time).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mark as Posted Section */}
                {selectedAnalysis.production_stage === ProductionStageV2.READY_TO_POST && (
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <LinkIcon className="w-4 h-4 inline mr-1" />
                        Live Post URL ({PostingPlatformLabels[selectedAnalysis.posting_platform as PostingPlatform] || 'Platform'})
                      </label>
                      <input
                        type="url"
                        value={postedUrl}
                        onChange={(e) => setPostedUrl(e.target.value)}
                        placeholder="https://instagram.com/p/..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    {/* Post to More Platforms Option */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepInQueueForMorePlatforms}
                          onChange={(e) => setKeepInQueueForMorePlatforms(e.target.checked)}
                          className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Post to more platforms</span>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Keep this video in queue to set posting info for another platform (e.g., YouTube, TikTok)
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Posted URL (if already posted) */}
                {selectedAnalysis.production_stage === ProductionStageV2.POSTED && selectedAnalysis.posted_url && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Live Post</label>
                    <a
                      href={selectedAnalysis.posted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 underline break-all"
                    >
                      {selectedAnalysis.posted_url}
                    </a>
                    {selectedAnalysis.posted_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Posted on {new Date(selectedAnalysis.posted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
                <button
                  onClick={closeDetailModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedAnalysis.production_stage === ProductionStageV2.READY_TO_POST && (
                  <>
                    <button
                      onClick={() => {
                        closeDetailModal();
                        openPostingModal(selectedAnalysis);
                      }}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Edit Posting Info
                    </button>
                    <button
                      onClick={handleMarkAsPosted}
                      disabled={!postedUrl || markAsPostedMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {markAsPostedMutation.isPending ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                      Mark Posted
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posting Details Modal */}
      {isPostingModalOpen && selectedAnalysis && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end md:items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closePostingModal} />
            <div className="relative bg-white w-full md:max-w-lg md:rounded-xl md:mx-4 rounded-t-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Set Posting Details</h2>
                <button onClick={closePostingModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={postingPlatform}
                    onChange={(e) => setPostingPlatform(e.target.value as PostingPlatform)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">Select platform...</option>
                    {Object.entries(PostingPlatformLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Heading (for YouTube/TikTok) */}
                {requiresHeading && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ChatBubbleLeftIcon className="w-4 h-4 inline mr-1" />
                      Title/Heading <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postingHeading}
                      onChange={(e) => setPostingHeading(e.target.value)}
                      placeholder="Enter video title..."
                      maxLength={100}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{postingHeading.length}/100 characters</p>
                  </div>
                )}

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ChatBubbleLeftIcon className="w-4 h-4 inline mr-1" />
                    Caption <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={postingCaption}
                    onChange={(e) => setPostingCaption(e.target.value)}
                    placeholder="Write your caption..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <HashtagIcon className="w-4 h-4 inline mr-1" />
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={postingHashtags}
                    onChange={(e) => setPostingHashtags(e.target.value)}
                    placeholder="viral, trending, fitness (comma-separated)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate hashtags with commas</p>
                </div>

                {/* Scheduled Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="w-4 h-4 inline mr-1" />
                    Schedule Post (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledPostTime}
                    onChange={(e) => setScheduledPostTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
                <button
                  onClick={closePostingModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePostingDetails}
                  disabled={!postingPlatform || !postingCaption || (requiresHeading && !postingHeading) || setPostingDetailsMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {setPostingDetailsMutation.isPending ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4" />
                  )}
                  Save Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation
        role={UserRole.POSTING_MANAGER}
        badges={{ available: availableProjects.length }}
      />
    </div>
  );
}
