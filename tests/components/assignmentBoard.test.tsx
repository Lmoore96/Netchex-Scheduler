import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssignmentBoard } from "../../src/components/AssignmentBoard";
import type { Assignment, PositionDefinition, Shift } from "../../src/domain/types";

const positions: PositionDefinition[] = [
  { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" }
];

const shifts: Shift[] = [
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
  }
];

const twoShifts: Shift[] = [
  ...shifts,
  {
    id: "shift-2",
    scheduleImportId: "import-1",
    employeeId: "employee-2",
    employeeName: "ALFATAH, DAKARAE",
    shiftDate: "2026-05-22",
    startTime: "11:00",
    endTime: "17:15",
    departmentLabel: "Splash Crew",
    sourceConfidence: "high"
  }
];

describe("AssignmentBoard", () => {
  it("assigns an employee using the accessible move control", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AssignmentBoard
        positions={positions}
        shifts={shifts}
        assignments={[]}
        onChange={onChange}
      />
    );

    await user.selectOptions(screen.getByLabelText("Move AL-RAJAI, MAI"), "tower-1");

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ shiftId: "shift-1", positionKey: "tower-1" })
    ]);
  });

  it("replaces only visible assignments for single-capacity positions", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const assignments: Assignment[] = [
      {
        id: "assignment-1",
        dailyPositionPlanId: "plan-1",
        shiftId: "shift-1",
        positionKey: "tower-1",
        sortOrder: 0,
        notes: "Bring radio"
      },
      {
        id: "assignment-outside-view",
        dailyPositionPlanId: "plan-2",
        shiftId: "outside-shift",
        positionKey: "tower-1",
        sortOrder: 0,
        notes: "Different day"
      }
    ];

    render(
      <AssignmentBoard
        positions={positions}
        shifts={twoShifts}
        assignments={assignments}
        onChange={onChange}
      />
    );

    expect(screen.queryByText("Unknown employee")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Move ALFATAH, DAKARAE"), "tower-1");

    expect(onChange).toHaveBeenCalledWith([
      assignments[1],
      expect.objectContaining({ shiftId: "shift-2", positionKey: "tower-1" })
    ]);
  });

  it("preserves assignment metadata when moving an existing assignment", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const multiPositions: PositionDefinition[] = [
      { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "multiple" },
      { key: "tower-2", label: "Tower 2", sortOrder: 1, capacityMode: "multiple" }
    ];
    const assignments: Assignment[] = [
      {
        id: "assignment-1",
        dailyPositionPlanId: "plan-1",
        shiftId: "shift-1",
        positionKey: "tower-1",
        sortOrder: 0,
        notes: "Bring radio"
      }
    ];

    render(
      <AssignmentBoard
        positions={multiPositions}
        shifts={shifts}
        assignments={assignments}
        onChange={onChange}
      />
    );

    await user.selectOptions(screen.getByLabelText("Move AL-RAJAI, MAI"), "tower-2");

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "assignment-1",
        dailyPositionPlanId: "plan-1",
        shiftId: "shift-1",
        positionKey: "tower-2",
        notes: "Bring radio"
      })
    ]);
  });
});
