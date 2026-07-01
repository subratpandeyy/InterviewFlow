import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get('resumeId');
    if (!resumeId) {
      return NextResponse.json({ success: false, error: 'resumeId is required' }, { status: 400 });
    }

    const admin = createAdmin();
    const { data: resume, error } = await admin
      .from('resumes')
      .select('id, parsing_status, parsing_error, parsed_at, parsed_data')
      .eq('id', resumeId)
      .single();

    if (error || !resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: resume.id,
        parsing_status: resume.parsing_status,
        parsing_error: resume.parsing_error,
        parsed_at: resume.parsed_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
