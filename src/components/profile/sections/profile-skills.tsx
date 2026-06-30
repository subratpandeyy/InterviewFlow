'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wrench, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { SKILL_PROFICIENCY } from '@/lib/constants';
import * as actions from '@/lib/actions/candidate-profile';
import type { CandidateSkill } from '@/types';

const PROFICIENCY_COLORS: Record<string, string> = {
  beginner: 'bg-blue-500/10 text-blue-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  advanced: 'bg-purple-500/10 text-purple-400',
  expert: 'bg-emerald-500/10 text-emerald-400',
};

interface SkillsSectionProps {
  skills: CandidateSkill[];
  candidateId: string;
}

export function SkillsSection({ skills, candidateId }: SkillsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateSkill | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('candidate_id', candidateId);
      const result = editing
        ? await actions.editSkill(formData)
        : await actions.addSkill(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Skill updated' : 'Skill added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (skill: CandidateSkill) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', skill.id);
      formData.set('candidate_id', candidateId);
      const result = await actions.removeSkill(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Skill removed');
        router.refresh();
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Skills ({skills.length})</CardTitle>
              <CardDescription>Technical and professional skills</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No skills added</p>
              <p className="text-xs text-muted-foreground mb-4">Add skills to track candidate expertise</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add First Skill
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${PROFICIENCY_COLORS[skill.proficiency || 'beginner']}`}>
                    <Star className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{skill.skill_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {skill.proficiency && (
                        <Badge variant="outline" className="text-[10px] capitalize">{skill.proficiency}</Badge>
                      )}
                      {skill.years_experience != null && (
                        <span className="text-[11px] text-muted-foreground">{skill.years_experience}y</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(skill); setShowAdd(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(skill)} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
            <DialogDescription>Enter the skill details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="skill_name">Skill Name</Label>
              <Input id="skill_name" name="skill_name" defaultValue={editing?.skill_name || ''} required placeholder="e.g. React, Python" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={editing?.category || ''} placeholder="e.g. Frontend, Backend, Design" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proficiency">Proficiency</Label>
                <select
                  id="proficiency"
                  name="proficiency"
                  defaultValue={editing?.proficiency || ''}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="">Not set</option>
                  {SKILL_PROFICIENCY.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="years_experience">Years Exp.</Label>
                <Input
                  id="years_experience"
                  name="years_experience"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={editing?.years_experience ?? ''}
                  placeholder="e.g. 3"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Skill'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
