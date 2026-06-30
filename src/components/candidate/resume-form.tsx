'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { uploadPortalResume, deletePortalResume } from '@/lib/actions/candidate';
import type { Resume } from '@/types';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ResumeForm({ sessionToken, resumes }: { sessionToken: string; resumes: Resume[] }) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('session_token', sessionToken);
      const result = await uploadPortalResume(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Resume uploaded');
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const formData = new FormData();
      formData.set('session_token', sessionToken);
      formData.set('id', id);
      const result = await deletePortalResume(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Resume removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {resumes.length > 0 && (
        <div className="space-y-2">
          {resumes.map((resume) => (
            <div key={resume.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <FileText className="h-5 w-5 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {resume.file_url?.split('/').pop() || 'Resume'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] capitalize">{resume.parsing_status}</Badge>
                  <span>{formatDate(resume.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {resume.file_url && (
                  <a href={resume.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline shrink-0">View</a>
                )}
                <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(resume.id)} disabled={deletingId === resume.id}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleUpload} className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <input
            id="resume-file"
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            required
            className="flex w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
          />
        </div>
        <LoadingButton type="submit" loading={uploading} loadingText="Uploading...">
          <Upload className="h-4 w-4 mr-2" /> Upload
        </LoadingButton>
      </form>
    </div>
  );
}
