import { z } from "zod";

// Matches public.events / event_schedule_items / event_attendance
// (0001_initial_schema.sql). These are admin-authored (events, schedule
// items) or member-authored (attendance) forms.

export const eventCategorySchema = z.enum([
  "drive",
  "track",
  "social",
  "dinner",
  "trip",
  "access",
]);

export const eventAttendanceSourceSchema = z.enum(["luma", "native"]);
export const eventStatusSchema = z.enum(["draft", "published"]);

export const eventInsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
  title: z.string().trim().min(1, "Title is required").max(200),
  subtitle: z.string().trim().max(300).optional(),
  category: eventCategorySchema,
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }).optional(),
  timezone: z.string().trim().min(1).default("America/Los_Angeles"),
  meet_time: z.string().trim().max(50).optional(),
  depart_time: z.string().trim().max(50).optional(),
  start_location_label: z.string().trim().max(200).optional(),
  start_lat: z.number().min(-90).max(90).optional(),
  start_lng: z.number().min(-180).max(180).optional(),
  route_summary: z.string().trim().max(2000).optional(),
  distance_miles: z.number().nonnegative().optional(),
  est_drive_minutes: z.number().int().nonnegative().optional(),
  capacity: z.number().int().positive().optional(),
  hero_photo_path: z.string().trim().optional(),
  description: z.string().trim().max(5000).optional(),
  luma_event_url: z.url().optional(),
  luma_event_id: z.string().trim().max(100).optional(),
  attendance_source: eventAttendanceSourceSchema.default("luma"),
  attendee_count_override: z.number().int().nonnegative().optional(),
  whatsapp_chat_url: z.url().optional(),
  status: eventStatusSchema.default("draft"),
});

export const eventUpdateSchema = eventInsertSchema
  .omit({ slug: true })
  .partial();

export type EventInsert = z.infer<typeof eventInsertSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;

// Matches public.event_schedule_items — the "6:45 AM — Meet" timeline.
export const eventScheduleItemInsertSchema = z.object({
  event_id: z.uuid(),
  time_label: z.string().trim().min(1, "Time is required").max(50),
  label: z.string().trim().min(1, "Label is required").max(200),
  sort_order: z.number().int().default(0),
});

export const eventScheduleItemUpdateSchema = eventScheduleItemInsertSchema
  .omit({ event_id: true })
  .partial();

export type EventScheduleItemInsert = z.infer<
  typeof eventScheduleItemInsertSchema
>;
export type EventScheduleItemUpdate = z.infer<
  typeof eventScheduleItemUpdateSchema
>;

// Matches public.event_attendance. `status`/`source` default to the "going"
// / "luma" happy path but can be overridden by admins syncing from Luma.
export const attendanceStatusSchema = z.enum(["going", "waitlist", "declined"]);
export const attendanceSourceSchema = z.enum(["luma", "native", "admin"]);

export const eventAttendanceInsertSchema = z.object({
  event_id: z.uuid(),
  profile_id: z.uuid(),
  car_id: z.uuid().optional(),
  status: attendanceStatusSchema.default("going"),
  source: attendanceSourceSchema.default("luma"),
});

export const eventAttendanceUpdateSchema = eventAttendanceInsertSchema
  .omit({ event_id: true, profile_id: true })
  .partial();

export type EventAttendanceInsert = z.infer<typeof eventAttendanceInsertSchema>;
export type EventAttendanceUpdate = z.infer<typeof eventAttendanceUpdateSchema>;
