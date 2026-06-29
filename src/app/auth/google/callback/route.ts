import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { getTokensFromCode } from '@/lib/google/oauth';
import { encryptToken } from '@/lib/google/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('[google/callback] Missing authorization code or error returned', {
      error,
      hasCode: !!code,
    });
    return NextResponse.redirect(new URL('/interviewer/calendar?error=google_auth_denied', request.url));
  }

  try {
    const supabase = await createServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('[google/callback] getUser failed', {
        message: userError.message,
        status: userError.status,
      });
    }
    if (!user) {
      console.error('[google/callback] No authenticated user in session');
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[google/callback] Profile query failed', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
    }
    if (!profile) {
      console.error('[google/callback] No profile found for user', { userId: user.id });
      return NextResponse.redirect(new URL('/interviewer/calendar?error=profile_not_found', request.url));
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      console.error('[google/callback] Google returned incomplete token payload', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasExpiryDate: !!tokens.expiry_date,
      });
      return NextResponse.redirect(new URL('/interviewer/calendar?error=missing_tokens', request.url));
    }

    // Fetch the calendar email via the Google OAuth2 userinfo endpoint.
    // This works with any access token and does NOT require a People API scope.
    let calendarEmail = '';
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error('[google/callback] Userinfo endpoint returned error', {
          status: resp.status,
          statusText: resp.statusText,
          body,
        });
      } else {
        const userInfo = await resp.json();
        calendarEmail = userInfo.email ?? '';
      }
    } catch (userInfoErr) {
      console.error('[google/callback] Failed to fetch userinfo', {
        error: userInfoErr instanceof Error ? userInfoErr.message : String(userInfoErr),
      });
    }

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
      console.error('[google/callback] Token upsert failed', {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code,
      });
      return NextResponse.redirect(new URL('/interviewer/calendar?error=save_failed', request.url));
    }

    console.log('[google/callback] Calendar tokens stored successfully', {
      profileId: profile.id,
      calendarEmail,
    });

    return NextResponse.redirect(new URL('/interviewer/calendar?connected=true', request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[google/callback] Unhandled exception in OAuth callback', { message, stack });
    return NextResponse.redirect(
      new URL(
        `/interviewer/calendar?error=auth_failed&detail=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
