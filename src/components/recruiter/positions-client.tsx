'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Briefcase } from 'lucide-react';
import { createPosition, updatePosition, deletePosition } from '@/lib/actions/recruiter';
import { POSITION_STATUSES, EMPLOYMENT_TYPES } from '@/lib/constants';
import type { Position } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'outline' | 'destructive'> = {
  open: 'success',
  closed: 'outline',
  'on-hold': 'warning',
  filled: 'default',
};

const defaultEditData = {
  title: '',
  department: '',
  employment_type: '',
  location: '',
  experience_required: '',
  description: '',
  skills: '',
  status: 'open',
};

const defaultCreateData = {
  title: '',
  department: '',
  employment_type: '',
  location: '',
  experience_required: '',
  description: '',
  skills: '',
};

export default function PositionsClient({ positions }: { positions: Position[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState(defaultEditData);
  const [createData, setCreateData] = useState(defaultCreateData);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const filtered = positions.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  });

  function handleEdit(position: Position) {
    setEditId(position.id);
    setEditData({
      title: position.title,
      department: position.department,
      employment_type: position.employment_type || '',
      location: position.location || '',
      experience_required: position.experience_required || '',
      description: position.description || '',
      skills: (position.skills || []).join(', '),
      status: position.status,
    });
  }

  function handleCancelEdit() {
    setEditId(null);
    setEditData(defaultEditData);
  }

  function handleCreate(formData: FormData) {
    startCreateTransition(async () => {
      try {
        await createPosition(formData);
        toast.success('Position created successfully');
        setCreateData(defaultCreateData);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create position');
      }
    });
  }

  function handleUpdate(formData: FormData) {
    startUpdateTransition(async () => {
      formData.set('id', editId!);
      const result = await updatePosition(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Position updated successfully');
        setEditId(null);
        setEditData(defaultEditData);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!showConfirmDialog) return;
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set('id', showConfirmDialog);
      const result = await deletePosition(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Position deleted successfully');
        setShowConfirmDialog(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage job openings and positions</p>
      </div>

      <Dialog open={!!showConfirmDialog} onOpenChange={(open) => { if (!open) setShowConfirmDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this position? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isDeletePending}
              onClick={handleDelete}
            >
              {isDeletePending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Positions ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                          <Briefcase className="h-8 w-8 mb-2" />
                          <p className="text-sm text-muted-foreground">No positions found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.title}</TableCell>
                      <TableCell>{position.department}</TableCell>
                      <TableCell>{position.employment_type || '-'}</TableCell>
                      <TableCell>{position.location || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[position.status] || 'outline'}>
                          {POSITION_STATUSES.find((s) => s.value === position.status)?.label || position.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(position)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowConfirmDialog(position.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          {editId ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Position</CardTitle>
                <CardDescription>Update the position details</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleUpdate} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        name="title"
                        required
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-department">Department</Label>
                      <Input
                        id="edit-department"
                        name="department"
                        required
                        value={editData.department}
                        onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-employment_type">Employment Type</Label>
                      <select
                        id="edit-employment_type"
                        name="employment_type"
                        className="flex h-12 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        value={editData.employment_type}
                        onChange={(e) => setEditData({ ...editData, employment_type: e.target.value })}
                      >
                        <option value="">Select type</option>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-location">Location</Label>
                      <Input
                        id="edit-location"
                        name="location"
                        value={editData.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-experience_required">Experience Required</Label>
                      <Input
                        id="edit-experience_required"
                        name="experience_required"
                        value={editData.experience_required}
                        onChange={(e) => setEditData({ ...editData, experience_required: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <select
                        id="edit-status"
                        name="status"
                        className="flex h-12 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        {POSITION_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      name="description"
                      rows={3}
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-skills">Skills (comma separated)</Label>
                    <Input
                      id="edit-skills"
                      name="skills"
                      value={editData.skills}
                      onChange={(e) => setEditData({ ...editData, skills: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isUpdatePending}>
                      {isUpdatePending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Position</CardTitle>
                <CardDescription>Add a new job opening</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleCreate} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Senior Frontend Developer"
                        value={createData.title}
                        onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        required
                        placeholder="e.g. Engineering"
                        value={createData.department}
                        onChange={(e) => setCreateData({ ...createData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-employment_type">Employment Type</Label>
                      <select
                        id="create-employment_type"
                        name="employment_type"
                        className="flex h-12 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        value={createData.employment_type}
                        onChange={(e) => setCreateData({ ...createData, employment_type: e.target.value })}
                      >
                        <option value="">Select type</option>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-location">Location</Label>
                      <Input
                        id="create-location"
                        name="location"
                        placeholder="e.g. San Francisco, CA"
                        value={createData.location}
                        onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-experience_required">Experience Required</Label>
                      <Input
                        id="create-experience_required"
                        name="experience_required"
                        placeholder="e.g. 3-5 years"
                        value={createData.experience_required}
                        onChange={(e) => setCreateData({ ...createData, experience_required: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      name="description"
                      rows={3}
                      placeholder="Job description..."
                      value={createData.description}
                      onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-skills">Skills (comma separated)</Label>
                    <Input
                      id="create-skills"
                      name="skills"
                      placeholder="e.g. React, TypeScript, Node.js"
                      value={createData.skills}
                      onChange={(e) => setCreateData({ ...createData, skills: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatePending}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreatePending ? 'Creating...' : 'Create Position'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
