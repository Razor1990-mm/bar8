// RSVP provider abstraction.
//
// V1 uses Luma for all RSVP/waitlist/capacity handling (see docs/BRIEF.md).
// The event data model (events.attendance_source, luma_event_url,
// luma_event_id) is deliberately generic so a future native RSVP system can
// be swapped in without touching anything outside this file: callers only
// ever go through `getRsvpProvider(event)` and the `RsvpProvider` interface.

export type RsvpEvent = {
  id: string;
  luma_event_url: string | null;
  luma_event_id: string | null;
  attendance_source: "luma" | "native";
};

export interface RsvpProvider {
  /**
   * Returns the URL a member should be sent to (or an embed should point at)
   * to RSVP for the given event. Returns null if no RSVP destination is
   * configured yet (e.g. an event awaiting its Luma link).
   */
  getRsvpUrl(event: RsvpEvent): string | null;

  /**
   * Syncs attendance data from the provider into public.event_attendance.
   * In V1 this is only meaningfully implemented by LumaProvider, and even
   * there it's a documented no-op stub — Luma remains the source of truth
   * for attendance in V1 and we don't yet pull it back into our database.
   */
  syncAttendance(event: RsvpEvent): Promise<void>;
}

export class LumaProvider implements RsvpProvider {
  getRsvpUrl(event: RsvpEvent): string | null {
    return event.luma_event_url ?? null;
  }

  async syncAttendance(_event: RsvpEvent): Promise<void> {
    // No-op stub for V1. Luma owns RSVP, waitlist, capacity, and reminders
    // directly (see docs/BRIEF.md "Integrations"); the website does not
    // mirror Luma's guest list into event_attendance yet. When that becomes
    // necessary, implement it here by calling Luma's API and upserting rows
    // into public.event_attendance with source = 'luma'.
    return;
  }
}

export class NativeProvider implements RsvpProvider {
  getRsvpUrl(_event: RsvpEvent): string | null {
    // Native RSVP is in-app (RsvpControl + event_attendance) — there is no
    // external URL to send the member to.
    return null;
  }

  async syncAttendance(_event: RsvpEvent): Promise<void> {
    throw new Error("NativeProvider is not implemented in V1");
  }
}

const lumaProvider = new LumaProvider();
const nativeProvider = new NativeProvider();

/**
 * Selects the correct RsvpProvider based on the event's attendance_source.
 * This is the single switch point for retiring Luma in favor of native RSVP.
 */
export function getRsvpProvider(
  event: Pick<RsvpEvent, "attendance_source">,
): RsvpProvider {
  switch (event.attendance_source) {
    case "luma":
      return lumaProvider;
    case "native":
      return nativeProvider;
    default: {
      const _exhaustive: never = event.attendance_source;
      throw new Error(`Unknown attendance_source: ${_exhaustive}`);
    }
  }
}
