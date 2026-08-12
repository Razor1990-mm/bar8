/** RLS integration tests against the LOCAL Supabase stack.
 *
 *  Skipped automatically when `supabase start` isn't running, so CI and
 *  plain `npm test` stay green without Docker. Run the stack + seed first:
 *    npx supabase start && node scripts/seed-local.mjs
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function stackRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${URL_}/rest/v1/`, {
      headers: { apikey: ANON },
      signal: AbortSignal.timeout(1500),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

const up = await stackRunning();
const d = describe.skipIf(!up);

function anonClient(): SupabaseClient {
  return createClient(URL_, ANON, { auth: { persistSession: false } });
}

async function memberClient(email: string): Promise<SupabaseClient> {
  // Local-only trick: mint a session via the service-role admin API's
  // generateLink, then exchange it. Simpler: sign in with an OTP link is
  // overkill — use admin to create a one-time password instead.
  const admin = createClient(URL_, SERVICE, {
    auth: { persistSession: false },
  });
  const password = "local-test-password-123";
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`seed user missing: ${email}`);
  await admin.auth.admin.updateUserById(user.id, { password });

  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

d("RLS: anonymous visitors", () => {
  it("cannot read the member directory", async () => {
    const { data } = await anonClient().from("profiles").select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot read membership applications (PII)", async () => {
    const { data } = await anonClient()
      .from("membership_applications")
      .select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("CAN submit a membership application", async () => {
    const { error } = await anonClient()
      .from("membership_applications")
      .insert({
        first_name: "Test",
        last_name: "Applicant",
        email: "applicant@example.com",
      });
    expect(error).toBeNull();
  });

  it("CAN read published events", async () => {
    const { data, error } = await anonClient()
      .from("events")
      .select("slug, title");
    expect(error).toBeNull();
    expect(data?.some((e) => e.slug === "skyline-half-moon-bay")).toBe(true);
  });
});

d("RLS: active members", () => {
  let ken: SupabaseClient;
  beforeAll(async () => {
    ken = await memberClient("ken@bar08.local");
  });

  it("can read the member directory", async () => {
    const { data, error } = await ken.from("profiles").select("slug");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(3);
  });

  it("cannot read membership applications", async () => {
    const { data } = await ken.from("membership_applications").select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("CANNOT grant themselves admin (privilege-escalation guard)", async () => {
    const {
      data: { user },
    } = await ken.auth.getUser();
    await ken.from("profiles").update({ is_admin: true }).eq("id", user!.id);
    const { data: after } = await ken
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single();
    expect(after?.is_admin).toBe(false);
  });

  it("CANNOT deactivate/reactivate their own status", async () => {
    const {
      data: { user },
    } = await ken.auth.getUser();
    await ken
      .from("profiles")
      .update({ status: "inactive" })
      .eq("id", user!.id);
    const { data: after } = await ken
      .from("profiles")
      .select("status")
      .eq("id", user!.id)
      .single();
    expect(after?.status).toBe("active");
  });

  it("can update their own bio", async () => {
    const {
      data: { user },
    } = await ken.auth.getUser();
    const { error } = await ken
      .from("profiles")
      .update({ bio: "test bio" })
      .eq("id", user!.id);
    expect(error).toBeNull();
    const { data: after } = await ken
      .from("profiles")
      .select("bio")
      .eq("id", user!.id)
      .single();
    expect(after?.bio).toBe("test bio");
  });

  it("cannot edit another member's profile", async () => {
    await ken.from("profiles").update({ bio: "vandalism" }).eq("slug", "raza");
    const { data } = await ken
      .from("profiles")
      .select("bio")
      .eq("slug", "raza")
      .single();
    expect(data?.bio).not.toBe("vandalism");
  });
});

d("RLS: admins", () => {
  it("can read membership applications", async () => {
    const raza = await memberClient("raza@bar08.local");
    const { error, data } = await raza
      .from("membership_applications")
      .select("id");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
