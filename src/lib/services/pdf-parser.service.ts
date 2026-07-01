import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

async function extractWithPdftotext(buffer: Buffer): Promise<string | null> {
  const tmp = path.join(os.tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    await writeFile(tmp, buffer);
    const { stdout } = await execFileAsync('pdftotext', [tmp, '-'], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
    return stdout || null;
  } catch {
    return null;
  } finally {
    unlink(tmp).catch(() => {});
  }
}

async function extractWithPdfjs(buffer: Buffer): Promise<string | null> {
  try {
    const { getDocument } = await import('pdfjs-dist');
    const loadingTask = getDocument({ data: buffer, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items as Array<{ str: string }>)
        .filter(item => 'str' in item)
        .map(item => item.str)
        .join(' ');
      pages.push(text);
    }
    await pdf.destroy();
    return pages.join('\n\n') || null;
  } catch {
    return null;
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const text = await extractWithPdftotext(buffer);
  if (text !== null) return text;
  const fallback = await extractWithPdfjs(buffer);
  if (fallback !== null) return fallback;
  throw new Error('Failed to extract PDF text: pdftotext and pdfjs-dist both failed');
}

export function isPdf(buffer: Buffer): boolean {
  return buffer.length > 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46;
}
