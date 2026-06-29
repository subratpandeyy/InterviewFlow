'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { LogoutButton } from '@/components/auth/logout-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile, Role } from '@/types';

interface NavbarProps {
  profile: Profile;
  role: Role;
}

const ROLE_LABELS: Record<string, string> = {
  organization_admin: 'Admin',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
};

export function Navbar({ profile, role }: NavbarProps) {
  const { setMobileOpen, collapsed, toggleCollapsed } = useSidebar();

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={toggleCollapsed}
          className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">

        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-secondary transition-colors">
            <div className="hidden text-right text-sm md:block">
              <p className="font-medium text-foreground">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role] || role}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{profile.full_name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                {profile.email}
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground text-xs capitalize">
                {ROLE_LABELS[role] || role}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
