import type { Assignment, PositionDefinition, Shift } from "../domain/types";

interface PrintViewProps {
  departmentName: string;
  date: string;
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
}

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((first, second) => first.sortOrder - second.sortOrder);
}

function shiftFor(shifts: Shift[], shiftId: string) {
  return shifts.find((shift) => shift.id === shiftId);
}

function shiftTime(shift: Shift) {
  return `${shift.startTime}-${shift.endTime}`;
}

export function PrintView({ departmentName, date, positions, shifts, assignments }: PrintViewProps) {
  const visibleShiftIds = new Set(shifts.map((shift) => shift.id));
  const assignedShiftIds = new Set(
    assignments
      .filter((assignment) => visibleShiftIds.has(assignment.shiftId))
      .map((assignment) => assignment.shiftId)
  );

  return (
    <section className="print-sheet" aria-label={`${departmentName} print sheet`}>
      <header className="print-sheet__header">
        <h1>{departmentName}</h1>
        <p>{date}</p>
      </header>

      {sortByOrder(positions).map((position) => {
        const positionAssignments = sortByOrder(
          assignments.filter(
            (assignment) =>
              assignment.positionKey === position.key && visibleShiftIds.has(assignment.shiftId)
          )
        );

        return (
          <section className="print-position" key={position.key}>
            <h2>{position.label}</h2>
            {positionAssignments.length > 0 ? (
              <ul>
                {positionAssignments.map((assignment) => {
                  const shift = shiftFor(shifts, assignment.shiftId);
                  return (
                    <li key={assignment.shiftId}>
                      <strong>{shift?.employeeName ?? "Unknown employee"}</strong>
                      {shift ? <span>{shiftTime(shift)}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Open</p>
            )}
          </section>
        );
      })}

      <section className="print-position">
        <h2>Unassigned</h2>
        <ul>
          {shifts
            .filter((shift) => !assignedShiftIds.has(shift.id))
            .map((shift) => (
              <li key={shift.id}>
                <strong>{shift.employeeName}</strong>
                <span>{shiftTime(shift)}</span>
              </li>
            ))}
        </ul>
      </section>
    </section>
  );
}
