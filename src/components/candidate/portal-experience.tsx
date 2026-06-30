'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Briefcase, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import * as actions from '@/lib/actions/candidate';
import type { CandidateExperience } from '@/types';

function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export function PortalExperience({ experience, sessionToken }: { experience: CandidateExperience[]; sessionToken: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateExperience | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('session_token', sessionToken);
      const result = editing
        ? await actions.updatePortalExperience(formData)
        : await actions.addPortalExperience(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Experience updated' : 'Experience added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch {
      toast.error('Failed to save experience');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (exp: CandidateExperience) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('session_token', sessionToken);
      formData.set('id', exp.id);
      const result = await actions.deletePortalExperience(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Experience removed');
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
              <CardTitle>Experience ({experience.length})</CardTitle>
              <CardDescription>Work history and positions held</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {experience.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No experience recorded</p>
              <p className="text-xs text-muted-foreground mb-4">Add your work history to build your profile</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Experience
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={exp.id} className="relative pl-8 pb-4 last:pb-0">
                  <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-accent bg-background" />
                  {idx < experience.length - 1 && (
                    <div className="absolute left-[5px] top-5 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
                        {exp.is_current && <Badge variant="success" className="text-[10px]">Current</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <CalendarDays className="h-3 w-3 inline mr-1" />
                        {exp.start_date ? formatDate(exp.start_date) : 'Unknown'} — {exp.is_current ? 'Present' : exp.end_date ? formatDate(exp.end_date) : 'Unknown'}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{exp.description}</p>
                      )}
                      {exp.skills_used && exp.skills_used.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exp.skills_used.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(exp); setShowAdd(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(exp)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
            <DialogDescription>Enter the work experience details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input id="company" name="company" defaultValue={editing?.company || ''} required placeholder="Company name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Position *</Label>
                <Input id="title" name="title" defaultValue={editing?.title || ''} required placeholder="e.g. Software Engineer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={editing?.location || ''} placeholder="e.g. San Francisco, CA" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="month" defaultValue={editing?.start_date?.slice(0, 7) || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" name="end_date" type="month" defaultValue={editing?.end_date?.slice(0, 7) || ''} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_current" name="is_current" value="true" defaultChecked={editing?.is_current || false} className="rounded border-border" />
              <Label htmlFor="is_current" className="text-sm">I currently work here</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description || ''} rows={3} placeholder="Describe your responsibilities and achievements" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills_used">Technologies Used</Label>
              <Input id="skills_used" name="skills_used" defaultValue={editing?.skills_used?.join(', ') || ''} placeholder="e.g. React, Node.js, PostgreSQL" />
              <p className="text-[11px] text-muted-foreground">Comma-separated list</p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Experience'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
