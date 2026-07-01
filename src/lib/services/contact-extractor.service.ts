import type { ContactInfo } from './resume-parser.types';

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i;
const PORTFOLIO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:[\w-]+\.)?(?:portfolio|devfolio|myportfolio|my\.work|pebble\.hq)[\w./-]*/i;
const WEBSITE_REGEX = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+[\w./-]*/gi;

const NAME_REGEXES = [
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
];

export function extractContactInfo(text: string): ContactInfo {
  const contact: ContactInfo = {};

  const emailMatch = text.match(EMAIL_REGEX);
  if (emailMatch) contact.email = emailMatch[0].toLowerCase();

  const phoneMatch = text.match(PHONE_REGEX);
  if (phoneMatch) contact.phone = phoneMatch[0];

  const linkedinMatch = text.match(LINKEDIN_REGEX);
  if (linkedinMatch) contact.linkedin = linkedinMatch[0].toLowerCase();

  const githubMatch = text.match(GITHUB_REGEX);
  if (githubMatch) contact.github = githubMatch[0].toLowerCase();

  const portfolioMatch = text.match(PORTFOLIO_REGEX);
  if (portfolioMatch) contact.portfolio = portfolioMatch[0];

  const websiteMatches = text.match(WEBSITE_REGEX);
  if (websiteMatches) {
    const filtered = websiteMatches.filter(w => {
      const lower = w.toLowerCase();
      return !lower.includes('linkedin') && !lower.includes('github') && !lower.includes('portfolio') && !w.includes('@');
    });
    if (filtered.length > 0) contact.website = filtered[0];
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (line.length > 2 && line.length < 100 && /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line) && !line.includes('@') && !line.includes('http') && !line.includes('.')) {
      contact.name = line;
      break;
    }
  }

  return contact;
}
