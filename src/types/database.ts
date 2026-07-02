// ============================================================
// GENERATED DATABASE TYPES — InterviewFlow
// Matches supabase/migrations/00012_authoritative_schema.sql
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'organization_admin' | 'recruiter' | 'interviewer';
export type CandidateStatus = 'applied' | 'screening' | 'scheduled' | 'interviewed' | 'selected' | 'rejected';
export type InterviewType = 'hr' | 'technical' | 'managerial' | 'final';
export type InterviewStatus = 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type BookingStatus = 'pending' | 'booked' | 'cancelled' | 'expired';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type PositionStatus = 'open' | 'closed' | 'on-hold' | 'filled';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type MeetingProvider = 'google_meet' | 'zoom' | 'microsoft_teams' | 'custom';
export type AvailabilityStatus = 'available' | 'booked' | 'blocked';
export type FeedbackRecommendation = 'hire' | 'maybe' | 'reject';
export type NotificationType = 'candidate_created' | 'interview_scheduled' | 'interview_rescheduled' | 'interview_cancelled' | 'reminder_24h' | 'reminder_1h' | 'resume_parsed' | 'resume_parsing_failed';
export type SkillImportance = 'required' | 'preferred';
export type ActivityType = 'skill_added' | 'skill_updated' | 'skill_removed' | 'department_changed' | 'availability_changed' | 'calendar_connected' | 'calendar_disconnected' | 'interview_completed' | 'profile_updated' | 'expertise_changed';

// ----- TABLES -----

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  role_title: string | null;
  timezone: string | null;
  seniority: string | null;
  bio: string | null;
  phone: string | null;
  weekly_interview_limit: number | null;
  years_of_experience: number | null;
  primary_expertise: string | null;
  secondary_expertise: string | null;
  preferred_interview_types: Json;
  languages_spoken: Json;
  max_interviews_per_day: number | null;
  max_interviews_per_week: number | null;
  working_hours: Json;
  created_at: string;
  updated_at: string;
}

export interface DbOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface DbInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'recruiter' | 'interviewer';
  token: string;
  expires_at: string;
  accepted_at: string | null;
  status: InvitationStatus;
  revoked_at: string | null;
  created_at: string;
}

