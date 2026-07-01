import type { ParsedResume, CandidateSummary, ParsedExperience, ParsedEducation, ParsedSkill } from './resume-parser.types';

const SENIORITY_TITLES = {
  intern: 0,
  trainee: 0,
  junior: 1,
  'software engineer i': 1,
  'associate': 1,
  'mid-level': 3,
  'software engineer ii': 3,
  senior: 5,
  lead: 7,
  principal: 9,
  staff: 9,
  architect: 10,
  director: 12,
  vp: 15,
  'vice president': 15,
  cto: 20,
  'chief technology officer': 20,
};

const UNKNOWN_KEYWORDS = /\b(unknown|not specified|n\/a|na|none)\b/i;

function cleanValue(val: string | undefined | null): string | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(UNKNOWN_KEYWORDS, '').trim();
  return cleaned || undefined;
}

function estimateTotalExperience(experience: ParsedExperience[]): number | undefined {
  const datePattern = /\b(20\d{2})\b/;
  const years = experience.map(exp => {
    const startMatch = exp.start_date?.match(datePattern);
    const endMatch = exp.end_date?.match(datePattern);
    const start = startMatch ? parseInt(startMatch[1]) : undefined;
    const end = endMatch ? parseInt(endMatch[1]) : exp.is_current ? new Date().getFullYear() : undefined;
    if (start && end) return end - start;
    return 0;
  });

  const total = years.reduce((sum, y) => sum + y, 0);
  return total > 0 ? total : undefined;
}

function determinePrimarySpecialization(skills: ParsedSkill[], experience: ParsedExperience[]): string | undefined {
  const roleTitles = experience.map(e => e.title.toLowerCase());
  const skillCategories = skills.map(s => s.category?.toLowerCase()).filter(Boolean);

  const categoryCount = new Map<string, number>();
  for (const cat of skillCategories) {
    categoryCount.set(cat!, (categoryCount.get(cat!) || 0) + 1);
  }

  const roleKeywords = [
    { role: 'Frontend', keywords: ['frontend', 'front-end', 'front end', 'ui', 'react', 'angular', 'vue', 'css', 'html'] },
    { role: 'Backend', keywords: ['backend', 'back-end', 'back end', 'api', 'server', 'node.js', 'django', 'spring'] },
    { role: 'Full Stack', keywords: ['full stack', 'fullstack', 'full-stack'] },
    { role: 'DevOps', keywords: ['devops', 'sre', 'infrastructure', 'platform', 'cloud'] },
    { role: 'Data Science', keywords: ['data science', 'data scientist', 'machine learning', 'ml', 'ai'] },
    { role: 'Mobile', keywords: ['mobile', 'android', 'ios', 'flutter', 'react native'] },
    { role: 'Engineering', keywords: ['software engineer', 'software developer', 'sde'] },
  ];

  for (const { role, keywords } of roleKeywords) {
    for (const keyword of keywords) {
      for (const title of roleTitles) {
        if (title.includes(keyword)) return role;
      }
    }
  }

  const catEntries = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) return catEntries[0][0];

  return undefined;
}

function getCurrentRole(experience: ParsedExperience[]): { company?: string; role?: string } {
  const current = experience.find(e => e.is_current) || experience[0];
  if (!current) return {};
  return {
    company: cleanValue(current.company),
    role: cleanValue(current.title),
  };
}

function getTopSkills(skills: ParsedSkill[], count = 8): string[] {
  return skills.slice(0, count).map(s => s.name);
}

function determineHighestQualification(education: ParsedEducation[]): string | undefined {
  const degrees = education.map(e => e.degree?.toLowerCase()).filter(Boolean) as string[];
  if (degrees.some(d => d.includes('ph.d') || d.includes('doctorate') || d.includes('phd'))) return 'Ph.D.';
  if (degrees.some(d => d.includes('master') || d.startsWith('m.'))) return "Master's Degree";
  if (degrees.some(d => d.includes('bachelor') || d.startsWith('b.'))) return "Bachelor's Degree";
  if (degrees.some(d => d.includes('diploma'))) return 'Diploma';
  return undefined;
}

function determineKeyStrengths(skills: ParsedSkill[], experience: ParsedExperience[]): string[] {
  const strengths: string[] = [];

  const categorizedSkills = new Map<string, number>();
  for (const s of skills) {
    const cat = s.category || 'Other';
    categorizedSkills.set(cat, (categorizedSkills.get(cat) || 0) + 1);
  }

  if (categorizedSkills.has('Programming Languages')) strengths.push('Strong programming foundation');
  if (categorizedSkills.has('Frameworks')) strengths.push('Framework expertise');
  if (categorizedSkills.has('Cloud Platforms')) strengths.push('Cloud infrastructure experience');
  if (categorizedSkills.has('DevOps')) strengths.push('DevOps & CI/CD skills');
  if (categorizedSkills.has('AI/ML')) strengths.push('AI/ML capabilities');
  if (categorizedSkills.has('Databases')) strengths.push('Database proficiency');
  if (categorizedSkills.has('Mobile')) strengths.push('Mobile development');
  if (experience.length >= 3) strengths.push('Progressive career growth');
  if (skills.length > 15) strengths.push('Broad technical toolkit');

  return strengths.slice(0, 5);
}

export function generateCandidateSummary(parsed: ParsedResume): CandidateSummary {
  const summary: CandidateSummary = {};

  summary.total_experience_years = estimateTotalExperience(parsed.experience);
  summary.primary_specialization = determinePrimarySpecialization(parsed.skills, parsed.experience);

  const current = getCurrentRole(parsed.experience);
  summary.current_company = current.company;
  summary.current_role = current.role;

  summary.top_skills = getTopSkills(parsed.skills);
  summary.highest_qualification = determineHighestQualification(parsed.education);
  summary.key_strengths = determineKeyStrengths(parsed.skills, parsed.experience);

  return summary;
}
