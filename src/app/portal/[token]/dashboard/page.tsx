import { redirect } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { CANDIDATE_STATUSES, INTERVIEW_TYPES, INTERVIEW_STATUSES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ResumeForm } from '@/components/candidate/resume-form';
import { PortalSkills } from '@/components/candidate/portal-skills';
import { PortalExperience } from '@/components/candidate/portal-experience';
import { PortalEducation } from '@/components/candidate/portal-education';
import { PortalProjects } from '@/components/candidate/portal-projects';
import { PortalCertifications } from '@/components/candidate/portal-certifications';
import { PortalDocuments } from '@/components/candidate/portal-documents';
import type { CandidateSkill, CandidateExperience, CandidateEducation, CandidateProject, CandidateCertification, CandidateDocument } from '@/types';

export const dynamic = 'force-dynamic';

const statusColorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  applied: 'secondary',
  screening: 'outline',
  scheduled: 'default',
  interviewed: 'outline',
  selected: 'default',
  rejected: 'destructive',
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function safeQuery<T>(query: any): Promise<T[]> {
  try {
    const res = await query;
    return (res.data ?? []) as T[];
  } catch {
    return [];
  }
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { token } = await params;
  const { session: sessionToken } = await searchParams;

  if (!sessionToken) {
    redirect(`/portal/${token}?error=no_session`);
  }

  const admin = createAdmin();

  const { data: session } = await admin
    .from('candidate_sessions')
    .select('*, candidate:candidates(*)')
    .eq('session_token', sessionToken)
    .not('otp_verified_at', 'is', null)
    .gt('session_expires_at', new Date().toISOString())
    .single();

  if (!session) {
    redirect(`/portal/${token}?error=session_expired`);
  }

  const candidate = session.candidate;
  const candidateId = candidate.id;

  const [{ data: interviews }, skills, experience, education, projects, certifications, documents] = await Promise.all([
    admin
      .from('interviews')
      .select('*, position:positions(*), interviewer:profiles!interviewer_id(full_name, email)')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false }),
    safeQuery<CandidateSkill>(admin.from('candidate_skills').select('*').eq('candidate_id', candidateId).order('skill_name')),
    safeQuery<CandidateExperience>(admin.from('candidate_experience').select('*').eq('candidate_id', candidateId).order('start_date', { ascending: false, nullsFirst: false })),
    safeQuery<CandidateEducation>(admin.from('candidate_education').select('*').eq('candidate_id', candidateId).order('start_date', { ascending: false, nullsFirst: false })),
    safeQuery<CandidateProject>(admin.from('candidate_projects').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    safeQuery<CandidateCertification>(admin.from('candidate_certifications').select('*').eq('candidate_id', candidateId).order('issue_date', { ascending: false, nullsFirst: false })),
    safeQuery<CandidateDocument>(admin.from('candidate_documents').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Candidate Profile</CardTitle>
          <CardDescription>Your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{candidate.full_name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{candidate.email}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{candidate.phone}</span>
            </div>
          )}
          {candidate.position_applied && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Position Applied</span>
              <span className="font-medium">{candidate.position_applied}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusColorMap[candidate.status] || 'outline'}>
              {CANDIDATE_STATUSES.find(s => s.value === candidate.status)?.label || candidate.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
          <CardDescription>Your application journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {CANDIDATE_STATUSES.map((status, idx) => {
              const currentIdx = CANDIDATE_STATUSES.findIndex(s => s.value === candidate.status);
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={status.value} className="flex items-center gap-3 py-1.5">
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isCompleted ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {status.label}
                  </span>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <PortalSkills skills={skills} sessionToken={sessionToken} />
      <PortalExperience experience={experience} sessionToken={sessionToken} />
      <PortalEducation education={education} sessionToken={sessionToken} />
      <PortalProjects projects={projects} sessionToken={sessionToken} />
      <PortalCertifications certifications={certifications} sessionToken={sessionToken} />
      <PortalDocuments documents={documents} sessionToken={sessionToken} />

      {interviews && interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interviews</CardTitle>
            <CardDescription>Your interview history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Position</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Scheduled</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Interviewer</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 px-3 font-medium">{interview.position?.title || '—'}</td>
                      <td className="py-2.5 px-3">{INTERVIEW_TYPES.find(t => t.value === interview.interview_type)?.label || interview.interview_type}</td>
                      <td className="py-2.5 px-3">{formatDate(interview.scheduled_at)}</td>
                      <td className="py-2.5 px-3">{interview.interviewer?.full_name || '—'}</td>
                      <td className="py-2.5 px-3">{interview.duration_minutes}m</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={
                          interview.status === 'scheduled' ? 'default' :
                          interview.status === 'completed' ? 'secondary' :
                          interview.status === 'cancelled' || interview.status === 'no_show' ? 'destructive' : 'outline'
                        }>
                          {INTERVIEW_STATUSES.find(s => s.value === interview.status)?.label || interview.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {interview.meeting_link ? (
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">Join</a>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Upload or update your resume link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidate.resume_url ? (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Current Resume</span>
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium">View Resume</a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}
          <ResumeForm sessionToken={sessionToken} />
        </CardContent>
      </Card>
    </div>
  );
}
