import { z } from "zod";

// Matches public.cars (0001_initial_schema.sql). Make/model are free text
// per docs/BRIEF.md — no enum or brand-specific validation.

export const carOwnershipSchema = z.enum(["current", "former"]);

const currentYear = new Date().getFullYear();

export const carInsertSchema = z.object({
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 2)
    .optional(),
  make: z.string().trim().min(1, "Make is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(100),
  trim: z.string().trim().max(100).optional(),
  exterior_color: z.string().trim().max(100).optional(),
  interior_color: z.string().trim().max(100).optional(),
  modifications: z.string().trim().max(2000).optional(),
  story: z.string().trim().max(4000).optional(),
  is_primary: z.boolean().default(false),
  ownership: carOwnershipSchema.default("current"),
  sort_order: z.number().int().default(0),
});

export const carUpdateSchema = carInsertSchema.partial();

export type CarInsert = z.infer<typeof carInsertSchema>;
export type CarUpdate = z.infer<typeof carUpdateSchema>;

// Matches public.car_photos.
export const carPhotoInsertSchema = z.object({
  car_id: z.uuid(),
  storage_path: z.string().trim().min(1),
  is_hero: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  credit: z.string().trim().max(200).optional(),
});

export const carPhotoUpdateSchema = carPhotoInsertSchema
  .omit({ car_id: true })
  .partial();

export type CarPhotoInsert = z.infer<typeof carPhotoInsertSchema>;
export type CarPhotoUpdate = z.infer<typeof carPhotoUpdateSchema>;
