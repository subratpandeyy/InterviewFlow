'use client';

import type { Role, Profile } from '@/types';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';

interface DashboardShellProps {
  role: Role;
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ role, profile, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar profile={profile} role={role} />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
