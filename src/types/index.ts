export type Role = 'organization_admin' | 'recruiter' | 'interviewer';

export type CandidateStatus = 'applied' | 'screening' | 'scheduled' | 'interviewed' | 'selected' | 'rejected';

export type InterviewType = 'hr' | 'technical' | 'managerial' | 'final';

export type InterviewStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type BookingStatus = 'pending' | 'booked' | 'cancelled' | 'expired';

export type NotificationType = 'candidate_created' | 'interview_scheduled' | 'interview_rescheduled' | 'interview_cancelled' | 'reminder_24h' | 'reminder_1h';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'recruiter' | 'interviewer';
  token: string;
  expires_at: string;
  accepted_at?: string;
  status: InvitationStatus;
  revoked_at?: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone?: string;
  position_applied?: string;
  resume_url?: string;
  notes?: string;
  status: CandidateStatus;
  recruiter_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type PositionStatus = 'open' | 'closed' | 'on-hold' | 'filled';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';

export interface Position {
  id: string;
  organization_id: string;
  title: string;
  department: string;
  experience_required?: string;
  description?: string;
  employment_type?: EmploymentType;
  location?: string;
  skills?: string[];
  status: PositionStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AvailabilitySlot {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  organization_id: string;
  candidate_id: string;
  position_id: string;
  interviewer_id: string;
  recruiter_id: string;
  interview_type: InterviewType;
  duration_minutes: number;
  scheduled_at?: string;
  meeting_link?: string;
  meeting_provider?: MeetingProvider;
  calendar_event_id?: string;
  status: InterviewStatus;
  notes?: string;
  booking_token?: string;
  booking_expires_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Booking {
  id: string;
  interview_id: string;
  token: string;
  status: BookingStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  rating: number;
  communication: number;
  technical_skills: number;
  problem_solving: number;
  comments?: string;
  recommendation: 'hire' | 'maybe' | 'reject';
  created_at: string;
}

export interface InterviewerAvailability {
  id: string;
  interviewer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'blocked';
  created_at: string;
  updated_at: string;
}

export type MeetingProvider = 'google_meet' | 'zoom' | 'microsoft_teams' | 'custom';

export interface InterviewMeeting {
  id: string;
  interview_id: string;
  provider: MeetingProvider;
  meeting_url: string;
  created_at: string;
}

export interface InterviewFeedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  rating: number;
  communication: number;
  technical_skills: number;
  problem_solving: number;
  comments?: string;
  recommendation: 'hire' | 'maybe' | 'reject';
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}
