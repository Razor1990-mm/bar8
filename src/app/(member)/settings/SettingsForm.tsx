"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { updateProfile, type SettingsState } from "./actions";
import type { Viewer } from "@/lib/viewer";

const initial: SettingsState = { status: "idle" };

const inputClass =
  "w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-bone placeholder:text-muted/60 focus:border-bone focus:outline-none focus:ring-0 transition-colors";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="type-label">{label}</span>
      {children}
    </label>
  );
}

export function SettingsForm({ viewer }: { viewer: Viewer }) {
  const [state, formAction, pending] = useActionState(updateProfile, initial);

  return (
    <form action={formAction} className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <Field label="First name">
          <input
            name="first_name"
            defaultValue={viewer.first_name}
            className={inputClass}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name">
          <input
            name="last_name"
            defaultValue={viewer.last_name}
            className={inputClass}
            autoComplete="family-name"
          />
        </Field>
      </div>
      <Field label="City">
        <input
          name="city"
          defaultValue={viewer.city ?? ""}
          className={inputClass}
          autoComplete="address-level2"
        />
      </Field>
      <Field label="Bio">
        <textarea
          name="bio"
          defaultValue={viewer.bio ?? ""}
          rows={4}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Instagram">
          <input
            name="instagram"
            defaultValue={viewer.instagram ?? ""}
            className={inputClass}
            placeholder="@"
          />
        </Field>
        <Field label="LinkedIn">
          <input
            name="linkedin"
            defaultValue={viewer.linkedin ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        {state.status === "saved" && (
          <p className="type-label mt-4 text-bone">Saved.</p>
        )}
        {state.status === "error" && (
          <p className="type-label mt-4 text-signal">{state.message}</p>
        )}
      </div>
    </form>
  );
}
