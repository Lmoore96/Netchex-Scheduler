import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrintView } from "../../src/components/PrintView";

describe("PrintView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints a sign-in sheet with names, positions, and blank time columns", () => {
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
    expect(screen.getByRole("table", { name: "Splash Crew sign-in sheet" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Scheduled arrival" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Position" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Time in" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Lunch out" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Lunch in" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Day out" })).toBeInTheDocument();

    const signInRows = within(screen.getByRole("table", { name: "Splash Crew sign-in sheet" })).getAllByRole("row");
    expect(signInRows).toHaveLength(2 + 1 + 6);

    const assignedRow = screen.getByText("MAI AL-RAJAI").closest("tr");
    expect(assignedRow).toHaveTextContent("Tower 1");
    expect(assignedRow).toHaveTextContent("10:00 AM");
    expect(screen.getByText("ERIN ASH")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Unassigned" })).not.toBeInTheDocument();
  });

  it("can switch to a large posting list grouped by position", async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByRole("button", { name: "Simple list" }));

    expect(screen.getByRole("region", { name: "Splash Crew simple posting list" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tower 1" })).toBeInTheDocument();
    expect(screen.getByText("MAI AL-RAJAI")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unassigned" })).toBeInTheDocument();
    expect(screen.getByText("ERIN ASH")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Time in" })).not.toBeInTheDocument();
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
