'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { DASHBOARD_ROUTES } from '@/lib/constants';
import {
  Calendar,
  Users,
  Briefcase,
  LayoutDashboard,
  Clock,
  Star,
  Settings,
  ChevronLeft,
  PanelLeft,
  X,
} from 'lucide-react';
import type { Role } from '@/types';

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard className="h-4 w-4" />,
  Candidates: <Users className="h-4 w-4" />,
  Scheduling: <Calendar className="h-4 w-4" />,
  Interviews: <Briefcase className="h-4 w-4" />,
  Positions: <Briefcase className="h-4 w-4" />,
  Upcoming: <Clock className="h-4 w-4" />,
  Availability: <Clock className="h-4 w-4" />,
  Feedback: <Star className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
};

const ROLE_URL_MAP: Record<string, string> = {
  organization_admin: '/admin',
  recruiter: '/recruiter',
  interviewer: '/interviewer',
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebar();
  const routes = DASHBOARD_ROUTES[role] || [];
  const homeUrl = ROLE_URL_MAP[role] || `/${role}`;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-200',
          collapsed ? 'w-16' : 'w-[260px]',
          'rounded-r-2xl border-r border-sidebar-border',
          'lg:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn('flex h-[72px] shrink-0 items-center border-b border-sidebar-border', collapsed ? 'justify-center' : 'justify-between px-6')}>
          {!collapsed && (
            <Link href={homeUrl} className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              InterviewFlow
            </Link>
          )}
          <button
            onClick={collapsed ? toggleCollapsed : undefined}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              collapsed ? '' : '',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {routes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex min-h-[44px] items-center gap-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  collapsed ? 'justify-center px-0' : 'px-3',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                )}
                title={collapsed ? route.label : undefined}
              >
                <span className="flex shrink-0 items-center justify-center">
                  {iconMap[route.label]}
                </span>
                {!collapsed && <span>{route.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/30 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-semibold uppercase">
                {role === 'organization_admin' ? 'A' : role === 'recruiter' ? 'R' : 'I'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground capitalize truncate">
                  {role === 'organization_admin' ? 'Admin' : role}
                </p>
                <p className="text-xs text-sidebar-foreground/40 truncate">{homeUrl.replace('/', '')}.interviewflow.io</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
