export const CANDIDATE_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export const INTERVIEW_TYPES = [
  { value: 'hr', label: 'HR Round' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'managerial', label: 'Managerial Round' },
  { value: 'final', label: 'Final Round' },
] as const;

export const INTERVIEW_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
] as const;

export const POSITION_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'filled', label: 'Filled' },
] as const;

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
] as const;

export const INVITATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const DASHBOARD_ROUTES: Record<string, { label: string; href: string }[]> = {
  organization_admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Positions', href: '/admin/positions' },
    { label: 'Interviewers', href: '/admin/interviewers' },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter' },
    { label: 'Candidates', href: '/recruiter/candidates' },
    { label: 'Positions', href: '/recruiter/positions' },
    { label: 'Scheduling', href: '/recruiter/scheduling' },
    { label: 'Interviews', href: '/recruiter/interviews' },
    { label: 'Interviewers', href: '/recruiter/interviewers' },
  ],
  interviewer: [
    { label: 'Dashboard', href: '/interviewer' },
    { label: 'Profile', href: '/interviewer/profile' },
    { label: 'Upcoming', href: '/interviewer/upcoming' },
    { label: 'Calendar', href: '/interviewer/calendar' },
    { label: 'Feedback', href: '/interviewer/feedback' },
  ],
};

export const MEETING_PROVIDERS = [
  { value: 'google_meet', label: 'Google Meet', urlPattern: 'https://meet.google.com/' },
  { value: 'zoom', label: 'Zoom', urlPattern: 'https://zoom.us/j/' },
  { value: 'microsoft_teams', label: 'Microsoft Teams', urlPattern: 'https://teams.microsoft.com/l/meetup-join/' },
  { value: 'custom', label: 'Custom Link', urlPattern: '' },
] as const;

export const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'blocked', label: 'Blocked' },
] as const;

export const SKILL_PROFICIENCY = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
] as const;

export const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'summary', label: 'Summary' },
  { value: 'action_item', label: 'Action Item' },
] as const;

export const CANDIDATE_SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'referral', label: 'Referral' },
  { value: 'company_website', label: 'Company Website' },
  { value: 'recruitment_agency', label: 'Recruitment Agency' },
  { value: 'job_fair', label: 'Job Fair' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'direct_application', label: 'Direct Application' },
  { value: 'other', label: 'Other' },
] as const;

export const EMPLOYMENT_TYPES_EXPERIENCE = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'self-employed', label: 'Self-Employed' },
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const INTERVIEW_TYPE_OPTIONS = [
  { value: 'Technical', label: 'Technical' },
  { value: 'HR', label: 'HR' },
  { value: 'System Design', label: 'System Design' },
  { value: 'Coding', label: 'Coding' },
  { value: 'Behavioral', label: 'Behavioral' },
  { value: 'Managerial', label: 'Managerial' },
  { value: 'Leadership', label: 'Leadership' },
  { value: 'Final Round', label: 'Final Round' },
] as const;

export const SKILL_CATEGORIES = [
  { value: 'Programming Languages', label: 'Programming Languages' },
  { value: 'Frontend', label: 'Frontend' },
  { value: 'Backend', label: 'Backend' },
  { value: 'Mobile', label: 'Mobile' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Cloud', label: 'Cloud' },
  { value: 'Databases', label: 'Databases' },
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Testing', label: 'Testing' },
  { value: 'Security', label: 'Security' },
  { value: 'System Design', label: 'System Design' },
  { value: 'Soft Skills', label: 'Soft Skills' },
] as const;

export const SENIORITY_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'staff', label: 'Staff' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_level', label: 'C-Level' },
] as const;

export const SKILL_IMPORTANCE = [
  { value: 'required', label: 'Required' },
  { value: 'preferred', label: 'Preferred' },
] as const;

export const PROFICIENCY_SCALE = [
  { value: 1, label: '1 - Familiar' },
  { value: 2, label: '2 - Working Knowledge' },
  { value: 3, label: '3 - Proficient' },
  { value: 4, label: '4 - Advanced' },
  { value: 5, label: '5 - Expert' },
] as const;

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese',
  'Korean', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Italian',
  'Dutch', 'Turkish', 'Vietnamese', 'Thai', 'Swedish', 'Polish',
] as const;
