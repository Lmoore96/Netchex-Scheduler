import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrintView } from "../../src/components/PrintView";

describe("PrintView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows department, date, positions, assigned employees, and unassigned employees", () => {
    render(
      <PrintView
        departmentName="Splash Crew"
        date="2026-05-22"
        positions={[{ key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" }]}
        shifts={[
          {
            id: "shift-1",
            scheduleImportId: "import-1",
            employeeId: "employee-1",
            employeeName: "AL-RAJAI, MAI",
            shiftDate: "2026-05-22",
            startTime: "10:00",
            endTime: "18:00",
            departmentLabel: "Splash Crew",
            sourceConfidence: "high"
          },
          {
            id: "shift-2",
            scheduleImportId: "import-1",
            employeeId: "employee-2",
            employeeName: "ASH, ERIN",
            shiftDate: "2026-05-22",
            startTime: "09:30",
            endTime: "18:30",
            departmentLabel: "Splash Crew",
            sourceConfidence: "high"
          }
        ]}
        assignments={[
          {
            id: "assignment-1",
            dailyPositionPlanId: "plan-1",
            shiftId: "shift-1",
            positionKey: "tower-1",
            sortOrder: 0
          }
        ]}
      />
    );

    expect(screen.getByText("Splash Crew")).toBeInTheDocument();
    expect(screen.getByText("2026-05-22")).toBeInTheDocument();
    expect(screen.getByText("Tower 1")).toBeInTheDocument();
    expect(screen.getByText("AL-RAJAI, MAI")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("ASH, ERIN")).toBeInTheDocument();
  });
  it("lets managers print the crew list", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <PrintView
        departmentName="Splash Crew"
        date="2026-05-22"
        positions={[]}
        shifts={[]}
        assignments={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Print crew list" }));

    expect(printSpy).toHaveBeenCalledOnce();
  });

});
