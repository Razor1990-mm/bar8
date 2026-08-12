import { NextResponse } from "next/server";
import { applicationInsertSchema } from "@/lib/schemas/application";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** Public membership-application intake. Anon INSERT is allowed by RLS;
 *  nobody but admins can read the table back (it holds PII). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = applicationInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: "Applications are not open yet." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_applications")
    .insert(parsed.data);

  if (error) {
    console.error("application insert failed:", error.code, error.message);
    return NextResponse.json(
      { error: "Could not submit application." },
      { status: 500 },
    );
  }

  // TODO(resend): confirmation email once RESEND_API_KEY exists.
  return NextResponse.json({ ok: true }, { status: 201 });
}
