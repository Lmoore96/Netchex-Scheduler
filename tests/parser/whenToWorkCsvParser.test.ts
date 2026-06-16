import { describe, expect, it } from "vitest";
import { parseWhenToWorkCsv } from "../../src/lib/whenToWorkCsv";

const csv = `"Shift ID","Schedule ID","Employee Number","Position ID","Position Name","Category","Shift Description","Date","Start Time","End Time","Duration","Day Of Week","Employee Name"
706420785,706073206,,706072528,"GS Guest Services",,,6/16/2026,09:40 AM,01:00 PM,   3.33,1,"Smith, Alex"
706421028,706073206,,706082022,"CA Foods Cashier",,,6/16/2026,10:45 AM,06:00 PM,   7.25,1,"Jones, Taylor"
706421029,706073206,,706082023,"CA Ticketing",,,6/16/2026,10:30 AM,06:00 PM,   7.5,1,"Rivera, Morgan"
706421030,706073206,,706082024,"FB Grill",,,6/16/2026,10:30 AM,06:00 PM,   7.5,1,"Brown, Jamie"
706421031,706073206,,706082025,"AQ Shallow Water Lifeguard",,,6/16/2026,09:40 AM,06:30 PM,   8.83,1,"Lee, Casey"
706421189,706073206,,706072535,"SC Reception",,,6/17/2026,09:15 AM,06:15 PM,   9.0,2,
`;

describe("parseWhenToWorkCsv", () => {
  it("converts WhenToWork CSV rows into a schedule draft", () => {
    const draft = parseWhenToWorkCsv(csv, "EXPORT.CSV");

    expect(draft).toEqual(expect.objectContaining({
      sourceFileName: "EXPORT.CSV",
      dateRangeStart: "2026-06-16",
      dateRangeEnd: "2026-06-16"
    }));
    expect(draft.shifts).toHaveLength(5);
    expect(draft.shifts[0]).toEqual(expect.objectContaining({
      temporaryId: "706420785",
      employeeName: "Smith, Alex",
      shiftDate: "2026-06-16",
      startTime: "09:40",
      endTime: "13:00",
      departmentLabel: "Guest Services",
      sourceConfidence: "high"
    }));
    expect(draft.shifts[1]).toEqual(expect.objectContaining({
      departmentLabel: "Cashiers",
      sourceNotes: expect.stringContaining("CA Foods Cashier")
    }));
    expect(draft.shifts[2]).toEqual(expect.objectContaining({
      departmentLabel: "Cashiers",
      sourceNotes: expect.stringContaining("CA Ticketing")
    }));
    expect(draft.shifts[3]).toEqual(expect.objectContaining({
      departmentLabel: "Food and Beverage",
      sourceNotes: expect.stringContaining("FB Grill")
    }));
    expect(draft.shifts[4]).toEqual(expect.objectContaining({
      departmentLabel: "Aquatics",
      sourceNotes: expect.stringContaining("AQ Shallow Water Lifeguard")
    }));
    expect(draft.warnings).toContain("Skipped 1 rows without employee names.");
  });
});
