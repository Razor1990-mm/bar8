import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/** Next 16: middleware is now "proxy" (src/proxy.ts). Session refresh +
 *  fail-closed member/admin gating live in lib/supabase/session.ts. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets; run everywhere else so sessions stay refreshed.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|imagery|.*\\.png$).*)"],
};
