import { useState } from "react";
import type { Assignment, PositionDefinition, Shift } from "../domain/types";
import { formatDisplayTime } from "../lib/time";

export type PrintMode = "sign-in" | "simple";

interface PrintViewProps {
  departmentName: string;
  date: string;
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
  printMode?: PrintMode;
  onPrintModeChange?: (printMode: PrintMode) => void;
  showActions?: boolean;
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

export function PrintView({
  departmentName,
  date,
  positions,
  shifts,
  assignments,
  printMode: controlledPrintMode,
  onPrintModeChange,
  showActions = true
}: PrintViewProps) {
  const [internalPrintMode, setInternalPrintMode] = useState<PrintMode>("sign-in");
  const printMode = controlledPrintMode ?? internalPrintMode;

  function changePrintMode(nextPrintMode: PrintMode) {
    if (controlledPrintMode === undefined) setInternalPrintMode(nextPrintMode);
    onPrintModeChange?.(nextPrintMode);
  }
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
      scheduledArrival: formatDisplayTime(shift.startTime),
      positionLabel
    };
  });
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const visibleAssignments = assignments
    .filter((assignment) => visibleShiftIds.has(assignment.shiftId))
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const assignedShiftIds = new Set(visibleAssignments.map((assignment) => assignment.shiftId));
  const simpleSections = [...positions]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((position) => ({
      position,
      rows: visibleAssignments
        .filter((assignment) => assignment.positionKey === position.key)
        .map((assignment) => {
          const shift = shiftsById.get(assignment.shiftId);
          return shift ? { employeeName: formatEmployeeName(shift.employeeName), id: shift.id } : null;
        })
        .filter((row): row is { employeeName: string; id: string } => row !== null)
    }));
  const unassignedRows = rows.filter((row) => !assignedShiftIds.has(row.id));
  const signInBlankRows = Array.from({ length: 6 }, (_, index) => index);

  return (
    <section className="print-sheet" aria-label={departmentName + " print sheet"}>
      <header className="print-sheet__header">
        <div>
          <h1>{departmentName}</h1>
          <p>{date}</p>
        </div>
        {showActions ? <div className="print-sheet__actions no-print">
          <div className="print-sheet__mode-toggle" aria-label="Crew print view">
            <button
              type="button"
              className={printMode === "sign-in" ? "is-active" : undefined}
              aria-pressed={printMode === "sign-in"}
              onClick={() => changePrintMode("sign-in")}
            >
              Sign-in sheet
            </button>
            <button
              type="button"
              className={printMode === "simple" ? "is-active" : undefined}
              aria-pressed={printMode === "simple"}
              onClick={() => changePrintMode("simple")}
            >
              Simple list
            </button>
          </div>
          <button type="button" onClick={() => window.print()}>
            Print crew list
          </button>
        </div> : null}
      </header>

      {printMode === "sign-in" ? (
        <table className="print-sign-table" aria-label={departmentName + " sign-in sheet"}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Scheduled arrival</th>
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
                  <td>{row.scheduledArrival}</td>
                  <td>{row.positionLabel}</td>
                  <td aria-label={row.employeeName + " time in"} />
                  <td aria-label={row.employeeName + " lunch out"} />
                  <td aria-label={row.employeeName + " lunch in"} />
                  <td aria-label={row.employeeName + " day out"} />
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No scheduled employees</td>
              </tr>
            )}
            {signInBlankRows.map((rowIndex) => (
              <tr key={`blank-${rowIndex}`} aria-label={`Blank sign-in row ${rowIndex + 1}`}>
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <section className="print-simple-list" aria-label={departmentName + " simple posting list"}>
          {simpleSections.map(({ position, rows: positionRows }) => (
            <section className="print-simple-list__position" key={position.key}>
              <h2>{position.label}</h2>
              {positionRows.length > 0 ? (
                <ul>
                  {positionRows.map((row) => (
                    <li key={row.id}>
                      <strong>{row.employeeName}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Open</p>
              )}
            </section>
          ))}

          <section className="print-simple-list__position">
            <h2>Unassigned</h2>
            {unassignedRows.length > 0 ? (
              <ul>
                {unassignedRows.map((row) => (
                  <li key={row.id}>
                    <strong>{row.employeeName}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>None</p>
            )}
          </section>
        </section>
      )}
    </section>
  );
}
