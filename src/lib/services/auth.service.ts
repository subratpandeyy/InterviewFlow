import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { AuthError, ForbiddenError } from './errors';
import type { Role, Profile, OrganizationMember } from '@/types';

export interface AuthUser {
  userId: string;
  profileId: string;
  organizationId: string;
  role: Role;
  email: string;
}

export interface AuthContext {
  user: AuthUser;
  profile: Profile;
  membership: OrganizationMember;
}

function isRoleOrHigher(current: Role, required: Role): boolean {
  const hierarchy: Record<Role, number> = {
    organization_admin: 3,
    recruiter: 2,
    interviewer: 1,
  };
  return hierarchy[current] >= hierarchy[required];
}

export async function getCurrentUser() {
  const supabase = await createServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AuthError('Not authenticated');
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createServer();
  const user = await getCurrentUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error || !profile) throw new AuthError('Profile not found');
  return profile;
}

export async function getCurrentOrganization() {
  const supabase = await createServer();
  const user = await getCurrentUser();
  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();
  if (error || !membership) throw new AuthError('No organization membership');
  return { organizationId: membership.organization_id, role: membership.role as Role };
}

export async function getFullAuthContext(): Promise<AuthContext> {
  const supabase = await createServer();
  const user = await getCurrentUser();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (profileError || !profile) throw new AuthError('Profile not found');

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (memberError || !membership) throw new AuthError('No organization membership');

  return {
    user: {
      userId: user.id,
      profileId: profile.id,
      organizationId: membership.organization_id,
      role: membership.role as Role,
      email: user.email || profile.email,
    },
    profile: profile as Profile,
    membership: membership as OrganizationMember,
  };
}

export async function requireRole(allowedRoles: Role | Role[]): Promise<AuthContext> {
  const ctx = await getFullAuthContext();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(ctx.user.role)) {
    throw new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`);
  }
  return ctx;
}

export async function requireRoleOrHigher(minRole: Role): Promise<AuthContext> {
  const ctx = await getFullAuthContext();
  if (!isRoleOrHigher(ctx.user.role, minRole)) {
    throw new ForbiddenError(`Requires role ${minRole} or higher`);
  }
  return ctx;
}

export async function requireOrganizationMember(): Promise<AuthContext> {
  return await getFullAuthContext();
}

export async function getAdminClient() {
  return createAdmin();
}

export function canManageCandidates(role: Role): boolean {
  return role === 'organization_admin' || role === 'recruiter';
}

export function canManageInterviews(role: Role): boolean {
  return role === 'organization_admin' || role === 'recruiter';
}

export function canManagePositions(role: Role): boolean {
  return role === 'organization_admin' || role === 'recruiter';
}
