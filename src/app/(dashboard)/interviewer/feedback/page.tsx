import { createServer } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitFeedback } from '@/lib/actions/interviewer';

export default async function FeedbackPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  if (!profile) return null;

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*)')
    .eq('interviewer_id', profile.id)
    .in('status', ['scheduled', 'completed'])
    .order('scheduled_at', { ascending: false });

  const { data: feedbacks } = await supabase
    .from('feedback')
    .select('*')
    .eq('interviewer_id', profile.id);

  const feedbackInterviewIds = new Set(feedbacks?.map(f => f.interview_id) ?? []);
  const pendingInterviews = interviews?.filter(i => !feedbackInterviewIds.has(i.id)) ?? [];
  const completedFeedbacks = feedbacks ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Feedback</h1>

      {pendingInterviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Feedback</h2>
          {pendingInterviews.map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {interview.candidate?.full_name} - {interview.position?.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={submitFeedback} className="space-y-4">
                  <input type="hidden" name="interview_id" value={interview.id} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`rating-${interview.id}`}>Overall Rating</Label>
                      <select
                        id={`rating-${interview.id}`}
                        name="rating"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`communication-${interview.id}`}>Communication</Label>
                      <select
                        id={`communication-${interview.id}`}
                        name="communication"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`technical_skills-${interview.id}`}>Technical Skills</Label>
                      <select
                        id={`technical_skills-${interview.id}`}
                        name="technical_skills"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`problem_solving-${interview.id}`}>Problem Solving</Label>
                      <select
                        id={`problem_solving-${interview.id}`}
                        name="problem_solving"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`comments-${interview.id}`}>Comments</Label>
                    <Textarea
                      id={`comments-${interview.id}`}
                      name="comments"
                      rows={3}
                      placeholder="Interview observations..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`recommendation-${interview.id}`}>Recommendation</Label>
                    <select
                      id={`recommendation-${interview.id}`}
                      name="recommendation"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      <option value="hire">Hire</option>
                      <option value="maybe">Maybe</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <Button type="submit">Submit Feedback</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedFeedbacks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Submitted Feedback</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedFeedbacks.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Rating: {fb.rating}/5</span>
                    <Badge variant={fb.recommendation === 'hire' ? 'default' : 'secondary'}>
                      {fb.recommendation}
                    </Badge>
                  </div>
                  {fb.comments && (
                    <p className="text-sm text-muted-foreground">{fb.comments}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
