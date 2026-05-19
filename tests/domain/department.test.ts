import { describe, expect, it } from "vitest";
import { normalizeDepartmentLabel } from "../../src/lib/department";

describe("normalizeDepartmentLabel", () => {
  it("trims whitespace and preserves readable labels", () => {
    expect(normalizeDepartmentLabel("  Splash Crew  ")).toBe("Splash Crew");
  });

  it("keeps truncated Netchex labels stable for alias matching", () => {
    expect(normalizeDepartmentLabel("Food and Beverag...")).toBe("Food and Beverag...");
  });

  it("collapses repeated spaces", () => {
    expect(normalizeDepartmentLabel("Guest   Services")).toBe("Guest Services");
  });
});
