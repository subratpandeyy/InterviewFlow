import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL('/interviewer/calendar?error=profile_not_found', request.url));
  }

  return NextResponse.redirect(getAuthUrl(profile.id));
}