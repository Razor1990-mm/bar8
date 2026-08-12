"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function toggleActive(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (user.id === id) throw new Error("You cannot deactivate yourself.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", id)
    .single();
  if (!profile) throw new Error("Member not found");

  const next = profile.status === "active" ? "inactive" : "active";
  const { error } = await supabase
    .from("profiles")
    .update({ status: next })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}
