/**
 * Admin Sidebar - Notion-Inspired Mobile-Responsive Navigation
 */

import { useState } from 'react';
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  FolderIcon,
  Bars3Icon,
  XMarkIcon,
  BoltIcon,
  VideoCameraIcon,
  FilmIcon,
  MegaphoneIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import AdminQuickScriptModal from './AdminQuickScriptModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { adminService } from '@/services/adminService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AdminSidebarProps {
  selectedPage: 'team' | 'approval' | 'production';
  onPageChange: (page: 'team' | 'approval' | 'production') => void;
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export default function AdminSidebar({
  selectedPage,
  onPageChange,
  isOpen = false,
  onClose = () => {},
  onToggle = () => {}
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const [showQuickScriptModal, setShowQuickScriptModal] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    } else {
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };
  // Get pending approvals count
  const { data: pendingCount } = useQuery({
    queryKey: ['admin', 'pending-count'],
    queryFn: async () => {
      // Count pending scripts
      const { count: scriptsCount } = await supabase
        .from('viral_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // Count shoot reviews
      const { count: shootsCount } = await supabase
        .from('viral_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('production_stage', 'SHOOT_REVIEW');

      // Count edit reviews
      const { count: editsCount } = await supabase
        .from('viral_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('production_stage', 'EDIT_REVIEW');

      return (scriptsCount || 0) + (shootsCount || 0) + (editsCount || 0);
    },
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Get team members count
  const { data: teamCount } = useQuery({
    queryKey: ['admin', 'team-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['SCRIPT_WRITER', 'VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER']);

      return count || 0;
    },
  });

  // Get active projects count
  const { data: activeProjectsCount } = useQuery({
    queryKey: ['admin', 'active-projects-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('viral_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'APPROVED')
        .neq('production_stage', 'POSTED');

      return count || 0;
    },
  });

  // Get queue stats for pipeline overview
  const { data: queueStats } = useQuery({
    queryKey: ['admin', 'queue-stats'],
    queryFn: () => adminService.getQueueStats(),
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  return (
    <>
      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-30 flex items-center justify-between">
        <button
          onClick={onToggle}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">📊 Admin</h1>
        <div className="w-[48px]">{/* Spacer for center alignment */}</div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:shadow-none md:border-r md:border-gray-200
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">📊 Admin Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">📊 Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Quick Add Script Button */}
        <button
          onClick={() => setShowQuickScriptModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-lg bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium hover:from-primary-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg mb-4"
        >
          <BoltIcon className="w-5 h-5" />
          <span>Quick Add Script</span>
        </button>

        {/* Team Members */}
        <button
          onClick={() => onPageChange('team')}
          className={`w-full flex items-center justify-between px-4 py-3 min-h-[48px] rounded-lg transition-colors text-left ${
            selectedPage === 'team'
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="w-5 h-5" />
            <span className="font-medium">Team Members</span>
          </div>
          {teamCount !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              selectedPage === 'team'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {teamCount}
            </span>
          )}
        </button>

        {/* Review */}
        <button
          onClick={() => onPageChange('approval')}
          className={`w-full flex items-center justify-between px-4 py-3 min-h-[48px] rounded-lg transition-colors relative text-left ${
            selectedPage === 'approval'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Review</span>
          </div>
          {pendingCount !== undefined && pendingCount > 0 && (
            <span className="relative flex items-center">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedPage === 'approval'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-red-500 text-white'
              }`}>
                {pendingCount}
              </span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </span>
          )}
        </button>

        {/* Production Status */}
        <button
          onClick={() => onPageChange('production')}
          className={`w-full flex items-center justify-between px-4 py-3 min-h-[48px] rounded-lg transition-colors text-left ${
            selectedPage === 'production'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-5 h-5" />
            <span className="font-medium">Production Status</span>
          </div>
          {activeProjectsCount !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              selectedPage === 'production'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {activeProjectsCount}
            </span>
          )}
        </button>

        {/* Pipeline Overview */}
        {queueStats && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Pipeline Overview
            </h3>
            <div className="space-y-2">
              {/* Planning Queue */}
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <VideoCameraIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Planning</span>
                </div>
                <span className="text-xs font-bold text-blue-700">{queueStats.planning}</span>
              </div>

              {/* Shooting */}
              <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <VideoCameraIcon className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-800">Shooting</span>
                </div>
                <span className="text-xs font-bold text-yellow-700">{queueStats.shooting}</span>
              </div>

              {/* Ready for Edit */}
              <div className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FilmIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">Ready for Edit</span>
                </div>
                <span className="text-xs font-bold text-purple-700">{queueStats.readyForEdit}</span>
              </div>

              {/* Editing */}
              <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FilmIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">Editing</span>
                </div>
                <span className="text-xs font-bold text-orange-700">{queueStats.editing}</span>
              </div>

              {/* Ready to Post */}
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MegaphoneIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Ready to Post</span>
                </div>
                <span className="text-xs font-bold text-green-700">{queueStats.readyToPost}</span>
              </div>

              {/* Posted (Total) */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Posted</span>
                </div>
                <span className="text-xs font-bold text-gray-600">{queueStats.posted}</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Footer - Settings & Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {pendingCount !== undefined && pendingCount > 0 && (
          <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium">
              ⚠️ {pendingCount} item{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your attention
            </p>
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </button>

        {/* Google Drive Button */}
        <button
          onClick={() => {
            const driveUrl = localStorage.getItem('default_drive_folder');
            if (driveUrl && driveUrl.trim() !== '') {
              // If it's a full URL, open it directly
              if (driveUrl.startsWith('http://') || driveUrl.startsWith('https://')) {
                window.open(driveUrl, '_blank');
              } else {
                // Otherwise, construct Google Drive URL from folder ID
                window.open(`https://drive.google.com/drive/folders/${driveUrl}`, '_blank');
              }
            } else {
              toast.error('No Google Drive folder configured. Please set it in Settings.');
              navigate('/settings');
            }
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
          <FolderIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Google Drive</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>

        <div className="text-xs text-gray-500 text-center pt-2">
          <p>Admin Dashboard v1.0</p>
        </div>
      </div>
      </aside>

      {/* Quick Script Modal */}
      <AdminQuickScriptModal
        isOpen={showQuickScriptModal}
        onClose={() => setShowQuickScriptModal(false)}
      />
    </>
  );
}
