import { render, screen, waitFor } from "@testing-library/react";
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
    vi.unstubAllGlobals();
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
