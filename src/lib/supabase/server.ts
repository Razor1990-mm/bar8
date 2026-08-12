import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Request-scoped server client — runs RLS as the signed-in user.
 *  Use this for nearly everything. See .claude/rules/security.md. */
export async function createClient() {
  // generateStaticParams and other build-time contexts can't read cookies
  // (Next.js throws). Fall back to a cookie-less (anon-role) client there —
  // RLS still applies, and every accessor that runs at build time only
  // reads published/public rows anyway.
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }
  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore?.getAll() ?? [],
        setAll: (all) => {
          if (!cookieStore) return;
          try {
            all.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    },
  );
}

/** Loud config errors, never silent bypass (fail-closed rule). */
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/** True when Supabase env is present — lets pages fall back to fixtures
 *  in environments without a database (e.g. CI build). */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
