import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const styles = {
  /* Outlined, uppercase — the primary BAR8 action. Inverts on hover. */
  primary:
    "inline-flex items-center justify-center border border-bone px-6 py-3 text-sm font-medium uppercase tracking-widest transition-colors hover:bg-bone hover:text-ink",
  /* Quiet text action with arrow affordance supplied by caller. */
  ghost:
    "type-label inline-flex items-center gap-2 transition-colors hover:text-bone",
  /* The ONLY place --signal appears as a fill: confirmed RSVP state. */
  signal:
    "inline-flex items-center justify-center bg-signal px-6 py-3 text-sm font-medium uppercase tracking-widest text-bone",
} as const;

type Variant = keyof typeof styles;

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link {...rest} className={`${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...rest} className={`${styles[variant]} ${className}`} />;
}
