import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfigErrorMessage } from "@/lib/supabase/config";
import { getSessionClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || code.length > 2048) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url)
    );
  }

  try {
    const { error } = await (await getSessionClient()).auth.exchangeCodeForSession(
      code
    );

    if (error) {
      console.error("Supabase auth callback failed:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", request.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(getSupabaseConfigErrorMessage(error))}`,
        request.url
      )
    );
  }
}
