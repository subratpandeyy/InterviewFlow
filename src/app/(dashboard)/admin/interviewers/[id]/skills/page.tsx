import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSkill } from '@/lib/actions/interviewer-skills';
import { AddSkillDialog } from '@/components/admin/add-skill-dialog';
import { BulkImportDialog } from '@/components/admin/bulk-import-dialog';
import type { InterviewerSkill } from '@/types';

export const dynamic = 'force-dynamic';

export default async function InterviewerSkillsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
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

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, department')
    .eq('id', id)
    .single();

  if (!profile) return <div className="text-center py-12 text-muted-foreground">Interviewer not found</div>;

  const { data: skills } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('profile_id', id)
    .order('is_primary', { ascending: false })
    .order('category', { ascending: true });

  const allSkills = (skills ?? []) as InterviewerSkill[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/interviewers/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Skills: {profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Skills ({allSkills.length})</CardTitle>
          <div className="flex items-center gap-2">
            <BulkImportDialog profileId={id} />
            <AddSkillDialog profileId={id} />
          </div>
        </CardHeader>
        <CardContent>
          {allSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No skills added yet. Click &quot;Add Skill&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {skill.skill_name}
                        {skill.is_primary && <Badge variant="default" className="ml-2 text-xs">Primary</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {skill.category}
                        {skill.proficiency_scale && ` · Level ${skill.proficiency_scale}/5`}
                        {skill.years_experience && ` · ${skill.years_experience} yrs`}
                        {skill.last_used && ` · Last used: ${skill.last_used}`}
                      </p>
                    </div>
                  </div>
                  <form action={deleteSkill}>
                    <input type="hidden" name="id" value={skill.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