export interface DbCandidate {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position_applied: string | null;
  resume_url: string | null;
  notes: string | null;
  status: CandidateStatus;
  recruiter_id: string | null;
  deleted_at: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  email_verified_at: string | null;
  current_company: string | null;
  current_title: string | null;
  source: string | null;
  source_detail: string | null;
  salary_expectation: number | null;
  availability_date: string | null;
  referred_by: string | null;
  preferred_timezone: string | null;
  tags: Json;
  summary: Json;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPosition {
  id: string;
  organization_id: string;
  title: string;
  department: string;
  experience_required: string | null;
  description: string | null;
  employment_type: EmploymentType | null;
  location: string | null;
  skills: string[] | null;
  status: PositionStatus;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAvailabilitySlot {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbInterviewerAvailability {
  id: string;
  interviewer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AvailabilityStatus;
  created_at: string;
  updated_at: string;
}

export interface DbInterview {
  id: string;
  organization_id: string;
  candidate_id: string;
  position_id: string;
  interviewer_id: string;
  recruiter_id: string;
  interview_type: InterviewType;
  duration_minutes: number;
  scheduled_at: string | null;
  meeting_link: string | null;
  meeting_provider: MeetingProvider | null;
  calendar_event_id: string | null;
  status: InterviewStatus;
  notes: string | null;
  booking_token: string | null;
  booking_expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBooking {
  id: string;
  interview_id: string;
  token: string;
  status: BookingStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbFeedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  rating: number;
  communication: number;
  technical_skills: number;
  problem_solving: number;
  comments: string | null;
  recommendation: FeedbackRecommendation;
  created_at: string;
}

export interface DbInterviewFeedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  rating: number;
  communication: number;
  technical_skills: number;
  problem_solving: number;
  comments: string | null;
  recommendation: FeedbackRecommendation;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbInterviewMeeting {
  id: string;
  interview_id: string;
  provider: MeetingProvider;
  meeting_url: string;
  created_at: string;
}

export interface DbGoogleCalendarToken {
  id: string;
  profile_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_email: string;
  created_at: string;
  updated_at: string;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  scopes: string[] | null;
  calendar_id: string | null;
  calendar_name: string | null;
  calendar_timezone: string | null;
}

export interface DbNotification {
  id: string;
  organization_id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  organization_id: string | null;
  profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface DbCandidateSession {
  id: string;
  candidate_id: string;
  otp_code: string;
  otp_expires_at: string;
  otp_verified_at: string | null;
  session_token: string | null;
  session_expires_at: string | null;
  created_at: string;
}

export interface DbResume {
  id: string;
  candidate_id: string;
  organization_id: string;
  file_url: string | null;
  file_type: string | null;
  parsed_text: string | null;
  parsed_data: Json;
  parsing_status: 'pending' | 'processing' | 'completed' | 'failed';
  parsing_error: string | null;
  parsed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateSkill {
  id: string;
  candidate_id: string;
  organization_id: string;
  skill_name: string;
  category: string | null;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  years_experience: number | null;
  is_verified: boolean;
  source: string | null;
  confidence_score: number | null;
  extracted_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateExperience {
  id: string;
  candidate_id: string;
  organization_id: string;
  company: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  achievements: Json;
  skills_used: string[] | null;
  confidence_score: number | null;
  extracted_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateEducation {
  id: string;
  candidate_id: string;
  organization_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  grade: string | null;
  activities: string | null;
  confidence_score: number | null;
  extracted_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateProject {
  id: string;
  candidate_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  url: string | null;
  technologies: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  confidence_score: number | null;
  extracted_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateCertification {
  id: string;
  candidate_id: string;
  organization_id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  confidence_score: number | null;
  extracted_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateDocument {
  id: string;
  candidate_id: string;
  organization_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DbCandidateNote {
  id: string;
  candidate_id: string;
  organization_id: string;
  author_id: string | null;
  content: string;
  note_type: 'general' | 'feedback' | 'summary' | 'action_item';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCandidateStatusHistory {
  id: string;
  candidate_id: string;
  organization_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  change_reason: string | null;
  metadata: Json;
  created_at: string;
}

export interface DbResumeParsingHistory {
  id: string;
  resume_id: string;
  candidate_id: string;
  organization_id: string;
  parse_version: string;
  status: 'processing' | 'completed' | 'failed';
  success: boolean;
  error_message: string | null;
  parse_duration_ms: number | null;
  extracted_skills_count: number;
  metadata: Json;
  created_at: string;
}

export interface DbInterviewerSkill {
  id: string;
  profile_id: string;
  organization_id: string;
  skill_name: string;
  skill_name_normalized: string | null;
  category: string | null;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  proficiency_scale: number | null;
  years_experience: number | null;
  last_used: string | null;
  is_core: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbInterviewerMetric {
  id: string;
  profile_id: string;
  organization_id: string;
  total_interviews: number;
  completed_interviews: number;
  average_rating: number | null;
  feedback_completion_rate: number | null;
  on_time_percentage: number | null;
  period_start: string | null;
  period_end: string | null;
  average_candidate_rating: number | null;
  average_feedback_submission_time: number | null;
  interview_completion_rate: number | null;
  no_show_rate: number | null;
  reschedule_rate: number | null;
  average_interview_score: number | null;
  total_cancelled_interviews: number;
  total_no_show_interviews: number;
  total_rescheduled_interviews: number;
  interviews_today: number;
  interviews_this_week: number;
  interviews_this_month: number;
  upcoming_interviews: number;
  average_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbInterviewerDepartment {
  id: string;
  profile_id: string;
  organization_id: string;
  department: string;
  is_primary: boolean;
  created_at: string;
}

export interface DbSkillCategory {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPositionSkill {
  id: string;
  position_id: string;
  organization_id: string;
  skill_name: string;
  skill_name_normalized: string | null;
  importance: SkillImportance;
  proficiency_required: number | null;
  years_experience_required: number | null;
  category: string | null;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  organization_id: string;
  profile_id: string;
  activity_type: ActivityType;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

// Application-level types for matching
export interface SkillMatch {
  skillName: string;
  category: string | null;
  requiredProficiency: number | null;
  interviewerProficiency: number | null;
  match: 'full' | 'partial' | 'missing';
  yearsExperience: number | null;
  yearsRequired: number | null;
}

export interface CompatibilityScore {
  overall: number;
  skillMatches: SkillMatch[];
  experienceMatch: number;
  availabilityMatch: boolean;
  typeMatch: boolean;
}

// ----- DATABASE (for supabase-js type inference) -----
export interface Database {
  public: {
    Tables: {
      organizations: { Row: DbOrganization; Insert: Omit<DbOrganization, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbOrganization, 'id'>> };
      profiles: { Row: DbProfile; Insert: Omit<DbProfile, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbProfile, 'id'>> };
      organization_members: { Row: DbOrganizationMember; Insert: Omit<DbOrganizationMember, 'id' | 'created_at'>; Update: Partial<Omit<DbOrganizationMember, 'id'>> };
      invitations: { Row: DbInvitation; Insert: Omit<DbInvitation, 'id' | 'token' | 'expires_at' | 'accepted_at' | 'status' | 'revoked_at' | 'created_at'>; Update: Partial<Omit<DbInvitation, 'id'>> };
      candidates: { Row: DbCandidate; Insert: Omit<DbCandidate, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidate, 'id' | 'summary'>> };
      positions: { Row: DbPosition; Insert: Omit<DbPosition, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbPosition, 'id'>> };
      availability_slots: { Row: DbAvailabilitySlot; Insert: Omit<DbAvailabilitySlot, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbAvailabilitySlot, 'id'>> };
      interviewer_availability: { Row: DbInterviewerAvailability; Insert: Omit<DbInterviewerAvailability, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbInterviewerAvailability, 'id'>> };
      interviews: { Row: DbInterview; Insert: Omit<DbInterview, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbInterview, 'id'>> };
      bookings: { Row: DbBooking; Insert: Omit<DbBooking, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbBooking, 'id'>> };
      feedback: { Row: DbFeedback; Insert: Omit<DbFeedback, 'id' | 'created_at'>; Update: Partial<Omit<DbFeedback, 'id'>> };
      interview_feedback: { Row: DbInterviewFeedback; Insert: Omit<DbInterviewFeedback, 'id' | 'is_finalized' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbInterviewFeedback, 'id'>> };
      interview_meetings: { Row: DbInterviewMeeting; Insert: Omit<DbInterviewMeeting, 'id' | 'created_at'>; Update: Partial<Omit<DbInterviewMeeting, 'id'>> };
      google_calendar_tokens: { Row: DbGoogleCalendarToken; Insert: Omit<DbGoogleCalendarToken, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbGoogleCalendarToken, 'id'>> };
      notifications: { Row: DbNotification; Insert: Omit<DbNotification, 'id' | 'created_at'>; Update: Partial<Omit<DbNotification, 'id'>> };
      audit_logs: { Row: DbAuditLog; Insert: Omit<DbAuditLog, 'id' | 'created_at'>; Update: Partial<Omit<DbAuditLog, 'id'>> };
      candidate_sessions: { Row: DbCandidateSession; Insert: Omit<DbCandidateSession, 'id' | 'created_at'>; Update: Partial<Omit<DbCandidateSession, 'id'>> };
      resumes: { Row: DbResume; Insert: Omit<DbResume, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbResume, 'id'>> };
      candidate_skills: { Row: DbCandidateSkill; Insert: Omit<DbCandidateSkill, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateSkill, 'id'>> };
      candidate_experience: { Row: DbCandidateExperience; Insert: Omit<DbCandidateExperience, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateExperience, 'id'>> };
      candidate_education: { Row: DbCandidateEducation; Insert: Omit<DbCandidateEducation, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateEducation, 'id'>> };
      candidate_projects: { Row: DbCandidateProject; Insert: Omit<DbCandidateProject, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateProject, 'id'>> };
      candidate_certifications: { Row: DbCandidateCertification; Insert: Omit<DbCandidateCertification, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateCertification, 'id'>> };
      candidate_documents: { Row: DbCandidateDocument; Insert: Omit<DbCandidateDocument, 'id' | 'created_at'>; Update: Partial<Omit<DbCandidateDocument, 'id'>> };
      candidate_notes: { Row: DbCandidateNote; Insert: Omit<DbCandidateNote, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbCandidateNote, 'id'>> };
      candidate_status_history: { Row: DbCandidateStatusHistory; Insert: Omit<DbCandidateStatusHistory, 'id' | 'created_at'>; Update: Partial<Omit<DbCandidateStatusHistory, 'id'>> };
      resume_parsing_history: { Row: DbResumeParsingHistory; Insert: Omit<DbResumeParsingHistory, 'id' | 'created_at'>; Update: Partial<Omit<DbResumeParsingHistory, 'id'>> };
      interviewer_skills: { Row: DbInterviewerSkill; Insert: Omit<DbInterviewerSkill, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbInterviewerSkill, 'id'>> };
      interviewer_metrics: { Row: DbInterviewerMetric; Insert: Omit<DbInterviewerMetric, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbInterviewerMetric, 'id'>> };
      interviewer_departments: { Row: DbInterviewerDepartment; Insert: Omit<DbInterviewerDepartment, 'id' | 'created_at'>; Update: Partial<Omit<DbInterviewerDepartment, 'id'>> };
      skill_categories: { Row: DbSkillCategory; Insert: Omit<DbSkillCategory, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DbSkillCategory, 'id'>> };
      position_skills: { Row: DbPositionSkill; Insert: Omit<DbPositionSkill, 'id' | 'created_at'>; Update: Partial<Omit<DbPositionSkill, 'id'>> };
      activity_log: { Row: DbActivityLog; Insert: Omit<DbActivityLog, 'id' | 'created_at'>; Update: Partial<Omit<DbActivityLog, 'id'>> };
    };
    Functions: {
      get_user_organization_ids: { Args: Record<string, never>; Returns: string[] };
      generate_otp: { Args: Record<string, never>; Returns: string };
      check_availability_overlap: { Args: { p_interviewer_id: string; p_date: string; p_start_time: string; p_end_time: string; p_exclude_id?: string }; Returns: boolean };
      get_available_slots: { Args: { p_interviewer_id: string; p_date: string; p_duration_minutes?: number }; Returns: { slot_start: string; slot_end: string }[] };
    };
  };
}
