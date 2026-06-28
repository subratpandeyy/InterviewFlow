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

  const [membersRes, candidatesRes, interviewsRes, availabilityRes] = await Promise.all([
    admin
      .from('organization_members')
      .select('*, profiles!inner(full_name, email)')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('candidates')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('interviews')
      .select('*, candidate:candidates(*), position:positions(*)')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('interviewer_availability')
      .select('*, profile:profiles!interviewer_id(full_name)')
      .eq('status', 'available')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50),
  ]);

  const members = (membersRes.data ?? []) as unknown as { role: string; user_id: string; created_at: string; profiles: { full_name: string; email: string } }[];
  const candidates = candidatesRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const availability = availabilityRes.data ?? [];

  const upcomingInterviews = interviews.filter(i => i.status === 'scheduled' || i.status === 'pending');
  const { count: interviewCount } = await supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', membership.organization_id);

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-3xl font-bold">{members.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Candidates</p>
          <p className="text-3xl font-bold">{candidates.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Interviews</p>
          <p className="text-3xl font-bold">{interviewCount ?? 0}</p>
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
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No members found.</TableCell>
                </TableRow>
              )}
              {members.map((m) => {
                const p = m.profiles;
                const initials = p.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
          <CardTitle>Upcoming Interviews ({upcomingInterviews.length})</CardTitle>
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
              {upcomingInterviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No upcoming interviews.</TableCell>
                </TableRow>
              )}
              {upcomingInterviews.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.candidate?.full_name}</TableCell>
                  <TableCell>{i.position?.title}</TableCell>
                  <TableCell>{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                  <TableCell><Badge variant={i.status === 'scheduled' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
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
                {availability.map((s) => {
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
