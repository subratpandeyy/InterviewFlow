import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { parseResume } from '@/lib/services/resume-parser.service';
import { createParsingHistory } from '@/lib/services/resume-parsing-history.service';

function createActivityEntry(admin: ReturnType<typeof createAdmin>, params: {
  organization_id: string;
  profile_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
}) {
  return admin.from('audit_logs').insert({
    organization_id: params.organization_id,
    profile_id: params.profile_id || null,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    metadata: {},
  });
}

function createInAppNotification(admin: ReturnType<typeof createAdmin>, params: {
  organization_id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
}) {
  return admin.from('notifications').insert({
    organization_id: params.organization_id,
    recipient_id: params.recipient_id,
    type: params.type,
    title: params.title,
    message: params.message,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { resumeId } = await request.json();
    if (!resumeId) {
      return NextResponse.json({ success: false, error: 'resumeId is required' }, { status: 400 });
    }

    const admin = createAdmin();
    const { data: resume, error: resumeError } = await admin
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    if (resume.parsing_status === 'processing') {
      return NextResponse.json({ success: false, error: 'Resume is already being parsed' }, { status: 409 });
    }

    if (resume.parsing_status === 'completed') {
      return NextResponse.json({ success: true, message: 'Resume already parsed' });
    }

    await admin.from('resumes').update({ parsing_status: 'processing' }).eq('id', resumeId);

    const historyResult = await createParsingHistory({
      resume_id: resumeId,
      candidate_id: resume.candidate_id,
      organization_id: resume.organization_id,
      status: 'processing',
    });
    const historyId = historyResult.success ? historyResult.data.id : undefined;

    const fileUrl = resume.file_url;
    if (!fileUrl) {
      await admin.from('resumes').update({
        parsing_status: 'failed',
        parsing_error: 'No file URL available',
      }).eq('id', resumeId);
      return NextResponse.json({ success: false, error: 'No file URL' }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      await admin.from('resumes').update({
        parsing_status: 'failed',
        parsing_error: message,
      }).eq('id', resumeId);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    const ext = resume.file_type?.split('/').pop() || 'pdf';
    const result = await parseResume(fileBuffer, resume.file_type || 'application/octet-stream', 'resume.' + ext);

    if (!result.success || !result.parsed) {
      await admin.from('resumes').update({
        parsing_status: 'failed',
        parsing_error: result.error || 'Parsing returned no data',
        parsed_at: new Date().toISOString(),
      }).eq('id', resumeId);

      if (historyId) {
        await admin.from('resume_parsing_history').update({
          status: 'failed',
          success: false,
          error_message: result.error || null,
          parse_duration_ms: result.duration_ms || null,
        }).eq('id', historyId);
      }

      const { data: candidateFail } = await admin
        .from('candidates')
        .select('recruiter_id')
        .eq('id', resume.candidate_id)
        .single();
      if (candidateFail?.recruiter_id) {
        await createInAppNotification(admin, {
          organization_id: resume.organization_id,
          recipient_id: candidateFail.recruiter_id,
          type: 'resume_parsing_failed',
          title: 'Resume Parsing Failed',
          message: `Resume parsing failed: ${result.error || 'Unknown error'}`,
        });
      }

      await createActivityEntry(admin, {
        organization_id: resume.organization_id,
        entity_id: resume.candidate_id,
        action: 'failed',
        entity_type: 'resume_parsing',
      });

      return NextResponse.json({
        success: false,
        error: result.error,
        resumeId,
      });
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

    if (historyId) {
      await admin.from('resume_parsing_history').update({
        status: 'completed',
        success: true,
        parse_duration_ms: result.duration_ms || null,
        extracted_skills_count: result.parsed.skills.length,
      }).eq('id', historyId);
    }

    const { data: candidate } = await admin
      .from('candidates')
      .select('recruiter_id, organization_id')
      .eq('id', resume.candidate_id)
      .single();

    if (candidate?.recruiter_id) {
      await createInAppNotification(admin, {
        organization_id: candidate.organization_id,
        recipient_id: candidate.recruiter_id,
        type: 'resume_parsed',
        title: 'Resume Parsed',
        message: `Resume parsing completed. Found ${result.parsed.skills.length} skills, ${result.parsed.experience.length} experiences, ${result.parsed.education.length} educations.`,
      });
    }

    await createActivityEntry(admin, {
      organization_id: resume.organization_id,
      entity_id: resume.candidate_id,
      action: 'parsed',
      entity_type: 'resume',
    });
    await createActivityEntry(admin, {
      organization_id: resume.organization_id,
      entity_id: resume.candidate_id,
      action: 'extracted',
      entity_type: 'skills',
    });
    await createActivityEntry(admin, {
      organization_id: resume.organization_id,
      entity_id: resume.candidate_id,
      action: 'extracted',
      entity_type: 'experience',
    });

    return NextResponse.json({
      success: true,
      resumeId,
      data: parsedData,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
