'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Star, Calendar, Clock, CheckCircle2, XCircle, Globe, Briefcase, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createInterview } from '@/lib/actions/recruiter';
import { INTERVIEW_TYPES } from '@/lib/constants';
import type { CompatibilityScore } from '@/types';

interface InterviewerData {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  roleTitle: string | null;
  seniority: string | null;
  timezone: string | null;
  primaryExpertise: string | null;
  skills: { id: string; skillName: string; category: string | null; proficiencyScale: number | null; isPrimary: boolean }[];
  metrics: {
    totalInterviews: number;
    upcomingInterviews: number;
    interviewsToday: number;
    interviewsThisWeek: number;
    averageRating: number | null;
  } | null;
  isCalendarConnected: boolean;
  maxPerDay: number;
  maxPerWeek: number;
}

interface InterviewerSelectorProps {
  interviewers: InterviewerData[];
  positions: Array<{ id: string; title: string; department: string }>;
  candidates: Array<{ id: string; fullName: string; email: string }>;
}

export function InterviewerSelector({ interviewers, positions, candidates }: InterviewerSelectorProps) {
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCompatibility = useCallback(async (interviewerId: string, positionId: string) => {
    if (!interviewerId || !positionId) {
      setCompatibility(null);
      return;
    }
    setLoading(true);
    try {
      const { calculateCompatibilityScore } = await import('@/lib/services/skill-matching.service');
      const result = await calculateCompatibilityScore(interviewerId, positionId);
      if (result.success) {
        setCompatibility(result.data);
      }
    } catch (err) {
      console.error('Failed to calculate compatibility:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedInterviewerId && selectedPositionId) {
      fetchCompatibility(selectedInterviewerId, selectedPositionId);
    } else {
      setCompatibility(null);
    }
  }, [selectedInterviewerId, selectedPositionId, fetchCompatibility]);

  const filteredInterviewers = interviewers.filter((i) =>
    !searchQuery || i.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.skills.some((s) => s.skillName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const selectedInterviewer = interviewers.find((i) => i.id === selectedInterviewerId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <form action={createInterview} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="candidate_id">Candidate</Label>
            <select
              id="candidate_id"
              name="candidate_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select a candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position_id">Position</Label>
            <select
              id="position_id"
              name="position_id"
              required
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select a position...</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} - {p.department}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <Label>Interviewer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search interviewers by name or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs"
              />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredInterviewers.map((i) => {
                const initials = i.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                const isSelected = selectedInterviewerId === i.id;
                const primarySkills = i.skills.filter((s) => s.isPrimary).slice(0, 3);
                return (
                  <label
                    key={i.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interviewer_id"
                      value={i.id}
                      checked={isSelected}
                      onChange={() => setSelectedInterviewerId(i.id)}
                      required
                      className="mt-1"
                    />
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{i.fullName}</p>
                        {i.seniority && <span className="text-xs text-muted-foreground capitalize">({i.seniority})</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{i.roleTitle || i.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {primarySkills.map((s) => (
                          <Badge key={s.id} variant="default" className="text-xs">{s.skillName}</Badge>
                        ))}
                        {i.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{i.skills.length - 3}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {i.metrics?.totalInterviews ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {i.metrics?.upcomingInterviews ?? 0} upcoming
                        </span>
                        <span className="flex items-center gap-1">
                          {i.isCalendarConnected ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-amber-400" />
                          )}
                        </span>
                        {i.timezone && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {i.timezone.split('/').pop()?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {compatibility && isSelected && (
                      <div className="text-right shrink-0">
                        <div className="text-lg font-semibold text-accent">{compatibility.overall}%</div>
                        <div className="text-xs text-muted-foreground">Match</div>
                      </div>
                    )}
                  </label>
                );
              })}
              {filteredInterviewers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No interviewers found</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="interview_type">Interview Type</Label>
              <select
                id="interview_type"
                name="interview_type"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select type...</option>
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" name="duration" type="number" defaultValue={60} min={15} step={15} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (appears as position name for candidate)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="e.g. Frontend Developer - Technical Round" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Generate Booking Link</Button>
            <Link href="/recruiter/scheduling">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        {selectedInterviewer && compatibility ? (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h3 className="text-sm font-medium">Compatibility Score</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent">{compatibility.overall}%</div>
              <p className="text-xs text-muted-foreground mt-1">Overall Match</p>
            </div>

            <div className="space-y-2">
              {compatibility.skillMatches.map((match, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={match.match === 'full' ? 'text-emerald-400' : match.match === 'partial' ? 'text-amber-400' : 'text-muted-foreground'}>
                      {match.match === 'full' ? '✓' : match.match === 'partial' ? '⚠' : '✗'}
                    </span>
                    <span>{match.skillName}</span>
                  </div>
                  {match.interviewerProficiency && (
                    <Badge variant="secondary" className="text-xs">Lvl {match.interviewerProficiency}</Badge>
                  )}
                </div>
              ))}
              {compatibility.skillMatches.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">No position skills defined</p>
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Experience Match</span>
                <span>{compatibility.experienceMatch}%</span>
              </div>
            </div>
          </div>
        ) : selectedInterviewer ? (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Select a position to see compatibility</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Select an interviewer to see compatibility details</p>
          </div>
        )}

        {selectedInterviewer && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Interviewer Details</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Department</span>
              <span>{selectedInterviewer.department || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Timezone</span>
              <span>{selectedInterviewer.timezone || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Today&apos;s Workload</span>
              <span>{selectedInterviewer.metrics?.interviewsToday ?? 0}/{selectedInterviewer.maxPerDay}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly Capacity</span>
              <span>{selectedInterviewer.metrics?.interviewsThisWeek ?? 0}/{selectedInterviewer.maxPerWeek}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Calendar</span>
              <span className={selectedInterviewer.isCalendarConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {selectedInterviewer.isCalendarConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
