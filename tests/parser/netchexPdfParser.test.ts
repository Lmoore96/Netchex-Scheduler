import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseNetchexPdf } from "../../netlify/functions/_shared/parser/netchexPdfParser";

describe("parseNetchexPdf", () => {
  it("extracts working shifts from the sample Netchex PDF", async () => {
    const buffer = await readFile("tests/fixtures/Netchex Scheduler.pdf");
    const draft = await parseNetchexPdf(buffer, "Netchex Scheduler.pdf");

    expect(draft.sourceFileName).toBe("Netchex Scheduler.pdf");
    expect(draft.shifts.length).toBeGreaterThan(0);
    expect(draft.shifts.some((shift) => shift.employeeName.includes("AL-RAJAI"))).toBe(true);
    expect(draft.shifts.some((shift) => shift.departmentLabel.includes("Splash Crew"))).toBe(true);
    expect(draft.shifts.every((shift) => shift.startTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.every((shift) => shift.endTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.some((shift) => shift.departmentLabel === "UNAVAILABLE")).toBe(false);
  });
});
