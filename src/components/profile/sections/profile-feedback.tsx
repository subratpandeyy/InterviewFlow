'use client';

import { Clock, User, Star, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  hire: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maybe: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  reject: 'bg-red-500/10 text-red-400 border-red-500/20',
};

interface FeedbackItem {
  id: string;
  rating: number;
  communication: number;
  technical_skills: number;
  problem_solving: number;
  comments: string | null;
  recommendation: string;
  is_finalized: boolean;
  created_at: string;
  interview_type?: string;
  scheduled_at?: string | null;
}

interface FeedbackSectionProps {
  feedbacks: FeedbackItem[];
}

export function FeedbackSection({ feedbacks }: FeedbackSectionProps) {
  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">No feedback yet</h3>
          <p className="text-sm text-muted-foreground">Feedback will appear here once interviewers submit it</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Timeline ({feedbacks.length})</CardTitle>
        <CardDescription>Chronological feedback from all interviews</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {feedbacks.map((fb, i) => (
            <div key={fb.id} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  fb.recommendation === 'hire' ? 'bg-emerald-500/10 text-emerald-400' :
                  fb.recommendation === 'reject' ? 'bg-red-500/10 text-red-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {fb.rating}
                </div>
                {i < feedbacks.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[10px] capitalize ${RECOMMENDATION_STYLES[fb.recommendation] || ''}`}>
                    {fb.recommendation}
                  </Badge>
                  {fb.is_finalized && <Badge variant="outline" className="text-[10px]">Finalized</Badge>}
                  {fb.interview_type && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {fb.interview_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(fb.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />{fb.rating}/5
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Communication: {fb.communication}/5</span>
                  <span>Technical: {fb.technical_skills}/5</span>
                  <span>Problem Solving: {fb.problem_solving}/5</span>
                </div>
                {fb.comments && (
                  <p className="text-sm text-muted-foreground mt-2 border-l-2 border-border pl-3 italic">
                    &ldquo;{fb.comments}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
