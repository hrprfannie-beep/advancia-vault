import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseAuthConfig } from "@/lib/supabase/config";

export async function getSessionClient() {
  const { url, anonKey } = readSupabaseAuthConfig();

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
