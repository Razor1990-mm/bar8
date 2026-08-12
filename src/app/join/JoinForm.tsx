"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Button";

/* Client-side shape mirrors src/lib/schemas/application.ts; only first/last
 * name and email are required. Submission posts to /api/applications, which
 * lands with Supabase — until then the endpoint returns 503 and the form
 * shows a graceful "not open yet" note. */
const formSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  city: z.string().optional(),
  primary_car: z.string().optional(),
  other_cars: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  referred_by: z.string().optional(),
  about: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
      {error && (
        <span className="type-label mt-1 block text-signal">{error}</span>
      )}
    </label>
  );
}

export function JoinForm() {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setState("submitting");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="border-t border-hairline pt-10">
        <p className="type-display text-2xl md:text-3xl">
          Application received.
        </p>
        <p className="type-editorial mt-4 text-muted">
          We&rsquo;ll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <div className="grid grid-cols-2 gap-6">
        <Field label="First name" error={errors.first_name?.message}>
          <input
            {...register("first_name")}
            className={inputClass}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          <input
            {...register("last_name")}
            className={inputClass}
            autoComplete="family-name"
          />
        </Field>
      </div>
      <Field label="Email" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          className={inputClass}
          autoComplete="email"
          inputMode="email"
        />
      </Field>
      <Field label="Phone">
        <input
          {...register("phone")}
          type="tel"
          className={inputClass}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>
      <Field label="City">
        <input
          {...register("city")}
          className={inputClass}
          autoComplete="address-level2"
        />
      </Field>
      <Field label="Primary car">
        <input
          {...register("primary_car")}
          className={inputClass}
          placeholder="What you drive most"
        />
      </Field>
      <Field label="Other cars">
        <input {...register("other_cars")} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Instagram (optional)">
          <input
            {...register("instagram")}
            className={inputClass}
            placeholder="@"
          />
        </Field>
        <Field label="LinkedIn (optional)">
          <input {...register("linkedin")} className={inputClass} />
        </Field>
      </div>
      <Field label="Referred by">
        <input
          {...register("referred_by")}
          className={inputClass}
          placeholder="Who sent you?"
        />
      </Field>
      <Field label="Tell us a little about yourself">
        <textarea {...register("about")} rows={4} className={inputClass} />
      </Field>

      <div className="pt-4">
        <Button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Sending…" : "Submit Application"}
        </Button>
        {state === "error" && (
          <p className="type-label mt-4 text-signal">
            Applications aren&rsquo;t open quite yet — try again soon.
          </p>
        )}
      </div>
    </form>
  );
}
