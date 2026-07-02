'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { createPosition } from '@/lib/actions/recruiter';

export function CreatePositionDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Create Position</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Position</DialogTitle>
        </DialogHeader>
        <form action={createPosition} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Senior Frontend Developer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" name="department" required placeholder="e.g. Engineering" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience_required">Experience Required</Label>
            <Input id="experience_required" name="experience_required" placeholder="e.g. 3-5 years" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Job description..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit"><Plus className="h-4 w-4 mr-2" />Create Position</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
