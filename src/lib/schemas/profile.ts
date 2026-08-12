import { z } from "zod";

// Matches public.profiles (0001_initial_schema.sql). `id`, `is_admin`, and
// `status` are server/admin-controlled and intentionally excluded from the
// member-facing update schema.

export const profileStatusSchema = z.enum(["pending", "active", "inactive"]);

export const profileInsertSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
  city: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  role_title: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(2000).optional(),
  avatar_path: z.string().trim().optional(),
  instagram: z.string().trim().max(100).optional(),
  linkedin: z.string().trim().max(200).optional(),
  member_since: z.string().date().optional(),
});

// Members editing their own profile: everything is optional (partial
// update), and slug is excluded since changing it would break existing
// links/shares.
export const profileUpdateSchema = profileInsertSchema
  .omit({ slug: true })
  .partial();

export type ProfileInsert = z.infer<typeof profileInsertSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
