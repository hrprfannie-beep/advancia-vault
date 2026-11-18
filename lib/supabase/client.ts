import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseAuthConfig } from "@/lib/supabase/config";

const config = (() => {
  try {
    return readSupabaseAuthConfig();
  } catch {
    return null;
  }
})();

const SUPABASE_URL = config?.url ?? "";
const SUPABASE_ANON_KEY = config?.anonKey ?? "";

export function isSupabaseBrowserConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const supabaseBrowser = () => {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in."
    );
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};
