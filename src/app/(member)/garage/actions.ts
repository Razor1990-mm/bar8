"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { carInsertSchema, carUpdateSchema } from "@/lib/schemas/car";

// Server actions for garage CRUD. Server-side validation is mandatory even
// though CarForm already validates client-side with the same schemas — see
// .claude/rules/code-patterns.md § "Zod Schemas". Writes rely on RLS
// (cars_insert_own / cars_update_own / cars_delete_own, all scoped to
// profile_id = auth.uid()) as the real enforcement layer; the explicit
// .eq("profile_id", user.id) filters below are defense-in-depth for clarity,
// not a substitute for those policies.

export type CarActionResult = { error: string } | { error: null };

const carIdSchema = z.uuid();

export async function createCarAction(input: unknown): Promise<CarActionResult> {
  const parsed = carInsertSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid car." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("cars")
    .insert({ ...parsed.data, profile_id: user.id });
  if (error) return { error: "Couldn't save your car." };

  revalidatePath("/garage");
  redirect("/garage");
}

export async function updateCarAction(
  carId: string,
  input: unknown,
): Promise<CarActionResult> {
  const idParsed = carIdSchema.safeParse(carId);
  if (!idParsed.success) return { error: "Invalid car." };

  const parsed = carUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid car." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("cars")
    .update(parsed.data)
    .eq("id", idParsed.data)
    .eq("profile_id", user.id);
  if (error) return { error: "Couldn't save your car." };

  revalidatePath("/garage");
  redirect("/garage");
}

export async function deleteCarAction(carId: string): Promise<CarActionResult> {
  const idParsed = carIdSchema.safeParse(carId);
  if (!idParsed.success) return { error: "Invalid car." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("cars")
    .delete()
    .eq("id", idParsed.data)
    .eq("profile_id", user.id);
  if (error) return { error: "Couldn't delete your car." };

  revalidatePath("/garage");
  redirect("/garage");
}

/** Sets is_primary=true on this car and false on the member's others. Two
 *  updates in sequence, per spec — PostgREST has no client-side transaction
 *  here. */
export async function makePrimaryAction(carId: string): Promise<CarActionResult> {
  const idParsed = carIdSchema.safeParse(carId);
  if (!idParsed.success) return { error: "Invalid car." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error: clearError } = await supabase
    .from("cars")
    .update({ is_primary: false })
    .eq("profile_id", user.id)
    .neq("id", idParsed.data);
  if (clearError) return { error: "Couldn't update your garage." };

  const { error: setError } = await supabase
    .from("cars")
    .update({ is_primary: true })
    .eq("id", idParsed.data)
    .eq("profile_id", user.id);
  if (setError) return { error: "Couldn't update your garage." };

  revalidatePath("/garage");
  redirect("/garage");
}
