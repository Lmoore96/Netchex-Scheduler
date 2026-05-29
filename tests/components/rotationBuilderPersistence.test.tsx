import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RotationBuilder } from "../../src/components/RotationBuilder";
import type { Shift } from "../../src/domain/types";

const shifts: Shift[] = [
  {
    id: "shift-special",
    scheduleImportId: "import-1",
    employeeId: "employee-1",
    employeeName: "SMITH, ALEX",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Special Facilities Lifeguard",
    sourceConfidence: "medium"
  },
  {
    id: "shift-shallow",
    scheduleImportId: "import-1",
    employeeId: "employee-2",
    employeeName: "JONES, TAYLOR",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Shallow Lifeguard",
    sourceConfidence: "medium"
  },
  {
    id: "shift-special-morgan",
    scheduleImportId: "import-1",
    employeeId: "employee-3",
    employeeName: "BROWN, MORGAN",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Special Facilities Lifeguard",
    sourceConfidence: "medium"
  }
];

describe("RotationBuilder persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("rotation-plans") && init?.method === "POST") {
        return new Response(JSON.stringify({
          plan: {
            id: "plan-1",
            scheduleImportId: "import-1",
            planDate: "2026-05-22",
            rotationTemplates: [],
            assignments: {},
            supportAssignments: { captains: [], slideAttendants: [] },
            savedAt: "2026-05-22T12:00:00Z"
          }
        }), { status: 200 });
      }
      if (href.includes("rotation-plans")) {
        return new Response(JSON.stringify({ plan: null }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });


  it("prints a rotation handout without employee names", async () => {
    const user = userEvent.setup();
    render(<RotationBuilder shifts={shifts} />);

    await user.selectOptions(screen.getByLabelText("Print layout"), "handout");

    expect(screen.getByRole("region", { name: "Daily rotation handout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Special Facilities (Red Shorts)" })).toBeInTheDocument();
    expect(screen.getByText("Top of Blaster")).toBeInTheDocument();
    expect(screen.queryByText("ALEX SMITH")).not.toBeInTheDocument();
    expect(screen.queryByText("TAYLOR JONES")).not.toBeInTheDocument();
  });

  it("prints a break sheet with employee names and starting positions", async () => {
    const user = userEvent.setup();
    render(<RotationBuilder shifts={shifts} />);

    await user.selectOptions(screen.getByLabelText("Top of Blaster"), "shift-special");
    await user.selectOptions(screen.getByLabelText("Print layout"), "break-sheet");

    expect(screen.getByRole("table", { name: "Lifeguard break sheet" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Employee Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Loc B4 Break 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Brk 3 End Time" })).toBeInTheDocument();

    const rows = within(screen.getByRole("table", { name: "Lifeguard break sheet" })).getAllByRole("row");
    expect(rows).toHaveLength(shifts.length + 1 + 8);
    expect(rows[1]).toHaveTextContent("ALEX SMITH");
    expect(rows[2]).toHaveTextContent("MORGAN BROWN");
    expect(rows[3]).toHaveTextContent("TAYLOR JONES");
    expect(rows[1]).toHaveTextContent("Top of Blaster");
  });

  it("saves the current rotation plan", async () => {
    const user = userEvent.setup();
    render(<RotationBuilder shifts={shifts} />);

    await user.click(screen.getByRole("button", { name: "Save rotations" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/.netlify/functions/rotation-plans",
      expect.objectContaining({ method: "POST" })
    ));
  });
});
