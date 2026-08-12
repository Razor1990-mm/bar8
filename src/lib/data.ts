/** Supabase-backed data accessors.
 *
 *  Same signatures as src/lib/fixtures.ts (the fixture-accessor pattern —
 *  see .claude/rules/code-patterns.md). When Supabase env isn't configured
 *  (e.g. CI build without a database), every accessor falls back to the
 *  fixtures implementation so pages and generateStaticParams never fail to
 *  build. When configured, accessors query Supabase and map rows into the
 *  same TS shapes fixtures.ts exports.
 *
 *  Server-only: createClient() imports next/headers transitively. Every
 *  caller of this module must be a Server Component / Route Handler /
 *  Server Action.
 */

import { createClient, supabaseConfigured } from "./supabase/server";
import * as fixtures from "./fixtures";
import type { Member, Car, ScheduleItem, ClubEvent, StorySummary, Story } from "./fixtures";

export type { Member, Car, ScheduleItem, ClubEvent, StorySummary, Story } from "./fixtures";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_LIMIT = 100;
const SIGNED_URL_EXPIRY_SECONDS = 3600;

/* -- Pure helpers (exported for unit testing without mocking Supabase) --- */

/** "2017 Audi R8 V10 Plus" — year, make, model, trim, skipping falsy parts. */
export function buildCarLabel(
  year: number | null,
  make: string,
  model: string,
  trim: string | null,
): string {
  return [year, make, model, trim].filter(Boolean).join(" ");
}

/** "Saturday, September 12" in the given IANA timezone. */
export function formatDateLabel(
  isoString: string,
  timezone: string = "America/Los_Angeles",
): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(isoString));
}

