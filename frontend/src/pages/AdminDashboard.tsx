/**
 * Admin Dashboard - Mobile-First with Bottom Navigation
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import NeedApprovalPage from './admin/NeedApprovalPage';
import TeamMembersPage from './admin/TeamMembersPage';
import ProductionStatusPage from './admin/ProductionStatusPage';
import BottomNavigation from '@/components/BottomNavigation';
import { UserRole } from '@/types';

type AdminTab = 'team' | 'approval' | 'production';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as AdminTab) || 'approval';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePageChange = (page: AdminTab) => {
    setSearchParams({ tab: page });
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <AdminSidebar
        selectedPage={currentTab}
        onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-[56px] md:pt-0 pb-20 md:pb-0">
        {currentTab === 'team' && <TeamMembersPage />}
        {currentTab === 'approval' && <NeedApprovalPage />}
        {currentTab === 'production' && <ProductionStatusPage />}
      </div>

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation role={UserRole.SUPER_ADMIN} />
    </div>
  );
}
