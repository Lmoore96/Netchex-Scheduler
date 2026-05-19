import { describe, expect, it } from "vitest";
import { positionListRequestSchema } from "../../src/domain/validation";

const validPositionList = {
  departmentId: "department-1",
  name: "Splash Crew",
  positions: [
    { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" },
    { key: "tower-2", label: "Tower 2", sortOrder: 1, capacityMode: "single" }
  ]
};

describe("positionListRequestSchema", () => {
  it("trims request strings before saving", () => {
    const parsed = positionListRequestSchema.parse({
      departmentId: " department-1 ",
      name: " Splash Crew ",
      positions: [
        { key: " tower-1 ", label: " Tower 1 ", sortOrder: 0, capacityMode: "single" }
      ]
    });

    expect(parsed).toEqual({
      departmentId: "department-1",
      name: "Splash Crew",
      positions: [
        { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" }
      ]
    });
  });

  it("rejects whitespace-only request strings", () => {
    expect(
      positionListRequestSchema.safeParse({
        ...validPositionList,
        name: "   "
      }).success
    ).toBe(false);
  });

  it("rejects duplicate position keys and sort orders", () => {
    const parsed = positionListRequestSchema.safeParse({
      ...validPositionList,
      positions: [
        { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" },
        { key: "tower-1", label: "Tower 1 Copy", sortOrder: 0, capacityMode: "single" }
      ]
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toEqual([
        "Position keys must be unique",
        "Position sort orders must be unique"
      ]);
    }
  });
});
