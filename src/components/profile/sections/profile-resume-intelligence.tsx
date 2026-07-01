'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Wrench,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  Sparkles,
  AlertTriangle,
  Clock,
  Activity,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import * as profileActions from '@/lib/actions/candidate-profile';
import type { Resume } from '@/types';

interface ResumeIntelligenceProps {
  resume: Resume;
  candidateId: string;
  onRefresh: () => void;
}

export function ResumeIntelligence({ resume, candidateId, onRefresh }: ResumeIntelligenceProps) {
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const parsedData = resume.parsed_data as Record<string, unknown> | null;
  const isProcessing = resume.parsing_status === 'processing';
  const isCompleted = resume.parsing_status === 'completed';
  const isFailed = resume.parsing_status === 'failed';

  // Poll for status changes when parsing is in progress
  useEffect(() => {
    if (resume.parsing_status !== 'pending' && resume.parsing_status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/resume/status?resumeId=${resume.id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success) return;
        const status = json.data.parsing_status;
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          onRefresh();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [resume.id, resume.parsing_status, onRefresh]);

  const handleTriggerParse = useCallback(async () => {
    setParsing(true);
    try {
      const formData = new FormData();
      formData.set('resume_id', resume.id);
      formData.set('candidate_id', candidateId);
      const result = await profileActions.triggerParse(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Parsing started');
        setTimeout(() => router.refresh(), 2000);
      }
    } catch {
      toast.error('Failed to trigger parsing');
    } finally {
      setParsing(false);
    }
  }, [resume.id, candidateId, router]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    try {
      const formData = new FormData();
      formData.set('candidate_id', candidateId);
      formData.set('resume_id', resume.id);
      const result: Record<string, unknown> = await profileActions.acceptParsedData(formData);
      if (result?.error) {
        toast.error(result.error as string);
      } else {
        toast.success('Extracted data accepted');
        onRefresh();
      }
    } catch {
      toast.error('Failed to accept data');
    } finally {
      setAccepting(false);
    }
  }, [resume.id, candidateId, onRefresh]);

  const handleReject = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.set('candidate_id', candidateId);
      formData.set('resume_id', resume.id);
      const result: Record<string, unknown> = await profileActions.rejectParsedData(formData);
      if (result?.error) {
        toast.error(result.error as string);
      } else {
        toast.success('Parsed data rejected');
        onRefresh();
      }
    } catch {
      toast.error('Failed to reject data');
    }
  }, [resume.id, candidateId, onRefresh]);

  if (!resume) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            <div>
              <CardTitle>Resume Intelligence</CardTitle>
              <CardDescription>
                AI-powered resume analysis and extraction
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing
              </Badge>
            )}
            {isCompleted && parsedData && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Parsed
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProcessing && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {isFailed && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-400">Parsing Failed</p>
                <p className="text-xs text-red-400/80 mt-1">
                  {resume.parsing_error || 'An unknown error occurred during parsing.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerParse}
                  disabled={parsing}
                  className="mt-3"
                >
                  {parsing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Retry Parsing
                </Button>
              </div>
            </div>
          </div>
        )}

        {isCompleted && !parsedData && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">No Data Extracted</h3>
            <p className="text-xs text-muted-foreground mb-4">The parser did not find any structured data</p>
            <Button variant="outline" size="sm" onClick={handleTriggerParse} disabled={parsing}>
              {parsing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Parse Again
            </Button>
          </div>
        )}

        {isCompleted && parsedData && (() => {
          const summary = parsedData.summary as Record<string, unknown> | undefined;
          const skills = parsedData.skills as Array<{ name: string; category?: string; confidence: number }> | undefined;
          const experience = parsedData.experience as Array<{ company: string; title: string; start_date?: string; end_date?: string; is_current?: boolean }> | undefined;
          const education = parsedData.education as Array<{ institution: string; degree?: string; field_of_study?: string }> | undefined;
          const projects = parsedData.projects as Array<{ name: string; description?: string }> | undefined;
          const certifications = parsedData.certifications as Array<{ name: string; issuer?: string }> | undefined;

          return (
          <>
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summary.primary_specialization ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Specialization</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{String(summary.primary_specialization)}</p>
                  </div>
                ) : null}
                {summary.total_experience_years ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Experience</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{Number(summary.total_experience_years)} years</p>
                  </div>
                ) : null}
                {summary.current_role ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current Role</p>
                    <p className="text-sm font-semibold text-foreground mt-1 truncate">{String(summary.current_role)}</p>
                  </div>
                ) : null}
                {summary.highest_qualification ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Education</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{String(summary.highest_qualification)}</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Key Strengths */}
            {summary?.key_strengths && Array.isArray(summary.key_strengths) && (
              <div className="flex flex-wrap gap-1.5">
                {(summary.key_strengths as string[]).map((strength, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                    <Sparkles className="h-3 w-3" /> {strength}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Skills */}
            {skills && skills.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">Extracted Skills ({skills.length})</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1">
                      {skill.name}
                      <span className="text-[9px] text-muted-foreground">{Math.round(skill.confidence)}%</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Experience */}
            {experience && experience.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">Extracted Experience ({experience.length})</h4>
                </div>
                <div className="space-y-2">
                  {experience.map((exp, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{exp.title}</p>
                        <p className="text-xs text-muted-foreground">{exp.company}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {exp.start_date || '?'} - {exp.is_current ? 'Present' : exp.end_date || '?'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education && education.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Extracted Education ({education.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {education.map((edu, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{edu.institution}</p>
                          <p className="text-xs text-muted-foreground">{edu.degree}{edu.field_of_study ? ` - ${edu.field_of_study}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Projects */}
            {projects && projects.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Extracted Projects ({projects.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {projects.map((proj, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{proj.name}</p>
                          {proj.description && <p className="text-xs text-muted-foreground line-clamp-1">{proj.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Extracted Certifications ({certifications.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {certifications.map((cert, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{cert.name}</p>
                          {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <Separator />
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={handleAccept}
                disabled={accepting}
                className="gap-1.5"
              >
                {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                Accept & Populate Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="gap-1.5"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTriggerParse}
                disabled={parsing}
                className="gap-1.5"
              >
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Re-parse
              </Button>
            </div>
          </>
          );
        })()}

        {/* File Info */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {resume.parsing_status}</span>
          {resume.parsed_at && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Parsed {new Date(resume.parsed_at).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
