import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssignmentBoard } from "../../src/components/AssignmentBoard";
import type { PositionDefinition, Shift } from "../../src/domain/types";

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
});
