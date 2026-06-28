import { createAdmin } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/google/encryption';
import { refreshAccessToken } from '@/lib/google/oauth';
import { encryptToken } from '@/lib/google/encryption';

export interface GoogleTokenData {
  accessToken: string;
  refreshToken: string;
  calendarEmail: string;
}

export async function getInterviewerTokens(interviewerId: string): Promise<GoogleTokenData | null> {
  const admin = createAdmin();

  const { data: tokenRow } = await admin
    .from('google_calendar_tokens')
    .select('*')
    .eq('profile_id', interviewerId)
    .single();

  if (!tokenRow) return null;

  let accessToken = decryptToken(tokenRow.access_token);
  const refreshToken = decryptToken(tokenRow.refresh_token);
  const tokenExpiresAt = new Date(tokenRow.token_expires_at).getTime();

  if (Date.now() >= tokenExpiresAt) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      const encryptedAccess = encryptToken(refreshed.access_token);
      const newExpiry = refreshed.expiry_date ? new Date(refreshed.expiry_date).toISOString() : tokenRow.token_expires_at;

      await admin
        .from('google_calendar_tokens')
        .update({
          access_token: encryptedAccess,
          token_expires_at: newExpiry,
        })
        .eq('profile_id', interviewerId);
    }
  }

  return {
    accessToken,
    refreshToken,
    calendarEmail: tokenRow.calendar_email,
  };
}
