import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];
const PUBLIC_PREFIXES = ["/auth/", ...AUTH_PAGES];

/**
 * Refreshes the Supabase session cookie on every request and makes optimistic
 * redirects: signed-out users go to /sign-in, signed-in users skip the auth pages.
 * The API still verifies every access token itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const redirect = (to: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = new URLSearchParams(params).toString();
    const res = NextResponse.redirect(url);
    // Carry refreshed cookies and cache headers over to the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "location") res.headers.set(key, value);
    });
    return res;
  };

  if (
    !signedIn &&
    !PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))
  ) {
    return redirect(
      "/sign-in",
      path === "/" ? {} : { next: path + request.nextUrl.search },
    );
  }
  if (signedIn && (path === "/" || AUTH_PAGES.includes(path))) {
    return redirect("/dashboard");
  }
  return response;
}
