"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function togglePublish(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", id)
    .single();
  if (!event) throw new Error("Event not found");

  const next = event.status === "published" ? "draft" : "published";
  const { error } = await supabase
    .from("events")
    .update({
      status: next,
      published_at: next === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  revalidatePath("/events");
}
