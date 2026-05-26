import { useState } from "react";
import type { Assignment, PositionDefinition, Shift } from "../domain/types";

type PrintMode = "sign-in" | "simple";

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
  const [printMode, setPrintMode] = useState<PrintMode>("sign-in");
  const visibleShiftIds = new Set(shifts.map((shift) => shift.id));
  const positionLabels = new Map(positions.map((position) => [position.key, position.label]));
  const assignmentsByShiftId = new Map(
    assignments
      .filter((assignment) => visibleShiftIds.has(assignment.shiftId))
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((assignment) => [assignment.shiftId, assignment])
  );

  const rows = shifts.map((shift) => {
    const assignment = assignmentsByShiftId.get(shift.id);
    const positionLabel = assignment ? positionLabels.get(assignment.positionKey) ?? assignment.positionKey : "";

    return {
      employeeName: formatEmployeeName(shift.employeeName),
      id: shift.id,
      positionLabel
    };
  });

  return (
    <section className="print-sheet" aria-label={departmentName + " print sheet"}>
      <header className="print-sheet__header">
        <div>
          <h1>{departmentName}</h1>
          <p>{date}</p>
        </div>
        <div className="print-sheet__actions no-print">
          <div className="print-sheet__mode-toggle" aria-label="Crew print view">
            <button
              type="button"
              className={printMode === "sign-in" ? "is-active" : undefined}
              aria-pressed={printMode === "sign-in"}
              onClick={() => setPrintMode("sign-in")}
            >
              Sign-in sheet
            </button>
            <button
              type="button"
              className={printMode === "simple" ? "is-active" : undefined}
              aria-pressed={printMode === "simple"}
              onClick={() => setPrintMode("simple")}
            >
              Simple list
            </button>
          </div>
          <button type="button" onClick={() => window.print()}>
            Print crew list
          </button>
        </div>
      </header>

      {printMode === "sign-in" ? (
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
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeName}</td>
                  <td>{row.positionLabel}</td>
                  <td aria-label={row.employeeName + " time in"} />
                  <td aria-label={row.employeeName + " lunch out"} />
                  <td aria-label={row.employeeName + " lunch in"} />
                  <td aria-label={row.employeeName + " day out"} />
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No scheduled employees</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="print-sign-table print-sign-table--simple" aria-label={departmentName + " simple position list"}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeName}</td>
                  <td>{row.positionLabel}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>No scheduled employees</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
