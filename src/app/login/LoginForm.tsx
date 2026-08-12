"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="border-t border-hairline pt-10">
        <p className="type-display text-2xl md:text-3xl">Check your email.</p>
        <p className="type-editorial mt-4 text-muted">
          If that address belongs to a member, a sign-in link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <label className="block">
        <span className="type-label">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-bone placeholder:text-muted/60 transition-colors focus:border-bone focus:outline-none focus:ring-0"
          placeholder="you@example.com"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send sign-in link"}
      </Button>
      {state.status === "error" && (
        <p className="type-label text-signal">{state.message}</p>
      )}
      <p className="type-label">
        No passwords. We email you a link that signs you in.
      </p>
    </form>
  );
}
