import type { ParsedEducation } from './resume-parser.types';

const DEGREE_PATTERNS = [
  /\b(Bachelor(?:'s| of)?(?:\s+of)?\s+(?:Science|Arts|Engineering|Technology|Commerce|Business|Computer Applications|Education|Law|Medicine))\b/gi,
  /\b(Master(?:'s| of)?(?:\s+of)?\s+(?:Science|Arts|Engineering|Business Administration|Technology|Commerce|Computer Applications|Education|Law|Public Health))\b/gi,
  /\b(Ph\.?D\.?|Doctor(?:ate)?(?:\s+of)?\s+(?:Philosophy|Science|Engineering|Education|Medicine))\b/gi,
  /\b(B\.?Tech|B\.?E\.?|B\.?Sc\.?|B\.?A\.?|B\.?Com\.?|B\.?B\.?A\.?|B\.?C\.?A\.?)\b/gi,
  /\b(M\.?Tech|M\.?E\.?|M\.?Sc\.?|M\.?A\.?|M\.?Com\.?|M\.?B\.?A\.?|M\.?C\.?A\.?|M\.?Ed\.?)\b/gi,
  /\b(PhD|Doctorate|Post Graduate|Postgraduate|Graduate|Diploma|Certificate)\b/gi,
];

const UNIVERSITY_KEYWORDS = /\b(University|College|Institute|School|Academy|IIT|IIIT|NIT|MIT|Stanford|Harvard|Oxford|Cambridge|IISC)\b/i;

const GRADE_PATTERN = /\b(GPA|CGPA|Grade|Percentage)[:\s]*([\d.]+(?:\s*\/\s*[\d.]+)?)/gi;

export function extractEducation(text: string): ParsedEducation[] {
  const education: ParsedEducation[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let current: Partial<ParsedEducation> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/\b(experience|skills|projects|certifications|work)\b/i.test(line) && education.length > 0) {
      break;
    }

    const hasDegree = DEGREE_PATTERNS.some(p => p.test(line));
    const hasUniversity = UNIVERSITY_KEYWORDS.test(line);

    if ((hasDegree || hasUniversity) && line.length > 5) {
      if (current?.institution || current?.degree) {
        const edu = finalizeEducation(current);
        if (edu) education.push(edu);
      }

      current = {};
      const gradeMatch = line.match(GRADE_PATTERN);
      if (gradeMatch) current.grade = gradeMatch[0];

      if (hasUniversity) {
        current.institution = extractUniversity(line);
      }

      for (const pattern of DEGREE_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          current.degree = standardizeDegree(match[0].trim());
          break;
        }
      }

      if (current.degree && !current.institution) {
        current.institution = extractUniversity(line) || line.replace(/[,\d\s]+/g, ' ').trim();
      }

      const dateMatch = line.match(/(\d{4})\s*(?:-|–|to)\s*(\d{4}|present|current|now)/i);
      if (dateMatch) {
        current.start_date = dateMatch[1];
        current.end_date = dateMatch[2].match(/present|current|now/i) ? undefined : dateMatch[2];
        current.is_current = !!dateMatch[2].match(/present|current|now/i);
      } else {
        const singleYear = line.match(/(\d{4})/);
        if (singleYear) current.end_date = singleYear[1];
      }

      const fieldMatch = line.match(/\bin\s+(.+?)(?:\s*-|\s*–|\s*,|\s*\d|$)/i);
      if (fieldMatch && !fieldMatch[1].match(/^\d/)) {
        current.field_of_study = fieldMatch[1].trim();
      }
    } else if (current) {
      if (current.institution && !current.degree) {
        for (const pattern of DEGREE_PATTERNS) {
          pattern.lastIndex = 0;
          const match = pattern.exec(line);
          if (match) {
            current.degree = standardizeDegree(match[0].trim());
            break;
          }
        }
      }

      const gradeMatch = line.match(GRADE_PATTERN);
      if (gradeMatch && !current.grade) current.grade = gradeMatch[0];
    }
  }

  if (current?.institution || current?.degree) {
    const edu = finalizeEducation(current);
    if (edu) education.push(edu);
  }

  return education;
}

function extractUniversity(text: string): string {
  const match = text.match(UNIVERSITY_KEYWORDS);
  if (!match) return text.split(',')[0].trim();
  const idx = text.indexOf(match[0]);
  const end = text.indexOf(',', idx);
  return text.substring(0, end > 0 ? end : text.length).trim();
}

function standardizeDegree(degree: string): string {
  const map: Record<string, string> = {
    'b.tech': 'B.Tech',
    'b.e.': 'B.E.',
    'b.sc.': 'B.Sc.',
    'b.a.': 'B.A.',
    'b.com.': 'B.Com.',
    'b.b.a.': 'B.B.A.',
    'b.c.a.': 'B.C.A.',
    'm.tech': 'M.Tech',
    'm.e.': 'M.E.',
    'm.sc.': 'M.Sc.',
    'm.a.': 'M.A.',
    'm.com.': 'M.Com.',
    'm.b.a.': 'M.B.A.',
    'm.c.a.': 'M.C.A.',
    'ph.d.': 'Ph.D.',
    'phd': 'Ph.D.',
  };
  const lower = degree.toLowerCase().replace(/\./g, '.');
  return map[lower] || degree;
}

function finalizeEducation(edu: Partial<ParsedEducation>): ParsedEducation | undefined {
  if (!edu.institution && !edu.degree) return undefined;
  return {
    institution: edu.institution || 'Unknown Institution',
    degree: edu.degree || undefined,
    field_of_study: edu.field_of_study || undefined,
    start_date: edu.start_date,
    end_date: edu.end_date,
    is_current: edu.is_current || false,
    grade: edu.grade || undefined,
    confidence: 75,
  };
}
