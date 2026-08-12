import { describe, expect, it } from "vitest";
import {
  buildCarLabel,
  computeCarBreakdown,
  computeIsPast,
  formatDateLabel,
  formatShortDateLabel,
  formatStoryDateLabel,
} from "./data";

describe("buildCarLabel", () => {
  it("joins year, make, model, trim in order", () => {
    expect(buildCarLabel(2017, "Audi", "R8", "V10 Plus")).toBe("2017 Audi R8 V10 Plus");
  });

  it("omits trim when null", () => {
    expect(buildCarLabel(2009, "Porsche", "911", null)).toBe("2009 Porsche 911");
  });

  it("omits year when null", () => {
    expect(buildCarLabel(null, "Porsche", "911", null)).toBe("Porsche 911");
  });
});

describe("formatDateLabel", () => {
  it("formats an ISO timestamp as 'Weekday, Month Day' in the given timezone", () => {
    // 2026-09-12T13:45:00Z is 6:45 AM Pacific on Sep 12, 2026 (a Saturday).
    expect(formatDateLabel("2026-09-12T13:45:00Z", "America/Los_Angeles")).toBe(
      "Saturday, September 12",
    );
  });

  it("uses the provided timezone, not UTC", () => {
    // 2026-09-13T02:00:00Z is still Sep 12 evening in Los Angeles.
    expect(formatDateLabel("2026-09-13T02:00:00Z", "America/Los_Angeles")).toBe(
      "Saturday, September 12",
    );
  });
});

describe("formatShortDateLabel", () => {
  it("formats an ISO timestamp as 'MON DD'", () => {
    expect(formatShortDateLabel("2026-09-12T13:45:00Z", "America/Los_Angeles")).toBe("SEP 12");
  });
});

describe("formatStoryDateLabel", () => {
  it("formats an ISO timestamp as 'Month Day, Year'", () => {
    expect(formatStoryDateLabel("2026-10-10T18:00:00Z", "America/Los_Angeles")).toBe(
      "October 10, 2026",
    );
  });
});

describe("computeIsPast", () => {
  it("is false when the event starts after now", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(computeIsPast("2026-09-12T13:45:00Z", now)).toBe(false);
  });

  it("is true when the event started before now", () => {
    const now = new Date("2026-09-13T00:00:00Z");
    expect(computeIsPast("2026-09-12T13:45:00Z", now)).toBe(true);
  });

  it("is false at the exact boundary (starts_at === now is not yet past)", () => {
    const now = new Date("2026-09-12T13:45:00Z");
    expect(computeIsPast("2026-09-12T13:45:00Z", now)).toBe(false);
  });
});

describe("computeCarBreakdown", () => {
  it("groups cars by 'Make Model' label with counts", () => {
    const cars = [
      { make: "Audi", model: "R8" },
      { make: "Audi", model: "R8" },
      { make: "Porsche", model: "911" },
    ];
    expect(computeCarBreakdown(cars)).toEqual([
      { label: "Audi R8", count: 2 },
      { label: "Porsche 911", count: 1 },
    ]);
  });

  it("returns an empty array for no cars", () => {
    expect(computeCarBreakdown([])).toEqual([]);
  });
});
