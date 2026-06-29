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
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter' },
    { label: 'Candidates', href: '/recruiter/candidates' },
    { label: 'Positions', href: '/recruiter/positions' },
    { label: 'Scheduling', href: '/recruiter/scheduling' },
    { label: 'Interviews', href: '/recruiter/interviews' },
  ],
  interviewer: [
    { label: 'Dashboard', href: '/interviewer' },
    { label: 'Upcoming', href: '/interviewer/upcoming' },
    { label: 'Availability', href: '/interviewer/availability' },
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

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
