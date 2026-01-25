import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  UserCircleIcon,
  FilmIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  FilmIcon as FilmIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  badge?: number;
}

interface BottomNavigationProps {
  role: UserRole;
  onNewAction?: () => void;
  badges?: {
    available?: number;
    myWork?: number;
    approvals?: number;
  };
}

// Define navigation items per role
const getNavItems = (
  role: UserRole,
  badges?: BottomNavigationProps['badges']
): NavItem[] => {
  switch (role) {
    case UserRole.VIDEOGRAPHER:
      return [
        {
          label: 'Available',
          href: '/videographer?tab=available',
          icon: HomeIcon,
          activeIcon: HomeIconSolid,
          badge: badges?.available,
        },
        {
          label: 'My Work',
          href: '/videographer?tab=mywork',
          icon: ClipboardDocumentListIcon,
          activeIcon: ClipboardDocumentListIconSolid,
          badge: badges?.myWork,
        },
        {
          label: 'New',
          href: '#new',
          icon: PlusCircleIcon,
          activeIcon: PlusCircleIconSolid,
        },
        {
          label: 'Profile',
          href: '/videographer?tab=profile',
          icon: UserCircleIcon,
          activeIcon: UserCircleIconSolid,
        },
      ];

    case UserRole.EDITOR:
      return [
        {
          label: 'Available',
          href: '/editor?tab=available',
          icon: HomeIcon,
          activeIcon: HomeIconSolid,
          badge: badges?.available,
        },
        {
          label: 'My Edits',
          href: '/editor?tab=mywork',
          icon: FilmIcon,
          activeIcon: FilmIconSolid,
          badge: badges?.myWork,
        },
        {
          label: 'Profile',
          href: '/editor?tab=profile',
          icon: UserCircleIcon,
          activeIcon: UserCircleIconSolid,
        },
      ];

    case UserRole.POSTING_MANAGER:
      return [
        {
          label: 'Home',
          href: '/posting-manager?tab=home',
          icon: HomeIcon,
          activeIcon: HomeIconSolid,
        },
        {
          label: 'To Post',
          href: '/posting-manager?tab=topost',
          icon: ClipboardDocumentListIcon,
          activeIcon: ClipboardDocumentListIconSolid,
          badge: badges?.available,
        },
        {
          label: 'Calendar',
          href: '/posting-manager?tab=calendar',
          icon: CalendarDaysIcon,
          activeIcon: CalendarDaysIconSolid,
        },
        {
          label: 'Profile',
          href: '/posting-manager?tab=profile',
          icon: UserCircleIcon,
          activeIcon: UserCircleIconSolid,
        },
      ];

    case UserRole.SUPER_ADMIN:
    case UserRole.CREATOR:
      return [
        {
          label: 'Review',
          href: '/admin?tab=approval',
          icon: CheckCircleIcon,
          activeIcon: CheckCircleIconSolid,
          badge: badges?.approvals,
        },
        {
          label: 'Status',
          href: '/admin?tab=production',
          icon: ChartBarIcon,
          activeIcon: ChartBarIconSolid,
        },
        {
          label: 'Team',
          href: '/admin?tab=team',
          icon: HomeIcon,
          activeIcon: HomeIconSolid,
        },
        {
          label: 'Settings',
          href: '/settings',
          icon: Cog6ToothIcon,
          activeIcon: Cog6ToothIconSolid,
        },
      ];

    case UserRole.SCRIPT_WRITER:
    default:
      return [
        {
          label: 'Home',
          href: '/analyses',
          icon: HomeIcon,
          activeIcon: HomeIconSolid,
        },
        {
          label: 'My Scripts',
          href: '/analyses?tab=scripts',
          icon: ClipboardDocumentListIcon,
          activeIcon: ClipboardDocumentListIconSolid,
        },
        {
          label: 'New',
          href: '#new',
          icon: PlusCircleIcon,
          activeIcon: PlusCircleIconSolid,
        },
        {
          label: 'Profile',
          href: '/analyses?tab=profile',
          icon: UserCircleIcon,
          activeIcon: UserCircleIconSolid,
        },
      ];
  }
};

export default function BottomNavigation({ role, onNewAction, badges }: BottomNavigationProps) {
  const location = useLocation();
  const navItems = getNavItems(role, badges);

  const isActive = (href: string) => {
    if (href === '#new') return false;

    // Parse the href to get the base path and tab param
    const [basePath, queryString] = href.split('?');
    const hrefParams = new URLSearchParams(queryString || '');
    const hrefTab = hrefParams.get('tab');

    // Parse current location
    const currentParams = new URLSearchParams(location.search);
    const currentTab = currentParams.get('tab');

    // If href has a tab param, check both path and tab
    if (hrefTab) {
      return location.pathname === basePath && currentTab === hrefTab;
    }

    // Otherwise just check the path
    // For the base path without tab, only match if there's no tab in current location
    // OR if the current path exactly matches
    return location.pathname === basePath && !currentTab;
  };

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.href === '#new' && onNewAction) {
      e.preventDefault();
      onNewAction();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.label}
              to={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 relative transition-colors ${
                active
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 active:text-primary-600'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-600 rounded-b-full" />
              )}

              {/* Icon with badge */}
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-medium mt-1 truncate max-w-full ${
                active ? 'font-semibold' : ''
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
