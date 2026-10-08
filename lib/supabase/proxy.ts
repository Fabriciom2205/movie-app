import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths a logged-out visitor may see. /api/health is called by the scheduled
// health check, which has no login.
const PUBLIC_PATHS = ["/login", "/api/health"];

// Runs before every page (see /proxy.ts). Refreshes the login cookie and
// sends logged-out visitors to /login. This is a convenience check only:
// the real protection for data is Row Level Security in the database.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Don't put code between createServerClient and getClaims() (Supabase's
  // advice): getClaims() is what refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Exact path or a sub-path: "/login" and "/login/..." but not "/loginx".
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Must return supabaseResponse as-is: it carries the refreshed cookies.
  // Returning a new response would drop them and log the user out.
  return supabaseResponse;
}
