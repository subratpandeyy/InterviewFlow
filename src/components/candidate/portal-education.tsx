'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GraduationCap, CalendarDays } from 'lucide-react';
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
import * as actions from '@/lib/actions/candidate';
import type { CandidateEducation } from '@/types';

function formatYear(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).getFullYear().toString();
}

export function PortalEducation({ education, sessionToken }: { education: CandidateEducation[]; sessionToken: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateEducation | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('session_token', sessionToken);
      const result = editing
        ? await actions.updatePortalEducation(formData)
        : await actions.addPortalEducation(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Education updated' : 'Education added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch {
      toast.error('Failed to save education');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (edu: CandidateEducation) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('session_token', sessionToken);
      formData.set('id', edu.id);
      const result = await actions.deletePortalEducation(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Education removed');
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
              <CardTitle>Education ({education.length})</CardTitle>
              <CardDescription>Academic background and qualifications</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Education
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {education.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No education history</p>
              <p className="text-xs text-muted-foreground mb-4">Add your academic qualifications</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Education
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/20">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{edu.institution}</h4>
                      {edu.is_current && <Badge variant="success" className="text-[10px]">Current</Badge>}
                    </div>
                    {edu.degree && (
                      <p className="text-sm text-muted-foreground">
                        {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      {edu.start_date ? formatYear(edu.start_date) : '?'} — {edu.is_current ? 'Present' : edu.end_date ? formatYear(edu.end_date) : '?'}
                      {edu.grade ? ` · Grade: ${edu.grade}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(edu); setShowAdd(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(edu)} disabled={isPending}>
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
            <DialogTitle>{editing ? 'Edit Education' : 'Add Education'}</DialogTitle>
            <DialogDescription>Enter the education details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="institution">Institution *</Label>
              <Input id="institution" name="institution" defaultValue={editing?.institution || ''} required placeholder="University or school name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" name="degree" defaultValue={editing?.degree || ''} placeholder="e.g. Bachelor's, Master's" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field_of_study">Field of Study</Label>
                <Input id="field_of_study" name="field_of_study" defaultValue={editing?.field_of_study || ''} placeholder="e.g. Computer Science" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Year</Label>
                <Input id="start_date" name="start_date" type="month" defaultValue={editing?.start_date?.slice(0, 7) || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Year</Label>
                <Input id="end_date" name="end_date" type="month" defaultValue={editing?.end_date?.slice(0, 7) || ''} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_current" name="is_current" value="true" defaultChecked={editing?.is_current || false} className="rounded border-border" />
              <Label htmlFor="is_current" className="text-sm">Currently studying here</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input id="grade" name="grade" defaultValue={editing?.grade || ''} placeholder="e.g. 3.8 GPA, First Class" />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Education'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
