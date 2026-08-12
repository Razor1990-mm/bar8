"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

/** Approve: mark the application, create the auth user + active profile.
 *  Runs as the admin's own session — RLS's admin policies authorize it;
 *  auth.admin needs the service role, used server-only here. */
export async function approveApplication(formData: FormData) {
  const id = idSchema.parse(formData.get("id"));
  const supabase = await createClient();

  const {
    data: { user: admin },
  } = await supabase.auth.getUser();
  if (!admin) throw new Error("Not authenticated");

  const { data: app, error } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !app) throw new Error("Application not found");

  // Service-role client for auth.admin only (see .claude/rules/security.md);
  // gated above by the layout's is_admin check + RLS read succeeding.
  const { createClient: createAdminClient } = await import(
    "@supabase/supabase-js"
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) throw new Error("Service role not configured");
  const adminClient = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: userErr } =
    await adminClient.auth.admin.createUser({
      email: app.email,
      email_confirm: true,
    });
  if (userErr && !/already.*registered/i.test(userErr.message)) {
    throw new Error(`Could not create user: ${userErr.message}`);
  }
  const userId =
    created?.user?.id ??
    (await adminClient.auth.admin.listUsers()).data.users.find(
      (u) => u.email === app.email,
    )?.id;
  if (!userId) throw new Error("Could not resolve user id");

  const slugBase = `${app.first_name}-${app.last_name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  const { error: profileErr } = await adminClient.from("profiles").upsert({
    id: userId,
    first_name: app.first_name,
    last_name: app.last_name,
    slug: slugBase,
    city: app.city,
    status: "active",
    member_since: new Date().toISOString().slice(0, 10),
  });
  if (profileErr) throw new Error(`Profile failed: ${profileErr.message}`);

  await supabase
    .from("membership_applications")
    .update({
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // TODO(resend): invitation email with magic link.
  revalidatePath("/admin/applications");
}

export async function declineApplication(formData: FormData) {
  const id = idSchema.parse(formData.get("id"));
  const supabase = await createClient();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();
  if (!admin) throw new Error("Not authenticated");

  await supabase
    .from("membership_applications")
    .update({
      status: "declined",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/applications");
}
