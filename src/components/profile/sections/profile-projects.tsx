'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderGit2, ExternalLink, CalendarDays } from 'lucide-react';
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
import * as actions from '@/lib/actions/candidate-profile';
import type { CandidateProject } from '@/types';

function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

interface ProjectsSectionProps {
  projects: CandidateProject[];
  candidateId: string;
}

export function ProjectsSection({ projects, candidateId }: ProjectsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateProject | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('candidate_id', candidateId);
      const result = editing
        ? await actions.editProject(formData)
        : await actions.addProject(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Project updated' : 'Project added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (proj: CandidateProject) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', proj.id);
      formData.set('candidate_id', candidateId);
      const result = await actions.removeProject(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Project removed');
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
              <CardTitle>Projects ({projects.length})</CardTitle>
              <CardDescription>Notable projects and work samples</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderGit2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No projects recorded</p>
              <p className="text-xs text-muted-foreground mb-4">Add noteworthy projects to showcase work</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{proj.name}</h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(proj); setShowAdd(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(proj)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{proj.description}</p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.technologies.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {proj.url && (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3 w-3" /> Link
                      </a>
                    )}
                    {(proj.start_date || proj.end_date) && (
                      <span className="text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 inline mr-1" />
                        {proj.start_date ? formatDate(proj.start_date) : ''} — {proj.is_current ? 'Present' : proj.end_date ? formatDate(proj.end_date) : ''}
                      </span>
                    )}
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
            <DialogTitle>{editing ? 'Edit Project' : 'Add Project'}</DialogTitle>
            <DialogDescription>Enter the project details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="name">Project Title *</Label>
              <Input id="name" name="name" defaultValue={editing?.name || ''} required placeholder="Project name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description || ''} rows={3} placeholder="Brief description of the project" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technologies">Technologies</Label>
              <Input id="technologies" name="technologies" defaultValue={editing?.technologies?.join(', ') || ''} placeholder="e.g. React, Python, Docker" />
              <p className="text-[11px] text-muted-foreground">Comma-separated list</p>
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
              <Label htmlFor="is_current" className="text-sm">Ongoing project</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Project URL</Label>
              <Input id="url" name="url" type="url" defaultValue={editing?.url || ''} placeholder="https://github.com/..." />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Project'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
