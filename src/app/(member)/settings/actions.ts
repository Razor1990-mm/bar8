"use server";

import { revalidatePath } from "next/cache";
import { profileUpdateSchema } from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

/** Members editing their own profile. `is_admin`/`status`/`slug` are
 *  excluded from profileUpdateSchema, so there's nothing privileged to
 *  strip here — but the update is still explicitly scoped to the viewer's
 *  own id (never trust RLS alone as the only place ownership is asserted). */
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const raw = {
    first_name: formData.get("first_name") || undefined,
    last_name: formData.get("last_name") || undefined,
    city: formData.get("city") || undefined,
    bio: formData.get("bio") || undefined,
    instagram: formData.get("instagram") || undefined,
    linkedin: formData.get("linkedin") || undefined,
  };

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your entries.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) return { status: "error", message: "Something went wrong — try again." };

  revalidatePath("/settings");
  revalidatePath("/home");
  return { status: "saved" };
}
