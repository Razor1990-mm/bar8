"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Server actions for native in-app RSVP. Not used at all for events with a
// Luma URL — those keep the existing external ButtonLink (see
// src/lib/rsvp/provider.ts). Validation is mandatory here even though the
// client already validates shape, per .claude/rules/code-patterns.md.

const rsvpInputSchema = z.object({
  eventId: z.uuid(),
  slug: z.string().trim().min(1).max(150),
  carId: z.uuid().nullable(),
});

const declineInputSchema = z.object({
  eventId: z.uuid(),
  slug: z.string().trim().min(1).max(150),
});

export type RsvpActionResult = { error: string } | { error: null };

/** Verifies the car belongs to the viewer before it can be attached to an
 *  RSVP — never trust a carId from the client without this check. */
async function assertOwnCarOrNull(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  carId: string | null,
): Promise<boolean> {
  if (carId === null) return true;
  const { data, error } = await supabase
    .from("cars")
    .select("id")
    .eq("id", carId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/** RSVP going (or update the chosen car), idempotent via the
 *  UNIQUE(event_id, profile_id) constraint on event_attendance. */
export async function rsvpGoingAction(
  input: z.infer<typeof rsvpInputSchema>,
): Promise<RsvpActionResult> {
  const parsed = rsvpInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid RSVP." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const carOk = await assertOwnCarOrNull(supabase, user.id, parsed.data.carId);
  if (!carOk) return { error: "That car isn't in your garage." };

  const { error } = await supabase.from("event_attendance").upsert(
    {
      event_id: parsed.data.eventId,
      profile_id: user.id,
      car_id: parsed.data.carId,
      status: "going",
      source: "native",
    },
    { onConflict: "event_id,profile_id" },
  );
  if (error) return { error: "Couldn't save your RSVP." };

  revalidatePath(`/events/${parsed.data.slug}`);
  return { error: null };
}

/** Marks the viewer as declined — keeps the row per spec (idempotent,
 *  reversible via rsvpGoingAction). */
export async function declineAction(
  input: z.infer<typeof declineInputSchema>,
): Promise<RsvpActionResult> {
  const parsed = declineInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("event_attendance").upsert(
    {
      event_id: parsed.data.eventId,
      profile_id: user.id,
      status: "declined",
      source: "native",
    },
    { onConflict: "event_id,profile_id" },
  );
  if (error) return { error: "Couldn't update your RSVP." };

  revalidatePath(`/events/${parsed.data.slug}`);
  return { error: null };
}
