'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Award, ExternalLink, CalendarDays } from 'lucide-react';
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
import type { CandidateCertification } from '@/types';

function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PortalCertifications({ certifications, sessionToken }: { certifications: CandidateCertification[]; sessionToken: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateCertification | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('session_token', sessionToken);
      const result = editing
        ? await actions.updatePortalCertification(formData)
        : await actions.addPortalCertification(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Certification updated' : 'Certification added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch {
      toast.error('Failed to save certification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cert: CandidateCertification) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('session_token', sessionToken);
      formData.set('id', cert.id);
      const result = await actions.deletePortalCertification(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Certification removed');
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
              <CardTitle>Certifications ({certifications.length})</CardTitle>
              <CardDescription>Professional certifications and credentials</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No certifications</p>
              <p className="text-xs text-muted-foreground mb-4">Add your certifications and credentials</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Certification
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/20">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{cert.name}</h4>
                      {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {cert.issue_date && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(cert.issue_date)}
                          </span>
                        )}
                        {cert.expiry_date && (
                          <Badge variant="outline" className="text-[10px]">Expires {formatDate(cert.expiry_date)}</Badge>
                        )}
                      </div>
                      {cert.credential_url && (
                        <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline mt-1">
                          <ExternalLink className="h-3 w-3" /> View credential
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(cert); setShowAdd(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(cert)} disabled={isPending}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
            <DialogDescription>Enter the certification details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="name">Certification Name *</Label>
              <Input id="name" name="name" defaultValue={editing?.name || ''} required placeholder="e.g. AWS Certified Solutions Architect" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer">Issuing Organization</Label>
              <Input id="issuer" name="issuer" defaultValue={editing?.issuer || ''} placeholder="e.g. Amazon Web Services" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input id="issue_date" name="issue_date" type="date" defaultValue={editing?.issue_date || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input id="expiry_date" name="expiry_date" type="date" defaultValue={editing?.expiry_date || ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credential_url">Credential URL</Label>
              <Input id="credential_url" name="credential_url" type="url" defaultValue={editing?.credential_url || ''} placeholder="https://credential.example.com/..." />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Certification'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
