'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Wrench,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  FileUp,
  MessageSquare,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Upload,
  Download,
  ExternalLink,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  Send,
  UserPlus,
  Loader2,
  Eye,
  Paperclip,
  Building2,
  MapPin,
  Globe,
  CalendarClock,
  UserCircle,
  Mail,
  Phone,
  Sparkles,
  Quote,
  Star,
  Target,
  TrendingUp,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';
import { updateCandidateStatus } from '@/lib/actions/recruiter';
import { SkillsSection } from './sections/profile-skills';
import { ExperienceSection } from './sections/profile-experience';
import { EducationSection } from './sections/profile-education';
import { ProjectsSection } from './sections/profile-projects';
import { CertificationsSection } from './sections/profile-certifications';
import { DocumentsSection } from './sections/profile-documents';
import { NotesSection } from './sections/profile-notes';
import { InterviewsSection } from './sections/profile-interviews';
import { FeedbackSection } from './sections/profile-feedback';
import { ResumeIntelligence } from './sections/profile-resume-intelligence';
import * as profileActions from '@/lib/actions/candidate-profile';
import type { CandidateProfileData } from '@/lib/services/candidate-profile.service';

interface CandidateProfileClientProps {
  profileData: CandidateProfileData;
  currentUser: {
    profileId: string;
    fullName: string;
    email: string;
  };
  userRole: 'recruiter' | 'organization_admin';
}

type TabId = 'overview' | 'resume' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'documents' | 'interviews' | 'feedback' | 'notes' | 'activity';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'documents', label: 'Documents', icon: FileUp },
  { id: 'interviews', label: 'Interviews', icon: Calendar },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'notes', label: 'Notes', icon: Quote },
  { id: 'activity', label: 'Activity', icon: Activity },
];

