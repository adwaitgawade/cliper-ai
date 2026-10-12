import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing route for links in Supabase auth emails (sign-up confirmation, password
 * recovery). Handles both the PKCE `code` redirect and `token_hash` links.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  let error = searchParams.get("error_description");
  if (!error) {
    const supabase = await createClient();
    if (code) {
      error =
        (await supabase.auth.exchangeCodeForSession(code)).error?.message ??
        null;
    } else if (tokenHash && type) {
      error =
        (await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error
          ?.message ?? null;
    } else {
      error = "The link is missing its token.";
    }
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error)}`, origin),
    );
  }
  return NextResponse.redirect(
    new URL(type === "recovery" ? "/reset-password" : next, origin),
  );
}

/** Only same-site relative paths, so the link can't redirect elsewhere. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}
