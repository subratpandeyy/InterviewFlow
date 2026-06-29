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

function shouldHandle(pathname: string): boolean {
  return protectedRoutes.some((r) => pathname.startsWith(r)) ||
    publicRoutes.some((r) => pathname === r) ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/auth/');
}

export async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  if (!shouldHandle(pathname)) {
    return NextResponse.next();
  }

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

  const isBooking = pathname.startsWith('/book/');
  const isInvite = pathname.startsWith('/invite/');
  const isPortal = pathname.startsWith('/portal/');
  const isAuth = pathname.startsWith('/auth/');
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isPublic = publicRoutes.some((route) => pathname === route);

  // Allow booking, invite, portal, and auth pages for everyone
  if (isBooking || isInvite || isPortal || isAuth) {
    return response;
  }

  // Fast local check first — avoids getUser() network call when there's no session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    if (isProtected) {
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl, response);
    }
    return response;
  }

  // Session exists — verify it server-side before making auth decisions
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isProtected) {
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl, response);
    }
    return response;
  }

  // Authenticated user on a public route → redirect to their dashboard
  if (isPublic) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

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
