import type { Assignment, PositionDefinition, Shift } from "../domain/types";
import { formatShiftRange } from "../lib/time";

interface AssignmentBoardProps {
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
}

function sortedPositions(positions: PositionDefinition[]) {
  return [...positions].sort((first, second) => first.sortOrder - second.sortOrder);
}

function shiftLabel(shift: Shift) {
  return formatShiftRange(shift.startTime, shift.endTime);
}

export function AssignmentBoard({
  positions,
  shifts,
  assignments,
  onChange
}: AssignmentBoardProps) {
  const orderedPositions = sortedPositions(positions);
  const visibleShiftIds = new Set(shifts.map((shift) => shift.id));

  function shiftFor(shiftId: string) {
    return shifts.find((shift) => shift.id === shiftId);
  }

  function assignmentFor(shiftId: string) {
    return assignments.find((assignment) => assignment.shiftId === shiftId);
  }

  function moveShift(shift: Shift, positionKey: string) {
    const targetPosition = orderedPositions.find((position) => position.key === positionKey);
    const existingAssignment = assignmentFor(shift.id);
    let nextAssignments = assignments.filter((assignment) => assignment.shiftId !== shift.id);

    if (targetPosition?.capacityMode === "single") {
      nextAssignments = nextAssignments.filter(
        (assignment) =>
          assignment.positionKey !== targetPosition.key || !visibleShiftIds.has(assignment.shiftId)
      );
    }

    if (positionKey) {
      nextAssignments = [
        ...nextAssignments,
        {
          ...existingAssignment,
          id: existingAssignment?.id ?? `local-${shift.id}`,
          dailyPositionPlanId: existingAssignment?.dailyPositionPlanId ?? "local-plan",
          shiftId: shift.id,
          positionKey,
          sortOrder: nextAssignments.filter((assignment) => assignment.positionKey === positionKey)
            .length
        }
      ];
    }

    onChange(nextAssignments);
  }

  return (
    <section className="assignment-board" aria-label="Assignment board">
      <div className="assignment-board__positions" aria-label="Positions">
        {orderedPositions.map((position) => {
          const positionAssignments = assignments
            .filter((assignment) => assignment.positionKey === position.key)
            .filter((assignment) => visibleShiftIds.has(assignment.shiftId))
            .sort((first, second) => first.sortOrder - second.sortOrder);

          return (
            <section className="assignment-board__column" key={position.key}>
              <div className="assignment-board__column-header">
                <h3>{position.label}</h3>
                <span>{position.capacityMode === "single" ? "Single" : "Multiple"}</span>
              </div>

              {positionAssignments.length > 0 ? (
                <ul className="assignment-board__assigned">
                  {positionAssignments.map((assignment) => {
                    const shift = shiftFor(assignment.shiftId);
                    return (
                      <li key={assignment.shiftId}>
                        <strong>{shift?.employeeName ?? "Unknown employee"}</strong>
                        {shift ? <span>{shiftLabel(shift)}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="assignment-board__empty">No assignments yet.</p>
              )}
            </section>
          );
        })}
      </div>

      <section className="assignment-board__scheduled" aria-labelledby="scheduled-employees-heading">
        <h3 id="scheduled-employees-heading">Scheduled Employees</h3>
        {shifts.length > 0 ? (
          <ul className="assignment-board__moves">
            {shifts.map((shift) => {
              const currentPositionKey = assignmentFor(shift.id)?.positionKey ?? "";

              return (
                <li key={shift.id}>
                  <div className="assignment-board__employee">
                    <strong>{shift.employeeName}</strong>
                    <span>{shiftLabel(shift)}</span>
                  </div>
                  <label>
                    <span>Move {shift.employeeName}</span>
                    <select
                      aria-label={`Move ${shift.employeeName}`}
                      value={currentPositionKey}
                      onChange={(event) => moveShift(shift, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {orderedPositions.map((position) => (
                        <option key={position.key} value={position.key}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="assignment-board__empty">No scheduled employees for this view.</p>
        )}
      </section>
    </section>
  );
}