/** "SEP 12" in the given IANA timezone. */
export function formatShortDateLabel(
  isoString: string,
  timezone: string = "America/Los_Angeles",
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).formatToParts(new Date(isoString));
  const month = parts.find((p) => p.type === "month")?.value.toUpperCase() ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${month} ${day}`;
}

/** "October 10, 2026" — used for story dates. */
export function formatStoryDateLabel(
  isoString: string,
  timezone: string = "America/Los_Angeles",
): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(isoString));
}

/** True when the event's start time is in the past relative to `now`. */
export function computeIsPast(startsAtIso: string, now: Date = new Date()): boolean {
  return new Date(startsAtIso).getTime() < now.getTime();
}

/** Groups a flat list of cars into {label, count} pairs, "Make Model" label. */
export function computeCarBreakdown(
  cars: { make: string; model: string }[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of cars) {
    const label = [c.make, c.model].filter(Boolean).join(" ") || "Other";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

/* -- Row → shape mappers -------------------------------------------------- */

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  city: string | null;
  role_title: string | null;
  bio: string | null;
  member_since: string | null;
};

type CarRow = {
  id: string;
  profile_id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  exterior_color: string | null;
  is_primary: boolean;
  ownership: "current" | "former";
  sort_order: number;
};

function mapCarRow(row: CarRow): Car {
  return {
    id: row.id,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    exteriorColor: row.exterior_color,
    isPrimary: row.is_primary,
    ownership: row.ownership,
    label: buildCarLabel(row.year, row.make, row.model, row.trim),
  };
}

function mapMemberRow(row: ProfileRow, carRows: CarRow[], avatarUrl: string | null): Member {
  return {
    id: row.id,
    slug: row.slug,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    city: row.city,
    role: row.role_title,
    memberSince: row.member_since ? String(new Date(row.member_since).getFullYear()) : "2026",
    bio: row.bio,
    avatarUrl,
    cars: carRows.map(mapCarRow),
  };
}

/** Short-expiry signed URL for a private-bucket object; null if no path. */
async function resolveSignedUrl(
  supabase: SupabaseServerClient,
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

const PROFILE_COLUMNS =
  "id, first_name, last_name, slug, city, role_title, bio, avatar_path, member_since";
const CAR_COLUMNS =
  "id, profile_id, year, make, model, trim, exterior_color, is_primary, ownership, sort_order";
const EVENT_COLUMNS =
  "id, slug, title, subtitle, category, starts_at, timezone, meet_time, depart_time, " +
  "start_location_label, route_summary, distance_miles, est_drive_minutes, capacity, " +
  "luma_event_url, whatsapp_chat_url, hero_photo_path, status";

type ProfileRowWithAvatar = ProfileRow & { avatar_path: string | null };

async function mapProfileRows(
  supabase: SupabaseServerClient,
  profiles: ProfileRowWithAvatar[],
  cars: CarRow[],
): Promise<Member[]> {
  return Promise.all(
    profiles.map(async (p) => {
      const avatarUrl = await resolveSignedUrl(supabase, "avatars", p.avatar_path);
      return mapMemberRow(
        p,
        cars.filter((c) => c.profile_id === p.id).sort((a, b) => a.sort_order - b.sort_order),
        avatarUrl,
      );
    }),
  );
}

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: ClubEvent["category"];
  starts_at: string;
  timezone: string | null;
  meet_time: string | null;
  depart_time: string | null;
  start_location_label: string | null;
  route_summary: string | null;
  distance_miles: number | null;
  est_drive_minutes: number | null;
  capacity: number | null;
  luma_event_url: string | null;
  whatsapp_chat_url: string | null;
  hero_photo_path: string | null;
  status: string;
};

type ScheduleRow = { event_id: string; time_label: string; label: string; sort_order: number };
type AttendanceRow = {
  event_id: string;
  profile_id: string;
  car_id: string | null;
  status: string;
};

async function mapEventRow(
  supabase: SupabaseServerClient,
  row: EventRow,
  scheduleRows: ScheduleRow[],
  attendanceRows: AttendanceRow[],
): Promise<ClubEvent> {
  const timezone = row.timezone ?? "America/Los_Angeles";
  const heroUrl = await resolveSignedUrl(supabase, "events", row.hero_photo_path);
  const schedule: ScheduleItem[] = scheduleRows
    .filter((s) => s.event_id === row.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ time: s.time_label, label: s.label }));
  const attendance = attendanceRows
    .filter((a) => a.event_id === row.id && a.status === "going")
    .map((a) => ({ memberId: a.profile_id, carId: a.car_id }));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    dateLabel: formatDateLabel(row.starts_at, timezone),
    shortDateLabel: formatShortDateLabel(row.starts_at, timezone),
    meetTime: row.meet_time,
    departTime: row.depart_time,
    startLocation: row.start_location_label,
    routeSummary: row.route_summary,
    distanceMiles: row.distance_miles,
    estDriveMinutes: row.est_drive_minutes,
    capacity: row.capacity,
    lumaUrl: row.luma_event_url,
    whatsappUrl: row.whatsapp_chat_url,
    schedule,
    attendance,
    isPast: computeIsPast(row.starts_at),
    heroUrl,
  };
}

/* -- Accessors ------------------------------------------------------------ */

export async function getMembers(): Promise<Member[]> {
  if (!supabaseConfigured()) return fixtures.getMembers();

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .limit(MAX_LIMIT);
  if (error) throw error;

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select(CAR_COLUMNS)
    .order("sort_order", { ascending: true })
    .limit(MAX_LIMIT);
  if (carsError) throw carsError;

  return mapProfileRows(
    supabase,
    (profiles ?? []) as ProfileRowWithAvatar[],
    (cars ?? []) as CarRow[],
  );
}

export async function getMember(slug: string): Promise<Member | null> {
  if (!supabaseConfigured()) return fixtures.getMember(slug);

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("profile_id", (profile as ProfileRowWithAvatar).id)
    .order("sort_order", { ascending: true })
    .limit(MAX_LIMIT);
  if (carsError) throw carsError;

  const [member] = await mapProfileRows(
    supabase,
    [profile as ProfileRowWithAvatar],
    (cars ?? []) as CarRow[],
  );
  return member ?? null;
}

async function fetchPublishedEventRows(supabase: SupabaseServerClient) {
  const { data: events, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(MAX_LIMIT);
  if (error) throw error;
  return (events ?? []) as unknown as EventRow[];
}

async function mapEventRows(
  supabase: SupabaseServerClient,
  eventRows: EventRow[],
): Promise<ClubEvent[]> {
  if (eventRows.length === 0) return [];
  const ids = eventRows.map((e) => e.id);

  const { data: schedule, error: scheduleError } = await supabase
    .from("event_schedule_items")
    .select("event_id, time_label, label, sort_order")
    .in("event_id", ids)
    .limit(MAX_LIMIT);
  if (scheduleError) throw scheduleError;

  const { data: attendance, error: attendanceError } = await supabase
    .from("event_attendance")
    .select("event_id, profile_id, car_id, status")
    .in("event_id", ids)
    .eq("status", "going")
    .limit(MAX_LIMIT);
  if (attendanceError) throw attendanceError;

  return Promise.all(
    eventRows.map((row) =>
      mapEventRow(
        supabase,
        row,
        (schedule ?? []) as ScheduleRow[],
        (attendance ?? []) as AttendanceRow[],
      ),
    ),
  );
}

export async function getEvents(): Promise<ClubEvent[]> {
  if (!supabaseConfigured()) return fixtures.getEvents();
  const supabase = await createClient();
  const eventRows = await fetchPublishedEventRows(supabase);
  return mapEventRows(supabase, eventRows);
}

export async function getEvent(slug: string): Promise<ClubEvent | null> {
  if (!supabaseConfigured()) return fixtures.getEvent(slug);
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!event) return null;
  const [mapped] = await mapEventRows(supabase, [event as unknown as EventRow]);
  return mapped ?? null;
}

export async function getNextEvent(): Promise<ClubEvent | null> {
  if (!supabaseConfigured()) return fixtures.getNextEvent();
  const events = await getEvents();
  return events.find((e) => !e.isPast) ?? null;
}

/** Resolve an event's attendance into member + chosen-car pairs. */
export async function getEventAttendees(
  event: ClubEvent,
): Promise<{ member: Member; car: Car | null }[]> {
  if (!supabaseConfigured()) return fixtures.getEventAttendees(event);
  if (event.attendance.length === 0) return [];

  const memberIds = event.attendance.map((a) => a.memberId);
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", memberIds)
    .limit(MAX_LIMIT);
  if (error) throw error;

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select(CAR_COLUMNS)
    .in("profile_id", memberIds)
    .order("sort_order", { ascending: true })
    .limit(MAX_LIMIT);
  if (carsError) throw carsError;

  const members = await mapProfileRows(
    supabase,
    (profiles ?? []) as ProfileRowWithAvatar[],
    (cars ?? []) as CarRow[],
  );

  return event.attendance
    .map((a) => {
      const member = members.find((m) => m.id === a.memberId);
      if (!member) return null;
      const car = member.cars.find((c) => c.id === a.carId) ?? null;
      return { member, car };
    })
    .filter((x): x is { member: Member; car: Car | null } => x !== null);
}

/* -- Stories --------------------------------------------------------------- */

type StoryRow = {
  id: string;
  event_id: string | null;
  slug: string;
  title: string;
  dek: string | null;
  body: string | null;
  hero_photo_path: string | null;
  published_at: string | null;
};

const STORY_COLUMNS = "id, event_id, slug, title, dek, body, hero_photo_path, published_at";

async function computeStoryEventStats(
  supabase: SupabaseServerClient,
  eventId: string | null,
): Promise<{ attendeeCount: number; carBreakdown: { label: string; count: number }[] }> {
  if (!eventId) return { attendeeCount: 0, carBreakdown: [] };

  const { data: attendance, error } = await supabase
    .from("event_attendance")
    .select("profile_id, car_id, status")
    .eq("event_id", eventId)
    .eq("status", "going")
    .limit(MAX_LIMIT);
  if (error) throw error;

  const rows = (attendance ?? []) as { profile_id: string; car_id: string | null }[];
  const attendeeCount = rows.length;
  const carIds = rows.map((r) => r.car_id).filter((id): id is string => Boolean(id));
  if (carIds.length === 0) return { attendeeCount, carBreakdown: [] };

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select("id, make, model")
    .in("id", carIds)
    .limit(MAX_LIMIT);
  if (carsError) throw carsError;

  return {
    attendeeCount,
    carBreakdown: computeCarBreakdown((cars ?? []) as { make: string; model: string }[]),
  };
}

async function mapStoryRow(supabase: SupabaseServerClient, row: StoryRow): Promise<Story> {
  const heroUrl = await resolveSignedUrl(supabase, "stories", row.hero_photo_path);
  const dateSourceIso =
    row.published_at ??
    (row.event_id
      ? ((
          await supabase
            .from("events")
            .select("starts_at")
            .eq("id", row.event_id)
            .maybeSingle()
        ).data as { starts_at: string } | null)?.starts_at ?? null
      : null);
  const { attendeeCount, carBreakdown } = await computeStoryEventStats(supabase, row.event_id);

  return {
    slug: row.slug,
    title: row.title,
    dateLabel: dateSourceIso ? formatStoryDateLabel(dateSourceIso) : "",
    dek: row.dek ?? "",
    stats: [],
    heroUrl,
    body: row.body ? row.body.split(/\n\n+/) : [],
    attendeeCount,
    carBreakdown,
  };
}

export async function getStories(): Promise<StorySummary[]> {
  if (!supabaseConfigured()) return fixtures.getStories();
  const supabase = await createClient();
  const { data: stories, error } = await supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(MAX_LIMIT);
  if (error) throw error;

  const rows = (stories ?? []) as StoryRow[];
  const mapped = await Promise.all(rows.map((row) => mapStoryRow(supabase, row)));
  return mapped.map(({ slug, title, dateLabel, dek, stats, heroUrl }) => ({
    slug,
    title,
    dateLabel,
    dek,
    stats,
    heroUrl,
  }));
}

export async function getStory(slug: string): Promise<Story | null> {
  if (!supabaseConfigured()) return fixtures.getStory(slug);
  const supabase = await createClient();
  const { data: story, error } = await supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!story) return null;
  return mapStoryRow(supabase, story as StoryRow);
}

export async function getStorySlugs(): Promise<string[]> {
  if (!supabaseConfigured()) return fixtures.getStorySlugs();
  const supabase = await createClient();
  const { data: stories, error } = await supabase
    .from("stories")
    .select("slug")
    .eq("status", "published")
    .limit(MAX_LIMIT);
  if (error) throw error;
  return (stories ?? []).map((s) => (s as { slug: string }).slug);
}
