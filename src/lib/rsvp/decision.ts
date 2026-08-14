// Pure decision logic for the in-app RSVP control on an event page. Kept
// separate from RsvpControl.tsx (a client component) so it can be unit
// tested without rendering anything. See .claude/rules/code-patterns.md §
// "RSVP Provider Abstraction" — this only decides *which* control state to
// show; the actual Luma-vs-native URL choice still goes through
// src/lib/rsvp/provider.ts.

export type RsvpControlState =
  | "login" // unauthenticated visitor — show count + "Member login" link
  | "external" // event has a Luma URL — unchanged external ButtonLink
  | "going" // viewer is attending — "You're going" + change car / can't make it
  | "full" // capacity reached, viewer not attending — disabled "Event full"
  | "not-going"; // native RSVP available — "RSVP" button opens car picker

export type RsvpDecisionInput = {
  authenticated: boolean;
  /** Non-null when the event has an external Luma RSVP URL configured. */
  lumaUrl: string | null;
  isAttending: boolean;
  capacity: number | null;
  attendeeCount: number;
};

/** Decides which RsvpControl state to render. Pure — no I/O, no React. */
export function decideRsvpState(input: RsvpDecisionInput): RsvpControlState {
  if (!input.authenticated) return "login";
  if (input.lumaUrl) return "external";
  if (input.isAttending) return "going";
  if (input.capacity !== null && input.attendeeCount >= input.capacity) {
    return "full";
  }
  return "not-going";
}
