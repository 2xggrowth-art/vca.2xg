import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import type { UserRole } from '@/types';

interface AppShellProps {
  role: UserRole;
}

export default function AppShell({ role }: AppShellProps) {
  return (
    <div className="app-container">
      {/* Main content area */}
      <main className="flex-1 pb-24 overflow-y-auto px-4 pt-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav role={role} />
    </div>
  );
}
