"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Button";
import { carOwnershipSchema, type CarInsert } from "@/lib/schemas/car";

/* Client-side shape mirrors src/lib/schemas/car.ts's carInsertSchema minus
 * is_primary/sort_order (those are managed separately — "Make primary" and
 * display order aren't form fields). year comes in as a string from the
 * <input>, so it's validated/coerced here and converted to a number (or
 * undefined) before being handed to the server action, which re-validates
 * against carInsertSchema/carUpdateSchema. */
const carFormSchema = z.object({
  year: z.string().trim().optional(),
  make: z.string().trim().min(1, "Make is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(100),
  trim: z.string().trim().max(100).optional(),
  exterior_color: z.string().trim().max(100).optional(),
  interior_color: z.string().trim().max(100).optional(),
  modifications: z.string().trim().max(2000).optional(),
  story: z.string().trim().max(4000).optional(),
  ownership: carOwnershipSchema,
});

type CarFormValues = z.infer<typeof carFormSchema>;

export type CarFormDefaults = {
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  modifications: string | null;
  story: string | null;
  ownership: "current" | "former";
};

const inputClass =
  "w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-bone placeholder:text-muted/60 focus:border-bone focus:outline-none focus:ring-0 transition-colors";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="type-label">{label}</span>
      {children}
      {error && <span className="type-label mt-1 block text-signal">{error}</span>}
    </label>
  );
}

function toInsertPayload(values: CarFormValues): CarInsert {
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);
  const year = values.year && values.year.trim() !== "" ? Number(values.year) : undefined;
  return {
    year: Number.isFinite(year) ? year : undefined,
    make: values.make.trim(),
    model: values.model.trim(),
    trim: clean(values.trim),
    exterior_color: clean(values.exterior_color),
    interior_color: clean(values.interior_color),
    modifications: clean(values.modifications),
    story: clean(values.story),
    ownership: values.ownership,
    is_primary: false,
    sort_order: 0,
  };
}

export function CarForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: CarFormDefaults;
  onSubmit: (payload: CarInsert) => Promise<{ error: string | null }>;
  submitLabel: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: defaultValues
      ? {
          year: defaultValues.year ? String(defaultValues.year) : "",
          make: defaultValues.make,
          model: defaultValues.model,
          trim: defaultValues.trim ?? "",
          exterior_color: defaultValues.exterior_color ?? "",
          interior_color: defaultValues.interior_color ?? "",
          modifications: defaultValues.modifications ?? "",
          story: defaultValues.story ?? "",
          ownership: defaultValues.ownership,
        }
      : { ownership: "current" },
  });

  async function submit(values: CarFormValues) {
    setServerError(null);
    const result = await onSubmit(toInsertPayload(values));
    if (result.error) setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8" noValidate>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Year" error={errors.year?.message}>
          <input {...register("year")} className={inputClass} inputMode="numeric" />
        </Field>
        <Field label="Ownership">
          <select
            {...register("ownership")}
            className={`${inputClass} appearance-none`}
          >
            <option value="current">Current</option>
            <option value="former">Former</option>
          </select>
        </Field>
        <Field label="Make" error={errors.make?.message}>
          <input {...register("make")} className={inputClass} />
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <input {...register("model")} className={inputClass} />
        </Field>
        <Field label="Trim" error={errors.trim?.message}>
          <input {...register("trim")} className={inputClass} />
        </Field>
        <Field label="Exterior color" error={errors.exterior_color?.message}>
          <input {...register("exterior_color")} className={inputClass} />
        </Field>
        <Field label="Interior color" error={errors.interior_color?.message}>
          <input {...register("interior_color")} className={inputClass} />
        </Field>
      </div>
      <Field label="Modifications" error={errors.modifications?.message}>
        <textarea {...register("modifications")} rows={3} className={inputClass} />
      </Field>
      <Field label="Story" error={errors.story?.message}>
        <textarea {...register("story")} rows={5} className={inputClass} />
      </Field>
      {serverError && <p className="type-label text-signal">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
