import { describe, expect, it } from "vitest";
import { decideRsvpState, type RsvpDecisionInput } from "./decision";

const base: RsvpDecisionInput = {
  authenticated: true,
  lumaUrl: null,
  isAttending: false,
  capacity: null,
  attendeeCount: 0,
};

describe("decideRsvpState", () => {
  it("returns 'login' for unauthenticated visitors, regardless of other fields", () => {
    expect(decideRsvpState({ ...base, authenticated: false })).toBe("login");
    expect(
      decideRsvpState({
        ...base,
        authenticated: false,
        lumaUrl: "https://lu.ma/x",
        isAttending: true,
      }),
    ).toBe("login");
  });

  it("returns 'external' when the event has a Luma URL", () => {
    expect(decideRsvpState({ ...base, lumaUrl: "https://lu.ma/x" })).toBe(
      "external",
    );
  });

  it("prefers 'external' over 'going' when both a Luma URL and attendance exist", () => {
    expect(
      decideRsvpState({
        ...base,
        lumaUrl: "https://lu.ma/x",
        isAttending: true,
      }),
    ).toBe("external");
  });

  it("returns 'going' when the viewer is attending a native event", () => {
    expect(decideRsvpState({ ...base, isAttending: true })).toBe("going");
  });

  it("returns 'full' when capacity is reached and the viewer is not attending", () => {
    expect(
      decideRsvpState({ ...base, capacity: 10, attendeeCount: 10 }),
    ).toBe("full");
  });

  it("returns 'full' when attendeeCount exceeds capacity", () => {
    expect(
      decideRsvpState({ ...base, capacity: 10, attendeeCount: 11 }),
    ).toBe("full");
  });

  it("returns 'not-going' when capacity has room and viewer is not attending", () => {
    expect(
      decideRsvpState({ ...base, capacity: 10, attendeeCount: 9 }),
    ).toBe("not-going");
  });

  it("returns 'not-going' when capacity is unbounded (null)", () => {
    expect(decideRsvpState({ ...base, capacity: null, attendeeCount: 999 })).toBe(
      "not-going",
    );
  });

  it("attending overrides capacity being reached — a member already in shouldn't be bumped to 'full'", () => {
    expect(
      decideRsvpState({
        ...base,
        isAttending: true,
        capacity: 5,
        attendeeCount: 5,
      }),
    ).toBe("going");
  });
});
