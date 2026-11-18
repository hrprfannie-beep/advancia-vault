export function readSupabaseAuthConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in."
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error("Supabase URL is invalid. Check NEXT_PUBLIC_SUPABASE_URL.");
  }

  return { url, anonKey };
}

export function getSupabaseConfigErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Supabase authentication is not configured."
}