const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  screening: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  scheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  interviewed: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  selected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const CANDIDATE_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateProfileClient({
  profileData,
  currentUser,
  userRole,
}: CandidateProfileClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isPending, startTransition] = useTransition();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [updatingResume, setUpdatingResume] = useState(false);

  const { candidate } = profileData;

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setStatusChanging(true);
    try {
      await updateCandidateStatus(candidate.id, newStatus);
      toast.success('Status updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  }, [candidate.id, router]);

  const handleResumeUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdatingResume(true);
    try {
      const formData = new FormData();
      formData.set('candidate_id', candidate.id);
      formData.set('file', file);
      const result = await profileActions.uploadResume(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Resume uploaded');
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to upload resume');
    } finally {
      setUpdatingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  }, [candidate.id, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/recruiter/candidates"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {candidate.full_name}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {candidate.current_title || candidate.position_applied || 'Candidate Profile'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
          <div className="space-y-4 sticky top-20">
            {/* Summary Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar size="lg" className="mb-3">
                    <AvatarImage src={candidate.resume_url || undefined} />
                    <AvatarFallback>{getInitials(candidate.full_name)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-semibold text-foreground">{candidate.full_name}</h2>
                  {candidate.current_title && (
                    <p className="text-sm text-muted-foreground">{candidate.current_title}</p>
                  )}
                  {candidate.current_company && (
                    <p className="text-xs text-muted-foreground">at {candidate.current_company}</p>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.preferred_timezone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span>{candidate.preferred_timezone}</span>
                    </div>
                  )}
                  {candidate.position_applied && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-3.5 w-3.5 shrink-0" />
                      <span>{candidate.position_applied}</span>
                    </div>
                  )}
                  {(candidate as any).linkedin_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <a href={(candidate as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground">LinkedIn</a>
                    </div>
                  )}
                  {(candidate as any).github_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <a href={(candidate as any).github_url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground">GitHub</a>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                  <select
                    value={candidate.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusChanging || userRole === 'organization_admin'}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_STYLES[candidate.status] || 'bg-muted text-muted-foreground'}`}
                  >
                    {CANDIDATE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <Separator className="my-4" />

                {/* Quick Info */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="text-foreground">{formatDate(candidate.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span className="text-foreground">{formatDate(candidate.updated_at)}</span>
                  </div>
                  {candidate.recruiter && (
                    <div className="flex justify-between">
                      <span>Recruiter</span>
                      <span className="text-foreground">{(candidate.recruiter as { full_name: string })?.full_name}</span>
                    </div>
                  )}
                  {candidate.source && (
                    <div className="flex justify-between">
                      <span>Source</span>
                      <span className="text-foreground capitalize">{candidate.source}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                <Link
                  href={`/recruiter/scheduling/new?candidate_id=${candidate.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <CalendarClock className="h-4 w-4" />
                  Schedule Interview
                </Link>
                <button
                  onClick={() => resumeInputRef.current?.click()}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
                >
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </button>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
                <button
                  onClick={() => setActiveTab('notes')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Note
                </button>
                <Link
                  href={`/recruiter/interviews?candidate=${candidate.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Interviews
                </Link>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            {profileData.statusHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Status History</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0">
                    {profileData.statusHistory.map((h, i) => (
                      <div key={h.id} className="flex gap-3 pb-3 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            i === 0 ? 'bg-accent' : 'bg-muted-foreground/30'
                          }`} />
                          {i < profileData.statusHistory.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground capitalize">
                            {h.new_status.replace('_', ' ')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(h.created_at)}
                          </p>
                          {(h as unknown as { changed_by_profile: { full_name: string } | null }).changed_by_profile && (
                            <p className="text-[11px] text-muted-foreground">
                              by {(h as unknown as { changed_by_profile: { full_name: string } }).changed_by_profile.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex overflow-x-auto gap-1 pb-px mb-6 -mx-1 px-1 scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <OverviewTab
                profileData={profileData}
                onTabChange={setActiveTab}
              />
            )}

            {activeTab === 'resume' && (
              <ResumeTab
                resumes={profileData.resumes}
                candidateId={candidate.id}
                onUpload={() => resumeInputRef.current?.click()}
                uploading={updatingResume}
              />
            )}

            {activeTab === 'skills' && (
              <SkillsSection
                skills={profileData.skills}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'experience' && (
              <ExperienceSection
                experience={profileData.experience}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'education' && (
              <EducationSection
                education={profileData.education}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsSection
                projects={profileData.projects}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'certifications' && (
              <CertificationsSection
                certifications={profileData.certifications}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsSection
                documents={profileData.documents}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'interviews' && (
              <InterviewsSection
                interviews={profileData.interviews}
                candidateId={candidate.id}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackSection feedbacks={profileData.interviews.flatMap(i => i.feedback.map(f => ({ ...f, interview_type: i.interview_type, scheduled_at: i.scheduled_at })))} />
            )}

            {activeTab === 'notes' && (
              <NotesSection
                notes={profileData.notes}
                candidateId={candidate.id}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTab activity={profileData.activity} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Overview Tab ---------- */
function OverviewTab({
  profileData,
  onTabChange,
}: {
  profileData: CandidateProfileData;
  onTabChange: (tab: TabId) => void;
}) {
  const { candidate, skills, experience, education, projects, certifications, interviews, notes } = profileData;

  return (
    <div className="space-y-6">
      {/* Candidate Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5" /> Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            {experience.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{experience.length} {experience.length === 1 ? 'position' : 'positions'}</p>
                <p className="text-xs text-muted-foreground">
                  Latest: {experience[0].title} @ {experience[0].company}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No experience recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" /> Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            {education.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{education.length} {education.length === 1 ? 'degree' : 'degrees'}</p>
                <p className="text-xs text-muted-foreground">
                  {education[0].degree} @ {education[0].institution}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No education recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5" /> Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skills.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{skills.length} {skills.length === 1 ? 'skill' : 'skills'}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {skills.slice(0, 4).map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">{s.skill_name}</Badge>
                  ))}
                  {skills.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">+{skills.length - 4}</Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills added</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interviews.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'}</p>
                <p className="text-xs text-muted-foreground">
                  {interviews.filter(i => i.status === 'completed').length} completed
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No interviews yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderGit2 className="h-3.5 w-3.5" /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
                <p className="text-xs text-muted-foreground">{projects[0].name}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No projects recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-3.5 w-3.5" /> Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certifications.length > 0 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">{certifications.length} {certifications.length === 1 ? 'certification' : 'certifications'}</p>
                <p className="text-xs text-muted-foreground">{certifications[0].name}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No certifications</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      {notes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Notes</CardTitle>
              <Button variant="ghost" size="xs" onClick={() => onTabChange('notes')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {notes.slice(0, 3).map((note) => (
              <div key={note.id} className="text-sm border-l-2 border-border pl-3">
                <p className="text-foreground line-clamp-2">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(note.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Experience Preview */}
      {experience.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Experience</CardTitle>
              <Button variant="ghost" size="xs" onClick={() => onTabChange('experience')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {experience.slice(0, 3).map((exp) => (
              <div key={exp.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{exp.title}</p>
                  <p className="text-xs text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.start_date ? formatDate(exp.start_date) : '?'} — {exp.is_current ? 'Present' : exp.end_date ? formatDate(exp.end_date) : '?'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Resume Tab ---------- */
function ResumeTab({
  resumes,
  candidateId,
  onUpload,
  uploading,
}: {
  resumes: CandidateProfileData['resumes'];
  candidateId: string;
  onUpload: () => void;
  uploading: boolean;
}) {
  const latestResume = resumes[0];
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resume</CardTitle>
              <CardDescription>Upload and manage candidate resumes</CardDescription>
            </div>
            <Button onClick={onUpload} disabled={uploading} size="sm">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : latestResume ? 'Replace Resume' : 'Upload Resume'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {latestResume ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
                <div className="w-12 h-14 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Resume ({latestResume.file_type?.split('/').pop()?.toUpperCase() || 'PDF'})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(latestResume.created_at)}
                  </p>
                  {latestResume.parsing_status && (
                    <Badge variant={latestResume.parsing_status === 'completed' ? 'success' : latestResume.parsing_status === 'failed' ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                      {latestResume.parsing_status === 'processing' && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                      {latestResume.parsing_status}
                    </Badge>
                  )}
                </div>
                {latestResume.file_url && (
                  <a
                    href={latestResume.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted hover:text-foreground transition-colors gap-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                )}
              </div>
              {latestResume.file_url && (
                <iframe
                  src={latestResume.file_url}
                  className="w-full h-[600px] rounded-lg border border-border"
                  title="Resume Preview"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No resume uploaded</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload a resume to get started</p>
              <Button onClick={onUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Resume
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {latestResume && (
        <ResumeIntelligence
          resume={latestResume}
          candidateId={candidateId}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

/* ---------- Activity Tab ---------- */
function ActivityTab({ activity }: { activity: CandidateProfileData['activity'] }) {
  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">No activity yet</h3>
          <p className="text-sm text-muted-foreground">Actions related to this candidate will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
        <CardDescription>All candidate-related activity in chronological order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {activity.map((a, i) => (
            <div key={a.id} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {getActivityIcon(a.action)}
                </div>
                {i < activity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.actor_name || 'System'}</span>
                  {' '}{formatAction(a.action, a.entity_type)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getActivityIcon(action: string): React.ReactNode {
  if (action.includes('create') || action.includes('upload')) return <Plus className="h-3.5 w-3.5 text-emerald-400" />;
  if (action.includes('update') || action.includes('edit')) return <Pencil className="h-3.5 w-3.5 text-amber-400" />;
  if (action.includes('delete') || action.includes('remove')) return <Trash2 className="h-3.5 w-3.5 text-red-400" />;
  if (action.includes('status')) return <TrendingUp className="h-3.5 w-3.5 text-blue-400" />;
  return <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatAction(action: string, entityType: string): string {
  const entity = entityType?.replace(/_/g, ' ') || 'item';
  const actionMap: Record<string, string> = {
    created: `added ${entity}`,
    updated: `updated ${entity}`,
    deleted: `removed ${entity}`,
    uploaded: `uploaded ${entity}`,
  };
  return actionMap[action] || `${action} ${entity}`;
}
