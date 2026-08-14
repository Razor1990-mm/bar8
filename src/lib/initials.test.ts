import { describe, it, expect } from "vitest";
import { getInitials } from "./initials";

describe("getInitials", () => {
  it("combines first and last initials, uppercased", () => {
    expect(getInitials("Ken", "Ito")).toBe("KI");
  });

  it("lowercases input still uppercased in output", () => {
    expect(getInitials("ken", "ito")).toBe("KI");
  });

  it("falls back to first name only when last name is missing", () => {
    expect(getInitials("Ken", null)).toBe("K");
    expect(getInitials("Ken", undefined)).toBe("K");
  });

  it("returns ? when both names are empty or missing", () => {
    expect(getInitials(null, null)).toBe("?");
    expect(getInitials("", "")).toBe("?");
  });

  it("trims whitespace before taking the first character", () => {
    expect(getInitials("  Raza", "  Rafiq")).toBe("RR");
  });
});
