import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MEMBER_PREFIXES = ["/home", "/members", "/garage", "/settings"];
const ADMIN_PREFIX = "/admin";
// /events and /stories stay publicly readable (published content only via
// RLS); deep member data on those pages renders conditionally.

/** Session refresh + fail-closed gating for member/admin routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;
  const needsAuth =
    MEMBER_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (!url || !anonKey) {
    // No database configured: public routes work, gated routes fail CLOSED.
    if (needsAuth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        all.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() revalidates the JWT against Supabase — never trust getSession()
  // alone in middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}
