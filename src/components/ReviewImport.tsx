import { useState } from "react";
import type { ParsedScheduleDraft } from "../domain/types";

interface ReviewImportProps {
  draft: ParsedScheduleDraft;
  onConfirm: (draft: ParsedScheduleDraft) => void;
  onBack: () => void;
}

export function ReviewImport({ draft, onConfirm, onBack }: ReviewImportProps) {
  const [edited, setEdited] = useState(draft);

  function updateShift(
    id: string,
    field: "employeeName" | "shiftDate" | "startTime" | "endTime" | "departmentLabel",
    value: string
  ) {
    setEdited((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.temporaryId === id ? { ...shift, [field]: value } : shift
      )
    }));
  }

  return (
    <section className="panel">
      <h2>Review Import</h2>
      {edited.warnings.map((warning) => (
        <p role="alert" key={warning}>
          {warning}
        </p>
      ))}
      <div className="review-grid">
        {edited.shifts.map((shift) => (
          <article className="review-row" key={shift.temporaryId}>
            <input
              aria-label={`Employee for ${shift.temporaryId}`}
              value={shift.employeeName}
              onChange={(event) => updateShift(shift.temporaryId, "employeeName", event.target.value)}
            />
            <input
              aria-label={`Date for ${shift.employeeName}`}
              value={shift.shiftDate}
              onChange={(event) => updateShift(shift.temporaryId, "shiftDate", event.target.value)}
            />
            <input
              aria-label={`Start for ${shift.employeeName}`}
              value={shift.startTime}
              onChange={(event) => updateShift(shift.temporaryId, "startTime", event.target.value)}
            />
            <input
              aria-label={`End for ${shift.employeeName}`}
              value={shift.endTime}
              onChange={(event) => updateShift(shift.temporaryId, "endTime", event.target.value)}
            />
            <input
              aria-label={`Department for ${shift.employeeName}`}
              value={shift.departmentLabel}
              onChange={(event) =>
                updateShift(shift.temporaryId, "departmentLabel", event.target.value)
              }
            />
          </article>
        ))}
      </div>
      <div className="actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={() => onConfirm(edited)}>
          Confirm import
        </button>
      </div>
    </section>
  );
}
