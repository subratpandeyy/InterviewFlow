'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { bulkImportSkills } from '@/lib/actions/interviewer-skills';

export function BulkImportDialog({ profileId }: { profileId: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline"><Upload className="h-4 w-4 mr-2" />Bulk Import</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Skills</DialogTitle>
        </DialogHeader>
        <form action={bulkImportSkills} className="space-y-4">
          <input type="hidden" name="profile_id" value={profileId} />
          <div className="space-y-2">
            <Label htmlFor="skills">Skills JSON</Label>
            <textarea
              id="skills"
              name="skills"
              rows={6}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs font-mono"
              placeholder='[{"skillName":"React","category":"Frontend","proficiencyScale":4},{"skillName":"TypeScript","category":"Programming Languages","proficiencyScale":5}]'
            />
            <p className="text-xs text-muted-foreground">
              Paste a JSON array of skills. Each object should have <code>skillName</code>, optional <code>category</code>, <code>proficiencyScale</code> (1-5), and <code>yearsExperience</code>.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit"><Upload className="h-4 w-4 mr-2" />Import Skills</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
