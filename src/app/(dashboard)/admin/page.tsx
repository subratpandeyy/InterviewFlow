import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();

  const [membersRes, profileRes] = await Promise.all([
    admin
      .from('organization_members')
      .select('id, role, user_id, created_at')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('user_id, full_name, email')
      .in(
        'user_id',
        (
          await admin
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', membership.organization_id)
        ).data?.map((m) => m.user_id) ?? [],
      ),
  ]);

  const profileByUserId = Object.fromEntries(
    (profileRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const members = (membersRes.data ?? []).map((m) => ({
    ...m,
    profiles: profileByUserId[m.user_id] ?? { full_name: 'Unknown', email: '' },
  }));

  const [
    candidatesCountRes,
    allInterviewsRes,
    availabilityRes,
    upcomingCountRes,
    totalInterviewCountRes,
  ] = await Promise.all([
    admin
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null),
    supabase
      .from('interviews')
      .select('id, interview_type, status, scheduled_at, candidate:candidates!inner(full_name), position:positions!inner(title)')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20),
    admin
      .from('interviewer_availability')
      .select('id, date, start_time, end_time, profile:profiles!interviewer_id(full_name)')
      .eq('status', 'available')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50),
    admin
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString()),
    admin
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null),
  ]);
  const candidateCount = candidatesCountRes.count ?? 0;
  const allInterviews = allInterviewsRes.data ?? [];
  const availability = availabilityRes.data ?? [];
  const upcomingCount = upcomingCountRes.count ?? allInterviews.length;
  const totalInterviewCount = totalInterviewCountRes.count ?? 0;

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round', technical: 'Technical Round', managerial: 'Managerial Round', final: 'Final Round',
  };

  function formatTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-3xl font-bold">{members.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Current Users</p>
          <p className="text-3xl font-bold">{members.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Candidates</p>
          <p className="text-3xl font-bold">{candidateCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Upcoming Interviews</p>
          <p className="text-3xl font-bold">{upcomingCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Interviews</p>
          <p className="text-3xl font-bold">{totalInterviewCount}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/admin/users" className="text-sm text-primary hover:underline mb-4 block">
            Manage team members and invitations →
          </Link>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No members found.</TableCell>
                </TableRow>
              )}
              {members.map((m) => {
                const p = m.profiles;
                const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                        <span className="font-medium">{p.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === 'organization_admin' ? 'default' : 'secondary'}>
                        {m.role === 'organization_admin' ? 'Admin' : m.role === 'recruiter' ? 'Recruiter' : 'Interviewer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Interviews ({upcomingCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInterviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No upcoming interviews.</TableCell>
                </TableRow>
              )}
              {allInterviews.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.candidate?.full_name}</TableCell>
                  <TableCell>{i.position?.title}</TableCell>
                  <TableCell>{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === 'scheduled' ? 'default' : 'secondary'}>
                      {i.status === 'confirmed' ? 'Confirmed' : i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {availability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availability.map((s: any) => {
                  const prof = s.profile as { full_name: string } | undefined;
                  const start = s.start_time;
                  const end = s.end_time;
                  const diff = (parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])) -
                               (parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]));
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{prof?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{new Date(s.date + 'T12:00:00').toLocaleDateString()}</TableCell>
                      <TableCell>{formatTime(start)} - {formatTime(end)}</TableCell>
                      <TableCell className="text-muted-foreground">{diff} min</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
