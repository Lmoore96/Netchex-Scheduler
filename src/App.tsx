import { useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { DayDepartmentPicker } from "./components/DayDepartmentPicker";
import { ImportPanel } from "./components/ImportPanel";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView } from "./components/PrintView";
import { Shell } from "./components/Shell";
import type { Assignment, ParsedScheduleDraft, PositionDefinition, PositionList, Shift } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

type View = "import" | "positions" | "assign" | "print";

const starterPositions: PositionDefinition[] = [
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

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function departmentIdFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "department";
}

function defaultListForDepartment(departmentName: string): PositionList {
  const departmentId = departmentIdFromName(departmentName);
  return {
    id: `${departmentId}-default`,
    departmentId,
    name: "Default list",
    positions: starterPositions
  };
}

export function App() {
  const [view, setView] = useState<View>("import");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positionLists, setPositionLists] = useState<PositionList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const dates = useMemo(() => uniqueSorted(shifts.map((shift) => shift.shiftDate)), [shifts]);
  const departments = useMemo(
    () => uniqueSorted(shifts.map((shift) => shift.departmentLabel)).map((name) => ({ id: name, name })),
    [shifts]
  );

  const currentDate = selectedDate || dates[0] || new Date().toISOString().slice(0, 10);
  const currentDepartment = selectedDepartment || departments[0]?.id || "Department";
  const currentDepartmentId = departmentIdFromName(currentDepartment);
  const departmentLists = positionLists.filter((list) => list.departmentId === currentDepartmentId);
  const selectedListId = selectedListIds[currentDepartmentId] || departmentLists[0]?.id || "";
  const selectedList = departmentLists.find((list) => list.id === selectedListId) ?? departmentLists[0];
  const selectedPositions = selectedList?.positions ?? starterPositions;

  const visibleShifts = useMemo(
    () => shifts.filter((shift) => shift.departmentLabel === currentDepartment && shift.shiftDate === currentDate),
    [currentDate, currentDepartment, shifts]
  );

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    setConfirmError("");
    setIsConfirming(true);
    try {
      const result = await confirmReviewedImport(reviewed);
      const nextShifts = draftToShifts(reviewed, result.importId);
      const nextDepartments = uniqueSorted(nextShifts.map((shift) => shift.departmentLabel));
      const nextDates = uniqueSorted(nextShifts.map((shift) => shift.shiftDate));
      const defaultLists = nextDepartments.map(defaultListForDepartment);

      setShifts(nextShifts);
      setSelectedDate(nextDates[0] ?? "");
      setSelectedDepartment(nextDepartments[0] ?? "");
      setPositionLists(defaultLists);
      setSelectedListIds(Object.fromEntries(defaultLists.map((list) => [list.departmentId, list.id])));
      setAssignments([]);
      setView("positions");
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : "Import could not be confirmed");
    } finally {
      setIsConfirming(false);
    }
  }

  function savePositionList(nextList: PositionList) {
    setPositionLists((currentLists) =>
      currentLists.some((list) => list.id === nextList.id)
        ? currentLists.map((list) => (list.id === nextList.id ? nextList : list))
        : [...currentLists, nextList]
    );
    setSelectedListIds((current) => ({ ...current, [nextList.departmentId]: nextList.id }));
  }

  function createPositionList(name: string) {
    const label = name.trim();
    if (!label) return;

    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "list";
    const baseId = `${currentDepartmentId}-${slug}`;
    const existingIds = new Set(positionLists.map((list) => list.id));
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    savePositionList({ id, departmentId: currentDepartmentId, name: label, positions: [] });
  }

  function selectDepartment(department: string) {
    setSelectedDepartment(department);
    setAssignments([]);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setAssignments([]);
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

      {shifts.length > 0 && view !== "import" ? (
        <section className="panel no-print">
          <DayDepartmentPicker
            selectedDate={currentDate}
            availableDates={dates}
            departments={departments}
            selectedDepartmentId={currentDepartment}
            onDateChange={selectDate}
            onDepartmentChange={selectDepartment}
          />
        </section>
      ) : null}

      {view === "import" ? (
        <ImportPanel onDraft={confirmImport} isImporting={isConfirming} externalError={confirmError} />
      ) : null}

      {view === "positions" ? (
        <PositionListEditor
          departmentName={currentDepartment}
          positionLists={departmentLists}
          selectedListId={selectedListId}
          onSelectList={(listId) => setSelectedListIds((current) => ({ ...current, [currentDepartmentId]: listId }))}
          onCreateList={createPositionList}
          onSaveList={savePositionList}
        />
      ) : null}

      {view === "assign" ? (
        <section className="panel">
          <h2>{currentDepartment} Assignments</h2>
          <p>{currentDate}</p>
          <p>Using list: {selectedList?.name ?? "Default list"}</p>
          <AssignmentBoard
            positions={selectedPositions}
            shifts={visibleShifts}
            assignments={assignments}
            onChange={setAssignments}
          />
        </section>
      ) : null}

      {view === "print" ? (
        <PrintView
          departmentName={currentDepartment}
          date={currentDate}
          positions={selectedPositions}
          shifts={visibleShifts}
          assignments={assignments}
        />
      ) : null}
    </Shell>
  );
}
