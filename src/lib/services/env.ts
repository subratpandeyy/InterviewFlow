const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
] as const;

const OPTIONAL_VARS = [
  'GOOGLE_CALENDAR_CLIENT_ID',
  'GOOGLE_CALENDAR_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_SECURE',
  'NEXT_PUBLIC_SITE_URL',
  'RESEND_API_KEY',
] as const;

type EnvVar = (typeof REQUIRED_VARS)[number] | (typeof OPTIONAL_VARS)[number];

const missing: string[] = [];

export function validateEnvironment(): void {
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
        'Please set these in your .env.local file.',
    );
  }
}

export function getEnvVar(key: EnvVar, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

export function getOptionalEnvVar(key: EnvVar, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}
