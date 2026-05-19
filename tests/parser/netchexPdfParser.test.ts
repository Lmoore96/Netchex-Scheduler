import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseNetchexPdf } from "../../netlify/functions/_shared/parser/netchexPdfParser";

describe("parseNetchexPdf", () => {
  it("extracts working shifts from the sample Netchex PDF", async () => {
    const buffer = await readFile("tests/fixtures/Netchex Scheduler.pdf");
    const draft = await parseNetchexPdf(buffer, "Netchex Scheduler.pdf");

    expect(draft.sourceFileName).toBe("Netchex Scheduler.pdf");
    expect(draft.dateRangeStart).toBe("2026-05-18");
    expect(draft.dateRangeEnd).toBe("2026-05-24");
    expect(draft.shifts).toHaveLength(253);
    expect(draft.shifts).toContainEqual(
      expect.objectContaining({
        employeeName: "AL-RAJAI, MAI",
        shiftDate: "2026-05-22",
        startTime: "10:00",
        endTime: "18:00",
        departmentLabel: "Splash Crew"
      })
    );
    expect(draft.shifts).toContainEqual(
      expect.objectContaining({
        employeeName: "BENTON, DEMETRIUS",
        shiftDate: "2026-05-23",
        startTime: "14:00",
        endTime: "18:45",
        departmentLabel: "Park Services"
      })
    );
    expect(draft.shifts.every((shift) => shift.startTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.every((shift) => shift.endTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.some((shift) => shift.departmentLabel === "UNAVAILABLE")).toBe(false);
    expect(draft.shifts.some((shift) => shift.departmentLabel === "Unknown Department")).toBe(false);
  });
});
