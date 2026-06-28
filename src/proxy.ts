import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedRoutes = ['/admin', '/recruiter', '/interviewer'];
const publicRoutes = ['/login', '/signup', '/'];

const ROLE_URL_MAP: Record<string, string> = {
  organization_admin: '/admin',
  recruiter: '/recruiter',
  interviewer: '/interviewer',
};

function redirectWithCookies(
  url: URL,
  source: NextResponse,
): NextResponse {
  const dest = NextResponse.redirect(url);
  for (const { name, value } of source.cookies.getAll()) {
    dest.cookies.set(name, value);
  }
  return dest;
}

export async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isPublic = publicRoutes.some((route) => pathname === route);
  const isBooking = pathname.startsWith('/book/');
  const isInvite = pathname.startsWith('/invite/');

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow booking and invite pages for everyone
  if (isBooking || isInvite) {
    return response;
  }

  // Protected route without a valid session → login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('redirect', pathname);
    return redirectWithCookies(loginUrl, response);
  }

  // Authenticated user on a public route → redirect to their dashboard
  if (isPublic && user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      const url = ROLE_URL_MAP[membership.role];
      if (url) {
        const dashUrl = new URL(url, origin);
        return redirectWithCookies(dashUrl, response);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
