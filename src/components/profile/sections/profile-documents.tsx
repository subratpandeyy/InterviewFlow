'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, FileImage, FileArchive, File, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { DOCUMENT_TYPES } from '@/lib/constants';
import * as actions from '@/lib/actions/candidate-profile';
import type { CandidateDocument } from '@/types';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />;
  if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-blue-400" />;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="h-5 w-5 text-amber-400" />;
  return <File className="h-5 w-5 text-accent" />;
}

interface DocumentsSectionProps {
  documents: CandidateDocument[];
  candidateId: string;
}

export function DocumentsSection({ documents, candidateId }: DocumentsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('candidate_id', candidateId);
      const result = await actions.addDocument(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Document uploaded');
        setShowUpload(false);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: CandidateDocument) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', doc.id);
      formData.set('candidate_id', candidateId);
      const result = await actions.removeDocument(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Document removed');
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
              <CardTitle>Documents ({documents.length})</CardTitle>
              <CardDescription>Uploaded files and attachments</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" /> Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No documents uploaded</p>
              <p className="text-xs text-muted-foreground mb-4">Upload resumes, cover letters, certificates, and more</p>
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" /> Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  {getFileIcon(doc.mime_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name || 'Untitled'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] capitalize">{doc.document_type.replace('_', ' ')}</Badge>
                      <span>{formatDate(doc.created_at)}</span>
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.file_name || undefined}
                      className="size-6 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(doc)} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) setShowUpload(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a file for this candidate</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <select
                id="document_type"
                name="document_type"
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <input
                ref={fileInputRef}
                id="file"
                name="file"
                type="file"
                required
                className="flex w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={uploading} loadingText="Uploading...">
                Upload
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
