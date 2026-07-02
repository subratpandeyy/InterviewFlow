'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { SKILL_CATEGORIES, PROFICIENCY_SCALE } from '@/lib/constants';
import { addSkill } from '@/lib/actions/interviewer-skills';

export function AddSkillDialog({ profileId }: { profileId: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="default"><Plus className="h-4 w-4 mr-2" />Add Skill</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>
        <form action={addSkill} className="space-y-4">
          <input type="hidden" name="profile_id" value={profileId} />
          <div className="space-y-2">
            <Label htmlFor="skill_name">Skill Name</Label>
            <Input id="skill_name" name="skill_name" required placeholder="e.g. React, TypeScript" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select category...</option>
              {SKILL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proficiency_scale">Proficiency (1-5)</Label>
            <select
              id="proficiency_scale"
              name="proficiency_scale"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select proficiency...</option>
              {PROFICIENCY_SCALE.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="years_experience">Years of Experience</Label>
            <Input id="years_experience" name="years_experience" type="number" step="0.5" placeholder="e.g. 3.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_used">Last Used</Label>
            <Input id="last_used" name="last_used" type="date" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_primary" name="is_primary" value="true" className="rounded border-border" />
            <Label htmlFor="is_primary">Mark as primary skill</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit"><Plus className="h-4 w-4 mr-2" />Add Skill</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
