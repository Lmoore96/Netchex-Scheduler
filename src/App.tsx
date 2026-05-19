import { useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { ImportPanel } from "./components/ImportPanel";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView } from "./components/PrintView";
import { ReviewImport } from "./components/ReviewImport";
import { Shell } from "./components/Shell";
import type { Assignment, ParsedScheduleDraft, PositionDefinition, Shift } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

type View = "import" | "review" | "positions" | "assign" | "print";

const defaultPositions: PositionDefinition[] = [
  { key: "lead", label: "Lead", sortOrder: 0, capacityMode: "single" },
  { key: "starter", label: "Starter", sortOrder: 1, capacityMode: "multiple" }
];

function draftToShifts(draft: ParsedScheduleDraft, importId: string): Shift[] {
  return draft.shifts
    .filter((shift) => !shift.ignored)
    .map((shift, index) => ({
      id: `shift-${index + 1}`,
      scheduleImportId: importId,
      employeeId: `employee-${index + 1}`,
      employeeName: shift.employeeName,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      departmentLabel: shift.departmentLabel,
      sourceConfidence: shift.sourceConfidence,
      sourceNotes: shift.sourceNotes
    }));
}

export function App() {
  const [view, setView] = useState<View>("import");
  const [draft, setDraft] = useState<ParsedScheduleDraft | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positions, setPositions] = useState<PositionDefinition[]>(defaultPositions);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const firstDepartment = shifts[0]?.departmentLabel ?? "Department";
  const firstDate = shifts[0]?.shiftDate ?? new Date().toISOString().slice(0, 10);
  const visibleShifts = useMemo(
    () => shifts.filter((shift) => shift.departmentLabel === firstDepartment && shift.shiftDate === firstDate),
    [firstDate, firstDepartment, shifts]
  );

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    setConfirmError("");
    setIsConfirming(true);
    try {
      const result = await confirmReviewedImport(reviewed);
      setShifts(draftToShifts(reviewed, result.importId));
      setAssignments([]);
      setDraft(null);
      setView("positions");
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : "Import could not be confirmed");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Shell>
      <nav className="tabs no-print" aria-label="Workflow">
        <button type="button" onClick={() => setView("import")}>
          Import
        </button>
        <button type="button" onClick={() => setView("positions")} disabled={shifts.length === 0}>
          Positions
        </button>
        <button type="button" onClick={() => setView("assign")} disabled={shifts.length === 0}>
          Assign
        </button>
        <button type="button" onClick={() => setView("print")} disabled={shifts.length === 0}>
          Print
        </button>
      </nav>

      {view === "import" ? (
        <ImportPanel
          onDraft={(nextDraft) => {
            setConfirmError("");
            setDraft(nextDraft);
            setView("review");
          }}
        />
      ) : null}

      {view === "review" && draft ? (
        <ReviewImport
          draft={draft}
          onBack={() => {
            setConfirmError("");
            setView("import");
          }}
          onConfirm={(reviewed) => void confirmImport(reviewed)}
          isConfirming={isConfirming}
          confirmError={confirmError}
        />
      ) : null}

      {view === "positions" ? (
        <PositionListEditor
          departmentName={firstDepartment}
          initialPositions={positions}
          onSave={setPositions}
        />
      ) : null}

      {view === "assign" ? (
        <section className="panel">
          <h2>{firstDepartment} Assignments</h2>
          <p>{firstDate}</p>
          <AssignmentBoard
            positions={positions}
            shifts={visibleShifts}
            assignments={assignments}
            onChange={setAssignments}
          />
        </section>
      ) : null}

      {view === "print" ? (
        <PrintView
          departmentName={firstDepartment}
          date={firstDate}
          positions={positions}
          shifts={visibleShifts}
          assignments={assignments}
        />
      ) : null}
    </Shell>
  );
}
