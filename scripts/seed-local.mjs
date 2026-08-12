/** Seeds the LOCAL Supabase stack with the three real members and the
 *  Skyline drive. Idempotent (upserts by known ids). Run:
 *    node scripts/seed-local.mjs
 *
 *  PII rule (landmines L3): local-only emails use @bar08.local — real
 *  member emails never appear in the repo. Real emails get set when the
 *  cloud project invites real accounts.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MEMBERS = [
  {
    email: "raza@bar08.local",
    first_name: "Raza",
    last_name: "Rafiq",
    slug: "raza",
    city: "Mountain View",
    role_title: "Founder",
    is_admin: true,
    cars: [
      {
        year: 2017,
        make: "Audi",
        model: "R8",
        trim: "V10 Plus",
        exterior_color: "Matte Camo Green",
        is_primary: true,
      },
      { year: 2009, make: "Porsche", model: "911", is_primary: false },
    ],
  },
  {
    email: "ken@bar08.local",
    first_name: "Ken",
    last_name: "Toy",
    slug: "ken",
    is_admin: false,
    cars: [],
  },
  {
    email: "mike@bar08.local",
    first_name: "Mike",
    last_name: "Hong",
    slug: "mike",
    is_admin: false,
    cars: [],
  },
];

async function ensureUser(email) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (!error) return created.user.id;
  // Already exists → find it.
  const { data } = await supabase.auth.admin.listUsers();
  const existing = data.users.find((u) => u.email === email);
  if (!existing)
    throw new Error(`cannot create or find ${email}: ${error.message}`);
  return existing.id;
}

const memberIds = {};
for (const m of MEMBERS) {
  const id = await ensureUser(m.email);
  memberIds[m.slug] = id;

  const { error: pErr } = await supabase.from("profiles").upsert({
    id,
    first_name: m.first_name,
    last_name: m.last_name,
    slug: m.slug,
    city: m.city ?? null,
    role_title: m.role_title ?? null,
    status: "active",
    is_admin: m.is_admin,
    member_since: "2026-01-01",
  });
  if (pErr) throw new Error(`profile ${m.slug}: ${pErr.message}`);

  for (const [i, car] of m.cars.entries()) {
    const { error: cErr } = await supabase.from("cars").upsert(
      {
        profile_id: id,
        year: car.year,
        make: car.make,
        model: car.model,
        trim: car.trim ?? null,
        exterior_color: car.exterior_color ?? null,
        is_primary: car.is_primary,
        ownership: "current",
        sort_order: i,
      },
      { onConflict: undefined },
    );
    if (cErr) throw new Error(`car for ${m.slug}: ${cErr.message}`);
  }
  console.log(`✓ ${m.first_name} ${m.last_name} (${m.status ?? "active"})`);
}

// Skyline drive
const { data: event, error: eErr } = await supabase
  .from("events")
  .upsert(
    {
      slug: "skyline-half-moon-bay",
      title: "Skyline → Alice's → Half Moon Bay",
      subtitle: "The classic loop, before the fog burns off.",
      category: "drive",
      starts_at: "2026-09-12T13:45:00Z", // 6:45 AM PT
      meet_time: "6:45 AM",
      depart_time: "7:00 AM",
      start_location_label: "Alice's Restaurant, Woodside",
      route_summary:
        "Woodside → Skyline Blvd → Alice's → HWY 84 → Half Moon Bay",
      distance_miles: 74,
      est_drive_minutes: 150,
      capacity: 25,
      status: "published",
      published_at: new Date("2026-08-01").toISOString(),
    },
    { onConflict: "slug" },
  )
  .select()
  .single();
if (eErr) throw new Error(`event: ${eErr.message}`);

const schedule = [
  ["6:45 AM", "Meet"],
  ["7:00 AM", "Depart"],
  ["8:30 AM", "Coffee at Alice's"],
  ["9:15 AM", "Down 84 to the coast"],
  ["10:00 AM", "Breakfast, Half Moon Bay"],
];
await supabase.from("event_schedule_items").delete().eq("event_id", event.id);
for (const [i, [time_label, label]] of schedule.entries()) {
  await supabase
    .from("event_schedule_items")
    .insert({ event_id: event.id, time_label, label, sort_order: i });
}

// Attendance: Raza brings the R8; Ken and Mike TBD car
const { data: razaCars } = await supabase
  .from("cars")
  .select("id, model")
  .eq("profile_id", memberIds.raza)
  .eq("model", "R8");
for (const slug of ["raza", "ken", "mike"]) {
  const { error: aErr } = await supabase.from("event_attendance").upsert(
    {
      event_id: event.id,
      profile_id: memberIds[slug],
      car_id: slug === "raza" ? (razaCars?.[0]?.id ?? null) : null,
      status: "going",
      source: "admin",
    },
    { onConflict: "event_id,profile_id" },
  );
  if (aErr) throw new Error(`attendance ${slug}: ${aErr.message}`);
}

console.log("✓ Skyline drive + schedule + attendance");
console.log("Seed complete.");
