'use client';

import Link from 'next/link';
import { Calendar, Clock, ExternalLink, Video, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { CandidateProfileData } from '@/lib/services/candidate-profile.service';

function formatDateTime(date: string | null | undefined): string {
  if (!date) return 'Not scheduled';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-muted-foreground/10 text-muted-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
};

const TYPE_LABELS: Record<string, string> = {
  hr: 'HR Round',
  technical: 'Technical Round',
  managerial: 'Managerial Round',
  final: 'Final Round',
};

interface InterviewsSectionProps {
  interviews: CandidateProfileData['interviews'];
  candidateId: string;
}

export function InterviewsSection({ interviews, candidateId }: InterviewsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviews ({interviews.length})</CardTitle>
        <CardDescription>Interview history and upcoming sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No interviews yet</p>
            <p className="text-xs text-muted-foreground mb-4">Schedule an interview to get started</p>
                            <Link
              href={`/recruiter/scheduling/new?candidate_id=${candidateId}`}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted hover:text-foreground transition-colors gap-1"
            >
              <Calendar className="h-3.5 w-3.5" /> Schedule Interview
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">
                      {TYPE_LABELS[interview.interview_type] || interview.interview_type}
                    </h4>
                    <Badge className={`text-[10px] ${STATUS_STYLES[interview.status] || ''}`}>
                      {interview.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(interview.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {interview.duration_minutes} min
                    </span>
                    {interview.interviewer && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {interview.interviewer.full_name}
                      </span>
                    )}
                  </div>
                  {interview.meeting_link && (
                    <a
                      href={interview.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Join Meeting
                    </a>
                  )}
                  {interview.feedback.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {interview.feedback.map((fb) => (
                        <Badge key={fb.id} variant="outline" className="text-[10px]">
                          Rating: {fb.rating}/5
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href={`/recruiter/interviews`}
                  className="size-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
