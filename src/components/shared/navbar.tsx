'use client';

import { LogoutButton } from '@/components/auth/logout-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 outline-none cursor-pointer">
              <div className="text-right text-sm">
                <p className="font-medium">{profile.full_name}</p>
                <p className="text-muted-foreground capitalize">{ROLE_LABELS[role] || role}</p>
              </div>
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>{profile.email}</DropdownMenuItem>
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
