import type { ParseResult, ParsedResume, AIProvider } from './resume-parser.types';
import { extractPdfText, isPdf } from './pdf-parser.service';
import { extractDocxText } from './docx-parser.service';
import { extractSkills } from './skill-extractor.service';
import { extractContactInfo } from './contact-extractor.service';
import { extractExperience } from './experience-extractor.service';
import { extractEducation } from './education-extractor.service';
import { extractProjects } from './project-extractor.service';
import { extractCertifications } from './certification-extractor.service';
import { generateCandidateSummary } from './candidate-summary.service';
import { createAdmin } from '@/lib/supabase/admin';

let aiProvider: AIProvider | null = null;

export function registerAIProvider(provider: AIProvider): void {
  aiProvider = provider;
}

export function getAIProvider(): AIProvider | null {
  return aiProvider;
}

export async function parseResume(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    const text = await extractText(fileBuffer, mimeType, fileName);

    if (!text || text.trim().length < 20) {
      return {
        success: false,
        error: 'Resume appears to be empty or unreadable. Extracted text is too short.',
        duration_ms: Date.now() - startTime,
      };
    }

    const parsed = await runRuleBasedExtraction(text);

    if (aiProvider) {
      try {
        const enhanced = await aiProvider.enhance(parsed, text);
        Object.assign(parsed, enhanced);
        const summary = await aiProvider.generateSummary(parsed);
        parsed.summary = summary;
      } catch {
        // AI enhancement failed, continue with rule-based results
      }
    }

    if (!parsed.summary) {
      parsed.summary = generateCandidateSummary(parsed);
    }

    return {
      success: true,
      text,
      parsed,
      duration_ms: Date.now() - startTime,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return {
      success: false,
      error: message,
      duration_ms: Date.now() - startTime,
    };
  }
}

async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isPdfType = mimeType === 'application/pdf' || ext === 'pdf' || isPdf(buffer);
  const isDocxType = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx';

  if (isPdfType) {
    try {
      return await extractPdfText(buffer);
    } catch (err) {
      throw new Error(`PDF parsing failed: ${err instanceof Error ? err.message : 'Corrupted or invalid PDF'}`);
    }
  }

  if (isDocxType) {
    try {
      return await extractDocxText(buffer);
    } catch (err) {
      throw new Error(`DOCX parsing failed: ${err instanceof Error ? err.message : 'Corrupted or invalid DOCX'}`);
    }
  }

  throw new Error(`Unsupported file format: ${mimeType || ext}. Only PDF and DOCX are supported.`);
}

async function runRuleBasedExtraction(text: string): Promise<ParsedResume> {
  return {
    contact: extractContactInfo(text),
    skills: extractSkills(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    projects: extractProjects(text),
    certifications: extractCertifications(text),
  };
}

export async function parseResumeAndUpdateDb(
  resumeId: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdmin();

  try {
    await admin.from('resumes').update({ parsing_status: 'processing' }).eq('id', resumeId);

    const result = await parseResume(fileBuffer, mimeType, fileName);

    if (!result.success || !result.parsed) {
      await admin.from('resumes').update({
        parsing_status: 'failed',
        parsing_error: result.error || 'Parsing returned no data',
        parsed_at: new Date().toISOString(),
      }).eq('id', resumeId);
      return { success: false, error: result.error || 'Parsing failed' };
    }

    const parsedData = {
      contact: result.parsed.contact,
      skills: result.parsed.skills,
      experience: result.parsed.experience,
      education: result.parsed.education,
      projects: result.parsed.projects,
      certifications: result.parsed.certifications,
      summary: result.parsed.summary,
    };

    await admin.from('resumes').update({
      parsed_text: result.text,
      parsed_data: parsedData as any,
      parsing_status: 'completed',
      parsing_error: null,
      parsed_at: new Date().toISOString(),
    }).eq('id', resumeId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal parsing error';
    await admin.from('resumes').update({
      parsing_status: 'failed',
      parsing_error: message,
      parsed_at: new Date().toISOString(),
    }).eq('id', resumeId);
    return { success: false, error: message };
  }
}
