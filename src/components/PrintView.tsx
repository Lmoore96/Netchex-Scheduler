import type { Assignment, PositionDefinition, Shift } from "../domain/types";

interface PrintViewProps {
  departmentName: string;
  date: string;
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
}

function formatEmployeeName(employeeName: string) {
  const trimmed = employeeName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(",");

  if (parts.length > 1) {
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(",").trim();
    if (firstName && lastName) return firstName + " " + lastName;
  }

  return trimmed;
}

export function PrintView({ departmentName, date, positions, shifts, assignments }: PrintViewProps) {
  const visibleShiftIds = new Set(shifts.map((shift) => shift.id));
  const positionLabels = new Map(positions.map((position) => [position.key, position.label]));
  const assignmentsByShiftId = new Map(
    assignments
      .filter((assignment) => visibleShiftIds.has(assignment.shiftId))
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((assignment) => [assignment.shiftId, assignment])
  );

  return (
    <section className="print-sheet" aria-label={departmentName + " print sheet"}>
      <header className="print-sheet__header">
        <div>
          <h1>{departmentName}</h1>
          <p>{date}</p>
        </div>
        <button type="button" className="no-print" onClick={() => window.print()}>
          Print crew list
        </button>
      </header>

      <table className="print-sign-table" aria-label={departmentName + " sign-in sheet"}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Position</th>
            <th scope="col">Time in</th>
            <th scope="col">Lunch out</th>
            <th scope="col">Lunch in</th>
            <th scope="col">Day out</th>
          </tr>
        </thead>
        <tbody>
          {shifts.length > 0 ? (
            shifts.map((shift) => {
              const assignment = assignmentsByShiftId.get(shift.id);
              const positionLabel = assignment ? positionLabels.get(assignment.positionKey) ?? assignment.positionKey : "";
              const employeeName = formatEmployeeName(shift.employeeName);

              return (
                <tr key={shift.id}>
                  <td>{employeeName}</td>
                  <td>{positionLabel}</td>
                  <td aria-label={employeeName + " time in"} />
                  <td aria-label={employeeName + " lunch out"} />
                  <td aria-label={employeeName + " lunch in"} />
                  <td aria-label={employeeName + " day out"} />
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6}>No scheduled employees</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
