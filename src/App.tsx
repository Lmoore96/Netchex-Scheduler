import { useEffect, useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { AssignmentPersistenceActions, type PersistenceState } from "./components/AssignmentPersistenceActions";
import { CalloutManager } from "./components/CalloutManager";
import { DayDepartmentPicker } from "./components/DayDepartmentPicker";
import { ImportPanel } from "./components/ImportPanel";
import { ManualShiftForm } from "./components/ManualShiftForm";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView } from "./components/PrintView";
import { RotationBuilder } from "./components/RotationBuilder";
import { Shell } from "./components/Shell";
import type { Assignment, ManualShiftInput, ParsedScheduleDraft, PositionDefinition, PositionList, SavedScheduleSummary, Shift } from "./domain/types";
import {
  addManualShift as addManualShiftRequest,
  confirmReviewedImport,
  deletePositionList as deletePositionListRequest,
  deleteSavedSchedule as deleteSavedScheduleRequest,
  listSavedSchedules as listSavedSchedulesRequest,
  loadAssignmentPlan as loadAssignmentPlanRequest,
  loadPositionLists,
  loadSavedSchedule as loadSavedScheduleRequest,
  saveAssignmentPlan as saveAssignmentPlanRequest,
  savePositionList as savePositionListRequest
} from "./lib/storageClient";

type View = "import" | "positions" | "assign" | "print" | "rotations";

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

