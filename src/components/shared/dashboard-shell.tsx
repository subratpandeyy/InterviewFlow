'use client';

import type { Role, Profile } from '@/types';
import { SidebarProvider } from './sidebar-context';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { Container } from '@/components/ui/container';

export function DashboardShell({ role, profile, children }: { role: Role; profile: Profile; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShellInner role={role} profile={profile}>{children}</DashboardShellInner>
    </SidebarProvider>
  );
}

function DashboardShellInner({ role, profile, children }: { role: Role; profile: Profile; children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar profile={profile} role={role} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Container className="py-8">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
}
