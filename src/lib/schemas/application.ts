import { z } from "zod";

// Matches the public "Request Membership" form fields exactly as specified
// in docs/BRIEF.md, and public.membership_applications
// (0001_initial_schema.sql). Instagram and LinkedIn are explicitly optional
// per the brief; other fields not marked optional there (phone, city,
// primary car, other cars, referred by, about, car photo) are still
// required-ish in spirit but the brief only calls out first/last name and
// email as unambiguously mandatory contact info — treated as required here,
// with the remaining descriptive fields optional so the form doesn't block
// submission on soft details.

export const applicationInsertSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(100).optional(),
  primary_car: z.string().trim().max(200).optional(),
  other_cars: z.string().trim().max(1000).optional(),
  instagram: z.string().trim().max(100).optional(),
  linkedin: z.string().trim().max(200).optional(),
  referred_by: z.string().trim().max(200).optional(),
  about: z.string().trim().max(2000).optional(),
  car_photo_path: z.string().trim().optional(),
});

export type ApplicationInsert = z.infer<typeof applicationInsertSchema>;

// Admin review/update: status transitions plus internal notes. `reviewed_by`
// and `reviewed_at` are set server-side, not by client input.
export const applicationStatusSchema = z.enum([
  "new",
  "reviewing",
  "approved",
  "declined",
]);

export const applicationUpdateSchema = z.object({
  status: applicationStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type ApplicationUpdate = z.infer<typeof applicationUpdateSchema>;