function isLifeguardRotationDepartment(departmentName: string) {
  const normalized = departmentName.toLowerCase();
  return normalized.includes("shallow") || normalized.includes("special facilit");
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

function isSavedPositionList(list: PositionList) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(list.id);
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
  const [calloutShiftIds, setCalloutShiftIds] = useState<Record<string, boolean>>({});
  const [positionLists, setPositionLists] = useState<PositionList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [positionListError, setPositionListError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleSummary[]>([]);
  const [savedScheduleError, setSavedScheduleError] = useState("");
  const [isLoadingSavedSchedules, setIsLoadingSavedSchedules] = useState(false);
  const [isLoadingSavedSchedule, setIsLoadingSavedSchedule] = useState(false);
  const [assignmentSaveState, setAssignmentSaveState] = useState<PersistenceState>("idle");
  const [manualShiftError, setManualShiftError] = useState("");
  const [isSavingManualShift, setIsSavingManualShift] = useState(false);

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

  const activeShifts = useMemo(
    () => shifts.filter((shift) => !calloutShiftIds[shift.id]),
    [calloutShiftIds, shifts]
  );
  const positionShifts = useMemo(
    () => activeShifts.filter((shift) => !isLifeguardRotationDepartment(shift.departmentLabel)),
    [activeShifts]
  );
  const rotationShifts = useMemo(
    () => activeShifts.filter((shift) => isLifeguardRotationDepartment(shift.departmentLabel)),
    [activeShifts]
  );
  const allDates = useMemo(() => uniqueSorted(shifts.map((shift) => shift.shiftDate)), [shifts]);
  const allDepartments = useMemo(() => uniqueSorted(shifts.map((shift) => shift.departmentLabel)), [shifts]);
  const currentScheduleImportId = shifts[0]?.scheduleImportId ?? "";
  const dates = useMemo(() => uniqueSorted(positionShifts.map((shift) => shift.shiftDate)), [positionShifts]);
  const departments = useMemo(
    () => uniqueSorted(positionShifts.map((shift) => shift.departmentLabel)).map((name) => ({ id: name, name })),
    [positionShifts]
  );

  const currentDate = selectedDate || dates[0] || new Date().toISOString().slice(0, 10);
  const currentDepartment = selectedDepartment || departments[0]?.id || "Department";
  const currentDepartmentId = departmentIdFromName(currentDepartment);
  const departmentLists = positionLists.filter((list) => list.departmentId === currentDepartmentId);
  const selectedListId = selectedListIds[currentDepartmentId] || departmentLists[0]?.id || "";
  const selectedList = departmentLists.find((list) => list.id === selectedListId) ?? departmentLists[0];
  const selectedPositions = selectedList?.positions ?? starterPositions;
  const defaultManualDate = allDates.includes(currentDate) ? currentDate : allDates[0] ?? "";
  const defaultManualDepartment = allDepartments.includes(currentDepartment) ? currentDepartment : allDepartments[0] ?? "";

  const visibleShifts = useMemo(
    () => positionShifts.filter((shift) => shift.departmentLabel === currentDepartment && shift.shiftDate === currentDate),
    [currentDate, currentDepartment, positionShifts]
  );

  function toggleCallout(shiftId: string) {
    setCalloutShiftIds((current) => ({ ...current, [shiftId]: !current[shiftId] }));
    setAssignments((current) => current.filter((assignment) => assignment.shiftId !== shiftId));
  }

  function loadShiftsIntoWorkspace(nextShifts: Shift[]) {
    const nextPositionShifts = nextShifts.filter((shift) => !isLifeguardRotationDepartment(shift.departmentLabel));
    const nextRotationShifts = nextShifts.filter((shift) => isLifeguardRotationDepartment(shift.departmentLabel));
    const nextDepartments = uniqueSorted(nextPositionShifts.map((shift) => shift.departmentLabel));
    const nextDates = uniqueSorted(nextPositionShifts.map((shift) => shift.shiftDate));
    const nextPositionLists = withDefaultLists(positionLists, nextDepartments);

    setShifts(nextShifts);
    setCalloutShiftIds({});
    setSelectedDate(nextDates[0] ?? "");
    setSelectedDepartment(nextDepartments[0] ?? "");
    setPositionLists(nextPositionLists);
    setSelectedListIds(selectedListIdsForDepartments(nextPositionLists, nextDepartments));
    setAssignments([]);
    setView(nextDepartments.length > 0 ? "positions" : nextRotationShifts.length > 0 ? "rotations" : "import");
  }

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    setConfirmError("");
    setIsConfirming(true);
    try {
      const result = await confirmReviewedImport(reviewed);
      const schedule = await loadSavedScheduleRequest(result.importId);
      loadShiftsIntoWorkspace(schedule.shifts.length > 0 ? schedule.shifts : draftToShifts(reviewed, result.importId));
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : "Import could not be confirmed");
    } finally {
      setIsConfirming(false);
    }
  }

  async function refreshSavedSchedules() {
    setSavedScheduleError("");
    setIsLoadingSavedSchedules(true);
    try {
      setSavedSchedules(await listSavedSchedulesRequest());
    } catch (caught) {
      setSavedScheduleError(caught instanceof Error ? caught.message : "Saved schedules could not be loaded");
    } finally {
      setIsLoadingSavedSchedules(false);
    }
  }

  async function loadSavedSchedule(scheduleImportId: string) {
    setSavedScheduleError("");
    setIsLoadingSavedSchedule(true);
    try {
      const schedule = await loadSavedScheduleRequest(scheduleImportId);
      loadShiftsIntoWorkspace(schedule.shifts);
    } catch (caught) {
      setSavedScheduleError(caught instanceof Error ? caught.message : "Saved schedule could not be loaded");
    } finally {
      setIsLoadingSavedSchedule(false);
    }
  }

  async function deleteSavedSchedule(scheduleImportId: string) {
    setSavedScheduleError("");
    try {
      await deleteSavedScheduleRequest(scheduleImportId);
      setSavedSchedules((current) => current.filter((schedule) => schedule.id !== scheduleImportId));
      if (shifts.some((shift) => shift.scheduleImportId === scheduleImportId)) {
        setShifts([]);
        setCalloutShiftIds({});
        setAssignments([]);
        setSelectedDate("");
        setSelectedDepartment("");
        setView("import");
      }
    } catch (caught) {
      setSavedScheduleError(caught instanceof Error ? caught.message : "Saved schedule could not be deleted");
    }
  }

  async function saveCurrentAssignments() {
    const scheduleImportId = visibleShifts[0]?.scheduleImportId;
    if (!scheduleImportId) return;

    setAssignmentSaveState("saving");
    try {
      const visibleShiftIds = new Set(visibleShifts.map((shift) => shift.id));
      await saveAssignmentPlanRequest({
        scheduleImportId,
        planDate: currentDate,
        departmentLabel: currentDepartment,
        positionListId: selectedList?.id ?? selectedListId,
        positionsSnapshot: selectedPositions,
        assignments: assignments.filter((assignment) => visibleShiftIds.has(assignment.shiftId))
      });
      setAssignmentSaveState("saved");
    } catch {
      setAssignmentSaveState("error");
    }
  }

  async function loadCurrentAssignments() {
    const scheduleImportId = visibleShifts[0]?.scheduleImportId;
    if (!scheduleImportId) return;

    setAssignmentSaveState("loading");
    try {
      const plan = await loadAssignmentPlanRequest({
        scheduleImportId,
        planDate: currentDate,
        departmentLabel: currentDepartment
      });

      if (!plan) {
        setAssignmentSaveState("empty");
        return;
      }

      const visibleShiftIds = new Set(visibleShifts.map((shift) => shift.id));
      setAssignments((current) => [
        ...current.filter((assignment) => !visibleShiftIds.has(assignment.shiftId)),
        ...plan.assignments
      ]);
      setAssignmentSaveState("loaded");
    } catch {
      setAssignmentSaveState("error");
    }
  }

  async function addManualShift(input: ManualShiftInput) {
    if (!currentScheduleImportId) return;

    setManualShiftError("");
    setIsSavingManualShift(true);
    try {
      const savedShift = await addManualShiftRequest({
        scheduleImportId: currentScheduleImportId,
        ...input
      });
      setShifts((current) => [...current, savedShift]);
      if (!isLifeguardRotationDepartment(savedShift.departmentLabel)) {
        const nextDepartmentId = departmentIdFromName(savedShift.departmentLabel);
        const nextPositionLists = withDefaultLists(positionLists, [savedShift.departmentLabel]);
        setPositionLists(nextPositionLists);
        setSelectedListIds((current) => ({
          ...current,
          ...selectedListIdsForDepartments(nextPositionLists, [savedShift.departmentLabel])
        }));
        setSelectedDate(savedShift.shiftDate);
        setSelectedDepartment(savedShift.departmentLabel);
        if (!selectedListIds[nextDepartmentId]) {
          setAssignmentSaveState("idle");
        }
      }
    } catch (caught) {
      setManualShiftError(caught instanceof Error ? caught.message : "Manual shift could not be saved");
    } finally {
      setIsSavingManualShift(false);
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
      if (isSavedPositionList(listToDelete)) {
        await deletePositionListRequest(listToDelete.id);
      }

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
          disabled={positionShifts.length === 0}
        >
          Positions
        </button>
        <button
          type="button"
          className={view === "assign" ? "is-active" : undefined}
          onClick={() => setView("assign")}
          disabled={positionShifts.length === 0}
        >
          Assign
        </button>
        <button
          type="button"
          className={view === "rotations" ? "is-active" : undefined}
          onClick={() => setView("rotations")}
          disabled={rotationShifts.length === 0}
        >
          Rotations
        </button>
        <button
          type="button"
          className={view === "print" ? "is-active" : undefined}
          onClick={() => setView("print")}
          disabled={positionShifts.length === 0}
        >
          Print
        </button>
      </nav>

      {shifts.length > 0 && view !== "import" ? (
        <>
          <ManualShiftForm
            dates={allDates}
            departments={allDepartments}
            defaultDate={defaultManualDate}
            defaultDepartment={defaultManualDepartment}
            isSaving={isSavingManualShift}
            onAdd={addManualShift}
          />
          {manualShiftError ? <p className="app-alert no-print" role="alert">{manualShiftError}</p> : null}
          <CalloutManager shifts={shifts} calloutShiftIds={calloutShiftIds} onToggleCallout={toggleCallout} />
        </>
      ) : null}

      {positionShifts.length > 0 && view !== "import" && view !== "rotations" ? (
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
        <ImportPanel
          onDraft={confirmImport}
          isImporting={isConfirming}
          externalError={confirmError}
          savedSchedules={savedSchedules}
          onRequestSavedSchedules={refreshSavedSchedules}
          onLoadSavedSchedule={loadSavedSchedule}
          onDeleteSavedSchedule={deleteSavedSchedule}
          isLoadingSavedSchedules={isLoadingSavedSchedules}
          isLoadingSavedSchedule={isLoadingSavedSchedule}
          savedScheduleError={savedScheduleError}
        />
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
          <AssignmentPersistenceActions
            canUse={visibleShifts.length > 0}
            saveState={assignmentSaveState}
            onSave={saveCurrentAssignments}
            onLoad={loadCurrentAssignments}
          />
          <AssignmentBoard
            positions={selectedPositions}
            shifts={visibleShifts}
            assignments={assignments}
            onChange={(nextAssignments) => {
              setAssignments(nextAssignments);
              setAssignmentSaveState("idle");
            }}
          />
        </section>
      ) : null}

      {view === "rotations" ? <RotationBuilder shifts={rotationShifts} /> : null}

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
