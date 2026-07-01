export interface ParsedResume {
  contact: ContactInfo;
  skills: ParsedSkill[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  certifications: ParsedCertification[];
  summary?: CandidateSummary;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface ParsedSkill {
  name: string;
  category?: string;
  confidence: number;
  original: string;
}

export interface ParsedExperience {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  skills_used?: string[];
  location?: string;
  confidence: number;
}

export interface ParsedEducation {
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  grade?: string;
  confidence: number;
}

export interface ParsedProject {
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  start_date?: string;
  end_date?: string;
  confidence: number;
}

export interface ParsedCertification {
  name: string;
  issuer?: string;
  issue_date?: string;
  credential_url?: string;
  confidence: number;
}

export interface CandidateSummary {
  total_experience_years?: number;
  primary_specialization?: string;
  current_company?: string;
  current_role?: string;
  top_skills?: string[];
  highest_qualification?: string;
  key_strengths?: string[];
}

export interface ParseResult {
  success: boolean;
  text?: string;
  error?: string;
  parsed?: ParsedResume;
  duration_ms?: number;
}

export interface AIProvider {
  enhance(parsed: ParsedResume, rawText: string): Promise<ParsedResume>;
  generateSummary(parsed: ParsedResume): Promise<CandidateSummary>;
}
