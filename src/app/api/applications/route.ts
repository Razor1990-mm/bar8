import { NextResponse } from "next/server";
import { applicationInsertSchema } from "@/lib/schemas/application";

/** Accepts membership applications. Until Supabase credentials exist this
 *  validates and returns 503 so the form's error state exercises honestly —
 *  no fake success, no dropped data pretending to be saved. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = applicationInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "Applications are not open yet." },
      { status: 503 },
    );
  }

  // TODO(supabase): insert into membership_applications with the anon
  // server client; send Resend confirmation.
  return NextResponse.json(
    { error: "Applications are not open yet." },
    { status: 503 },
  );
}
