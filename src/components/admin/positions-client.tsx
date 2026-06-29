'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, Trash2Icon, CheckIcon, XIcon, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updatePosition } from '@/lib/actions/recruiter';
import { deletePosition, updatePositionStatus } from '@/lib/actions/admin';
import type { Position } from '@/types';

interface PositionsClientProps {
  positions: Position[];
}

const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
] as const;

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'filled', label: 'Filled' },
] as const;

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'outline'> = {
  open: 'success',
  closed: 'secondary',
  'on-hold': 'warning',
  filled: 'default',
};

export function PositionsClient({ positions }: PositionsClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({
    title: '',
    department: '',
    employment_type: '',
    location: '',
    experience_required: '',
    description: '',
    skills: '',
    status: 'open',
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this position?')) return;

    setDeleteLoading(true);
    const formData = new FormData();
    formData.append('id', id);
    const result = await deletePosition(formData);
    setDeleteLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Position deleted');
      router.refresh();
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setStatusLoading(id);
    const formData = new FormData();
    formData.append('id', id);
    formData.append('status', status);
    const result = await updatePositionStatus(formData);
    setStatusLoading(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Status updated');
      router.refresh();
    }
  };

  const startEdit = (position: Position) => {
    setEditingId(position.id);
    setEditForm({
      title: position.title,
      department: position.department,
      employment_type: position.employment_type || '',
      location: position.location || '',
      experience_required: position.experience_required || '',
      description: position.description || '',
      skills: (position.skills || []).join(', '),
      status: position.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', department: '', employment_type: '', location: '', experience_required: '', description: '', skills: '', status: 'open' });
  };

  const saveEdit = async (id: string) => {
    setSaveLoading(true);
    const formData = new FormData();
    formData.append('id', id);
    formData.append('title', editForm.title);
    formData.append('department', editForm.department);
    formData.append('employment_type', editForm.employment_type);
    formData.append('location', editForm.location);
    formData.append('experience_required', editForm.experience_required);
    formData.append('description', editForm.description);
    formData.append('skills', editForm.skills);
    formData.append('status', editForm.status || '');

    const result = await updatePosition(formData);
    setSaveLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Position updated');
      setEditingId(null);
      router.refresh();
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Experience</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.length === 0 && (
          <TableRow>
            <TableCell colSpan={6}>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Briefcase className="size-8 mb-2" />
                <p className="text-sm">No positions yet. Create your first position.</p>
              </div>
            </TableCell>
          </TableRow>
        )}
        {positions.map((p) =>
          editingId === p.id ? (
            <TableRow key={p.id}>
              <TableCell colSpan={5}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <Input
                      value={editForm.department}
                      onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Employment Type</Label>
                    <select
                      value={editForm.employment_type || 'full-time'}
                      onChange={(e) => setEditForm((f) => ({ ...f, employment_type: e.target.value }))}
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                    >
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="h-8"
                      placeholder="e.g. Remote, NYC"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Experience Required</Label>
                    <Input
                      value={editForm.experience_required}
                      onChange={(e) => setEditForm((f) => ({ ...f, experience_required: e.target.value }))}
                      className="h-8"
                      placeholder="e.g. 3-5 years"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Skills</Label>
                    <Input
                      value={editForm.skills}
                      onChange={(e) => setEditForm((f) => ({ ...f, skills: e.target.value }))}
                      className="h-8"
                      placeholder="Comma-separated"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <select
                      value={editForm.status || 'open'}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <LoadingButton
                    size="icon-sm"
                    onClick={() => saveEdit(p.id)}
                    loading={saveLoading}
                  >
                    <CheckIcon className="size-4" />
                    <span className="sr-only">Save</span>
                  </LoadingButton>
                  <Button variant="ghost" size="icon-sm" onClick={cancelEdit}>
                    <XIcon className="size-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>{p.department}</TableCell>
              <TableCell>{p.experience_required || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[p.status] ?? 'default'}>
                    {STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status}
                  </Badge>
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    disabled={statusLoading === p.id}
                    className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs disabled:opacity-50"
                    aria-label="Change status"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {new Date(p.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(p)}>
                    <PencilIcon className="size-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={deleteLoading} onClick={() => handleDelete(p.id)}>
                    <Trash2Icon className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
