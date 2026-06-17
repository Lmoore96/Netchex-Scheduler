import { describe, expect, it } from "vitest";
import { defaultListForDepartment, departmentIdFromName } from "../../src/domain/defaultPositionLists";

describe("default position lists", () => {
  it("uses configured defaults for Cashiers", () => {
    const list = defaultListForDepartment("Cashiers");

    expect(list.departmentId).toBe(departmentIdFromName("Cashiers"));
    expect(list.positions).toEqual([
      expect.objectContaining({ label: "Season Pass", capacityMode: "multiple" }),
      expect.objectContaining({ label: "Cafe", capacityMode: "multiple" }),
      expect.objectContaining({ label: "Pizza", capacityMode: "multiple" }),
      expect.objectContaining({ label: "Crew Window", capacityMode: "multiple" }),
      expect.objectContaining({ label: "Pollys", capacityMode: "single" }),
      expect.objectContaining({ label: "Mini Melts", capacityMode: "single" }),
      expect.objectContaining({ label: "Ice Cream", capacityMode: "single" }),
      expect.objectContaining({ label: "Breaker", capacityMode: "multiple" })
    ]);
  });

  it("uses configured defaults for Splash Crew", () => {
    const list = defaultListForDepartment("Splash Crew");

    expect(list.positions).toEqual([
      expect.objectContaining({ label: "Office", capacityMode: "multiple" }),
      expect.objectContaining({ label: "Bar", capacityMode: "single" }),
      expect.objectContaining({ label: "Gift Shop", capacityMode: "single" }),
      expect.objectContaining({ label: "Cabana Check in", capacityMode: "single" }),
      expect.objectContaining({ label: "Out of Park Questions", capacityMode: "multiple" })
    ]);
  });
});
