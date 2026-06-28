import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';
import { getTokensFromCode } from '@/lib/google/oauth';
import { getOAuth2Client } from '@/lib/google/oauth';
import { encryptToken } from '@/lib/google/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/interviewer/availability?error=google_auth_denied', request.url));
  }

  try {
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
      return NextResponse.redirect(new URL('/interviewer/availability?error=profile_not_found', request.url));
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      return NextResponse.redirect(new URL('/interviewer/availability?error=missing_tokens', request.url));
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const { google } = await import('googleapis');
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const { data: profileInfo } = await people.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses',
    });

    const calendarEmail = profileInfo.emailAddresses?.[0]?.value ?? '';

    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = encryptToken(tokens.refresh_token);

    const { error: upsertError } = await supabase.from('google_calendar_tokens').upsert({
      profile_id: profile.id,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: new Date(tokens.expiry_date).toISOString(),
      calendar_email: calendarEmail,
    }, { onConflict: 'profile_id' });

    if (upsertError) {
      return NextResponse.redirect(new URL('/interviewer/availability?error=save_failed', request.url));
    }

    return NextResponse.redirect(new URL('/interviewer/availability?connected=true', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/interviewer/availability?error=auth_failed', request.url));
  }
}
