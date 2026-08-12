"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().email();

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

/** Sends the magic link. Success is intentionally indistinguishable from
 *  "email not registered" — we don't leak who is a member. */
export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Members are created by admin approval, never by logging in.
      shouldCreateUser: false,
    },
  });

  // "User not found" must read identically to success — enumeration guard.
  if (error && !/user.*not.*found|signups not allowed/i.test(error.message)) {
    return { status: "error", message: "Something went wrong — try again." };
  }
  return { status: "sent" };
}
