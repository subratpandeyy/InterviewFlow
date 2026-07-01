import type { ParsedExperience } from './resume-parser.types';

const DATE_REGEX = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.\s]*(\d{4})\b/gi;
const CURRENT_REGEX = /\b(present|current|now|ongoing)\b/gi;
const COMPANY_INDICATORS = /\b(at|@|company|inc|corp|ltd|limited|technologies|tech|solutions|services|group|industries|software|systems|consulting)\b/i;

function parseDate(text: string): string | undefined {
  const match = text.match(DATE_REGEX);
  if (match) return match[0];
  return undefined;
}

const SECTION_HEADER_BOUNDARIES = /\b(education|skills|projects|certifications|publications|awards|interests|references|summary|objective|profile)\b/i;

export function extractExperience(text: string): ParsedExperience[] {
  const experiences: ParsedExperience[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentExperience: Partial<ParsedExperience> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SECTION_HEADER_BOUNDARIES.test(line) && experiences.length > 0) break;

    const hasDate = DATE_REGEX.test(line) || CURRENT_REGEX.test(line);
    DATE_REGEX.lastIndex = 0;
    CURRENT_REGEX.lastIndex = 0;

    const hasCompanyIndicator = COMPANY_INDICATORS.test(line);
    COMPANY_INDICATORS.lastIndex = 0;

    if ((hasDate || (hasCompanyIndicator && line.length < 100)) && line.length > 5) {
      if (currentExperience?.title || currentExperience?.company) {
        const exp = finalizeExperience(currentExperience);
        if (exp) experiences.push(exp);
      }
      currentExperience = {};

      const dateStr = parseDate(line);
      const isCurrent = CURRENT_REGEX.test(line);
      CURRENT_REGEX.lastIndex = 0;

      let titlePart = line;
      if (dateStr) titlePart = titlePart.replace(dateStr, '').trim();
      titlePart = titlePart.replace(/[-–—]\s*/, '').trim();

      if (isCurrent) {
        titlePart = titlePart.replace(CURRENT_REGEX, '').trim();
      }

      const titleSplit = titlePart.split(/\s+(?:at|@|-|–|—|\||,)\s+/);
      if (titleSplit.length >= 2) {
        currentExperience.title = titleSplit[0].trim();
        currentExperience.company = titleSplit.slice(1).join(' ').trim();
      } else if (hasCompanyIndicator) {
        currentExperience.company = titlePart;
      } else {
        currentExperience.title = titlePart;
      }

      if (dateStr) {
        const dateParts = dateStr.match(/([A-Za-z]+)[.\s]*(\d{4})/i);
        if (dateParts) {
          if (!currentExperience.start_date) currentExperience.start_date = dateStr;
          else currentExperience.end_date = dateStr;
        }
      }

      if (isCurrent) currentExperience.is_current = true;
    } else if (currentExperience) {
      const dateStr = parseDate(line);
      if (dateStr) {
        if (!currentExperience.start_date) currentExperience.start_date = dateStr;
        else currentExperience.end_date = dateStr;
      }

      if (CURRENT_REGEX.test(line)) currentExperience.is_current = true;

      if (line.length > 15 && !line.startsWith('http') && !line.startsWith('www')) {
        if (!currentExperience.description) currentExperience.description = '';
        currentExperience.description += (currentExperience.description ? '\n' : '') + line;
      }
    }
  }

  if (currentExperience?.title || currentExperience?.company) {
    const exp = finalizeExperience(currentExperience);
    if (exp) experiences.push(exp);
  }

  return experiences;
}

function finalizeExperience(exp: Partial<ParsedExperience>): ParsedExperience | undefined {
  if (!exp.company && !exp.title) return undefined;
  return {
    company: exp.company || 'Unknown Company',
    title: exp.title || 'Unknown Position',
    start_date: exp.start_date,
    end_date: exp.is_current ? undefined : exp.end_date,
    is_current: exp.is_current || false,
    description: exp.description || undefined,
    skills_used: exp.skills_used,
    location: exp.location,
    confidence: 80,
  };
}
