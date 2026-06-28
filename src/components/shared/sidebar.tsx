'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DASHBOARD_ROUTES } from '@/lib/constants';
import { Calendar, Users, Briefcase, LayoutDashboard, Clock, Star, Settings } from 'lucide-react';
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
  const routes = DASHBOARD_ROUTES[role] || [];
  const homeUrl = ROLE_URL_MAP[role] || `/${role}`;

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <Link href={homeUrl} className="text-xl font-bold">
          InterviewFlow
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {routes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'inline-flex items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'hover:bg-muted hover:text-foreground'
              )}
            >
                {iconMap[route.label]}
                {route.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
