import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { profileService } from '@/services/profileService';
import { UserRole } from '@/types';

export default function RoleBasedRedirect() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getMyProfile,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect based on role
  switch (profile?.role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.CREATOR:
      return <Navigate to="/admin" replace />;
    case UserRole.VIDEOGRAPHER:
      return <Navigate to="/videographer" replace />;
    case UserRole.EDITOR:
      return <Navigate to="/editor" replace />;
    case UserRole.POSTING_MANAGER:
      return <Navigate to="/posting-manager" replace />;
    case UserRole.SCRIPT_WRITER:
    default:
      return <Navigate to="/analyses" replace />;
  }
}
