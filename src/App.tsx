import { useEffect, useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { DayDepartmentPicker } from "./components/DayDepartmentPicker";
import { ImportPanel } from "./components/ImportPanel";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView } from "./components/PrintView";
import { Shell } from "./components/Shell";
import type { Assignment, ParsedScheduleDraft, PositionDefinition, PositionList, Shift } from "./domain/types";
import {
  confirmReviewedImport,
  deletePositionList as deletePositionListRequest,
  loadPositionLists,
  savePositionList as savePositionListRequest
} from "./lib/storageClient";

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

function samePositionList(first: PositionList, second: PositionList) {
  return (
    first.id === second.id ||
    (first.departmentId === second.departmentId && first.name === second.name)
  );
}

function withDefaultLists(lists: PositionList[], departmentNames: string[]) {
  const nextLists = [...lists];

  departmentNames.forEach((departmentName) => {
    const departmentId = departmentIdFromName(departmentName);
    if (!nextLists.some((list) => list.departmentId === departmentId)) {
      nextLists.push(defaultListForDepartment(departmentName));
    }
  });

  return nextLists;
}

function selectedListIdsForDepartments(lists: PositionList[], departmentNames: string[]) {
  const nextSelectedListIds: Record<string, string> = {};

  departmentNames.forEach((departmentName) => {
    const departmentId = departmentIdFromName(departmentName);
    const listId = lists.find((list) => list.departmentId === departmentId)?.id;
    if (listId) nextSelectedListIds[departmentId] = listId;
  });

  return nextSelectedListIds;
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
  const [positionListError, setPositionListError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedLists() {
      try {
        const savedLists = await loadPositionLists();
        if (isMounted) setPositionLists(savedLists);
      } catch (caught) {
        if (isMounted) {
          setPositionListError(
            caught instanceof Error
              ? `Saved lists could not be loaded: ${caught.message}`
              : "Saved lists could not be loaded."
          );
        }
      }
    }

    void loadSavedLists();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const nextPositionLists = withDefaultLists(positionLists, nextDepartments);

      setShifts(nextShifts);
      setSelectedDate(nextDates[0] ?? "");
      setSelectedDepartment(nextDepartments[0] ?? "");
      setPositionLists(nextPositionLists);
      setSelectedListIds(selectedListIdsForDepartments(nextPositionLists, nextDepartments));
      setAssignments([]);
      setView("positions");
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : "Import could not be confirmed");
    } finally {
      setIsConfirming(false);
    }
  }

  function applyPositionList(nextList: PositionList) {
    setPositionLists((currentLists) =>
      currentLists.some((list) => samePositionList(list, nextList))
        ? currentLists.map((list) => (samePositionList(list, nextList) ? nextList : list))
        : [...currentLists, nextList]
    );
    setSelectedListIds((current) => ({ ...current, [nextList.departmentId]: nextList.id }));
  }

  async function savePositionList(nextList: PositionList) {
    setPositionListError("");
    applyPositionList(nextList);

    try {
      const savedList = await savePositionListRequest(nextList);
      applyPositionList(savedList);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? `Position list could not be saved: ${caught.message}`
          : "Position list could not be saved.";
      setPositionListError(message);
      throw new Error(message);
    }
  }

  async function deletePositionList(listToDelete: PositionList) {
    setPositionListError("");

    try {
      await deletePositionListRequest(listToDelete.id);
      setPositionLists((currentLists) =>
        currentLists.filter((list) => !samePositionList(list, listToDelete))
      );
      setSelectedListIds((current) => {
        const next = { ...current };
        const remainingDepartmentList = positionLists.find(
          (list) => list.departmentId === listToDelete.departmentId && !samePositionList(list, listToDelete)
        );

        if (remainingDepartmentList) {
          next[listToDelete.departmentId] = remainingDepartmentList.id;
        } else {
          delete next[listToDelete.departmentId];
        }

        return next;
      });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? `Position list could not be deleted: ${caught.message}`
          : "Position list could not be deleted.";
      setPositionListError(message);
      throw new Error(message);
    }
  }

  async function createPositionList(name: string) {
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

    await savePositionList({ id, departmentId: currentDepartmentId, name: label, positions: [] });
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
        <button
          type="button"
          className={view === "import" ? "is-active" : undefined}
          onClick={() => setView("import")}
        >
          Import
        </button>
        <button
          type="button"
          className={view === "positions" ? "is-active" : undefined}
          onClick={() => setView("positions")}
          disabled={shifts.length === 0}
        >
          Positions
        </button>
        <button
          type="button"
          className={view === "assign" ? "is-active" : undefined}
          onClick={() => setView("assign")}
          disabled={shifts.length === 0}
        >
          Assign
        </button>
        <button
          type="button"
          className={view === "print" ? "is-active" : undefined}
          onClick={() => setView("print")}
          disabled={shifts.length === 0}
        >
          Print
        </button>
      </nav>

      {shifts.length > 0 && view !== "import" ? (
        <section className="panel panel--filters no-print">
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
        <>
          {positionListError ? <p className="app-alert" role="alert">{positionListError}</p> : null}
          <PositionListEditor
            departmentName={currentDepartment}
            positionLists={departmentLists}
            selectedListId={selectedListId}
            onSelectList={(listId) => setSelectedListIds((current) => ({ ...current, [currentDepartmentId]: listId }))}
            onCreateList={createPositionList}
            onDeleteList={deletePositionList}
            onSaveList={savePositionList}
          />
        </>
      ) : null}

      {view === "assign" ? (
        <section className="panel panel--workspace">
          <div className="section-heading">
            <div>
              <h2>{currentDepartment} Assignments</h2>
              <p>{currentDate}</p>
            </div>
            <span>{selectedList?.name ?? "Default list"}</span>
          </div>
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
