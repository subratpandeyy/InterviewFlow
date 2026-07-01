import type { ParsedCertification } from './resume-parser.types';

const CERT_KEYWORDS = /\b(certified|certification|certificate|credential|professional|accredited)\b/i;

const KNOWN_CERTIFICATIONS = [
  /AWS Certified Solutions Architect/i,
  /AWS Certified Developer/i,
  /AWS Certified SysOps/i,
  /Google Cloud Certified/i,
  /Google Professional (?:Data Engineer|Cloud Architect|Cloud Developer)/i,
  /Microsoft Certified/i,
  /Azure (?:Solutions Architect|Developer|Administrator|DevOps)/i,
  /Certified Kubernetes Administrator/i,
  /Certified Kubernetes Application Developer/i,
  /CISSP/i,
  /PMP/,
  /PRINCE2/i,
  /ITIL/i,
  /CompTIA/,
  /Cisco C(?:CNA|CNP|CIE)/i,
  /Oracle Certified/i,
  /Salesforce Certified/i,
  /Scrum (?:Master|Product Owner)/i,
  /SAFe/,
  /TOGAF/i,
  /CEH/,
  /OSCP/,
  /CFA/,
  /CPA/,
  /FRM/,
];

const DATE_REGEX = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.\s]*(\d{4})\b/gi;
const YEAR_REGEX = /\b(20\d{2})\b/;

export function extractCertifications(text: string): ParsedCertification[] {
  const certifications: ParsedCertification[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let inCertSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/\b(certifications|certificates|licenses|credentials|professional certifications)\b/i.test(line)) {
      inCertSection = true;
      continue;
    }

    if (inCertSection && /\b(experience|education|skills|projects|work|employment)\b/i.test(line) && certifications.length > 0) {
      break;
    }

    if (!inCertSection) {
      const knownMatch = KNOWN_CERTIFICATIONS.some(p => p.test(line));
      if (!knownMatch && !CERT_KEYWORDS.test(line)) continue;
    }

    const knownCert = KNOWN_CERTIFICATIONS.find(p => p.test(line));
    let name = knownCert ? knownCert.exec(line)![0] : null;

    if (!name && CERT_KEYWORDS.test(line)) {
      name = line.replace(DATE_REGEX, '').trim();
    }

    if (!name) continue;

    const dateMatch = line.match(DATE_REGEX) || line.match(YEAR_REGEX);
    let issueDate: string | undefined;
    let issuer: string | undefined;

    if (dateMatch) issueDate = dateMatch[0];

    const issuerMatch = line.match(/issued by\s+(.+?)(?:,|$|\.)/i) ||
      line.match(/from\s+(.+?)(?:,|$|\.)/i);
    if (issuerMatch) issuer = issuerMatch[1].trim();

    if (knownCert) {
      const issuerForCert = KNOWN_CERTIFICATIONS.find(p => p.test(line));
      if (issuerForCert) {
        const certStr = issuerForCert.exec(line)![0];
        if (certStr.startsWith('AWS')) issuer = 'Amazon Web Services';
        else if (certStr.startsWith('Google')) issuer = 'Google';
        else if (certStr.startsWith('Microsoft') || certStr.startsWith('Azure')) issuer = 'Microsoft';
        else if (certStr.startsWith('Certified Kubernetes')) issuer = 'CNCF';
        else if (certStr.startsWith('Cisco')) issuer = 'Cisco';
        else if (certStr.startsWith('Oracle')) issuer = 'Oracle';
        else if (certStr.startsWith('Salesforce')) issuer = 'Salesforce';
        else if (certStr.startsWith('Scrum') || certStr.startsWith('SAFe')) issuer = 'Scrum Alliance';
        else if (certStr === 'PMP' || certStr === 'CAPM') issuer = 'PMI';
        else if (certStr === 'ITIL') issuer = 'AXELOS';
        else if (certStr.startsWith('CompTIA')) issuer = 'CompTIA';
        else if (certStr.startsWith('CISSP')) issuer = 'ISC2';
        else if (certStr === 'CEH') issuer = 'EC-Council';
        else if (certStr === 'CFA') issuer = 'CFA Institute';
        else if (certStr === 'CPA') issuer = 'AICPA';
      }
    }

    certifications.push({
      name,
      issuer: issuer || undefined,
      issue_date: issueDate,
      credential_url: undefined,
      confidence: 85,
    });
  }

  return certifications;
}
