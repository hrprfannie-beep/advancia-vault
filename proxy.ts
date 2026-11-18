import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseAuthConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { url, anonKey } = readSupabaseAuthConfig();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.getClaims();
  if (error) {
    console.error("Supabase session refresh failed:", error.message);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
