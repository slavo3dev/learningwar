import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Supabase sent back an error (expired/invalid link, denied, etc.)
  if (error) {
    const reason = errorCode === "otp_expired" ? "link_expired" : "auth_callback_failed";
    return NextResponse.redirect(`${origin}/auth/sign-in?error=${reason}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";

      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_failed`);
}