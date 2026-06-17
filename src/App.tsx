import { useEffect, useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { AssignmentPersistenceActions, type PersistenceState } from "./components/AssignmentPersistenceActions";
import { CalloutManager } from "./components/CalloutManager";
import { DayDepartmentPicker } from "./components/DayDepartmentPicker";
import { ImportPanel } from "./components/ImportPanel";
import { ManualShiftForm } from "./components/ManualShiftForm";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView, type PrintMode } from "./components/PrintView";
import { RotationBuilder } from "./components/RotationBuilder";
import { Shell } from "./components/Shell";
import type { Assignment, ManualShiftInput, ParsedScheduleDraft, PositionList, SavedScheduleSummary, Shift } from "./domain/types";
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
  savePositionList as savePositionListRequest,
  loadRotationPlan as loadRotationPlanRequest,
  saveRotationPlan as saveRotationPlanRequest
} from "./lib/storageClient";
import {
  addLocalManualShift,
  deleteLocalPositionList,
  deleteLocalSchedule,
  importLocalSchedule,
  listLocalSchedules,
  loadLocalAssignmentPlan,
  loadLocalPositionLists,
  loadLocalRotationPlan,
  loadLocalSchedule,
  loadLocalWorkspace,
  saveLocalAssignmentPlan,
  saveLocalPositionList,
  saveLocalRotationPlan,
  saveLocalWorkspace
} from "./lib/localStorageClient";
import { readDatabaseConnected, writeDatabaseConnected } from "./lib/storageMode";
import { defaultListForDepartment, departmentIdFromName, starterPositions } from "./domain/defaultPositionLists";

type View = "import" | "assign" | "rotations";

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

function isLifeguardRotationText(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("shallow") || normalized.includes("special facilit");
}

function isLifeguardRotationShift(shift: Pick<Shift, "departmentLabel" | "sourceNotes">) {
  return isLifeguardRotationText(`${shift.departmentLabel} ${shift.sourceNotes ?? ""}`);
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
  const [databaseConnected, setDatabaseConnected] = useState(readDatabaseConnected);
  const [isPositionEditorOpen, setIsPositionEditorOpen] = useState(false);
  const [crewPrintMode, setCrewPrintMode] = useState<PrintMode>("sign-in");

  useEffect(() => {
    let isMounted = true;

    async function loadSavedLists() {
      try {
        const savedLists = databaseConnected ? await loadPositionLists() : loadLocalPositionLists();
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
  }, [databaseConnected]);

  const activeShifts = useMemo(
    () => shifts.filter((shift) => !calloutShiftIds[shift.id]),
    [calloutShiftIds, shifts]
  );
  const positionShifts = useMemo(
    () => activeShifts.filter((shift) => !isLifeguardRotationShift(shift)),
    [activeShifts]
  );

  useEffect(() => {
    if (databaseConnected || positionShifts.length === 0) return;
    const localDepartments = uniqueSorted(positionShifts.map((shift) => shift.departmentLabel));
    setPositionLists((current) => {
      const next = withDefaultLists(current, localDepartments);
      return next.length === current.length ? current : next;
    });
    setSelectedListIds((current) => {
      const next = { ...current };
      let changed = false;

      localDepartments.forEach((departmentName) => {
        const departmentId = departmentIdFromName(departmentName);
        if (!next[departmentId]) {
          next[departmentId] = positionLists.find((list) => list.departmentId === departmentId)?.id ?? defaultListForDepartment(departmentName).id;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [databaseConnected, positionShifts, positionLists]);
  const rotationShifts = useMemo(
    () => activeShifts.filter((shift) => isLifeguardRotationShift(shift)),
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

  function persistLocalWorkspace(nextCalloutShiftIds: Record<string, boolean>, scheduleImportId = currentScheduleImportId) {
    if (!databaseConnected && scheduleImportId) {
      saveLocalWorkspace({ scheduleImportId, calloutShiftIds: nextCalloutShiftIds });
    }
  }

  function toggleCallout(shiftId: string) {
    setCalloutShiftIds((current) => {
      const next = { ...current, [shiftId]: !current[shiftId] };
      persistLocalWorkspace(next);
      return next;
    });
    setAssignments((current) => current.filter((assignment) => assignment.shiftId !== shiftId));
  }

  function loadShiftsIntoWorkspace(nextShifts: Shift[]) {
    const nextPositionShifts = nextShifts.filter((shift) => !isLifeguardRotationShift(shift));
    const nextRotationShifts = nextShifts.filter((shift) => isLifeguardRotationShift(shift));
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
    setIsPositionEditorOpen(false);
    setView(nextDepartments.length > 0 ? "assign" : nextRotationShifts.length > 0 ? "rotations" : "import");
  }

  useEffect(() => {
    if (databaseConnected) return;
    const workspace = loadLocalWorkspace();
    const schedule = workspace ? loadLocalSchedule(workspace.scheduleImportId) : null;
    if (schedule) {
      loadShiftsIntoWorkspace(schedule.shifts);
      setCalloutShiftIds(workspace?.calloutShiftIds ?? {});
    }
  }, [databaseConnected]);

  function changeDatabaseConnected(connected: boolean) {
    writeDatabaseConnected(connected);
    setDatabaseConnected(connected);
    setConfirmError("");
    setPositionListError("");
    setSavedScheduleError("");
    setAssignmentSaveState("idle");
  }

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    setConfirmError("");
    setIsConfirming(true);
    try {
      if (!databaseConnected) {
        const schedule = importLocalSchedule(reviewed);
        loadShiftsIntoWorkspace(schedule.shifts);
        persistLocalWorkspace({}, schedule.importId);
        return;
      }
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
      setSavedSchedules(databaseConnected ? await listSavedSchedulesRequest() : listLocalSchedules());
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
      const schedule = databaseConnected
        ? await loadSavedScheduleRequest(scheduleImportId)
        : loadLocalSchedule(scheduleImportId);
      if (!schedule) {
        setSavedScheduleError("Saved schedule could not be found");
        return;
      }
      loadShiftsIntoWorkspace(schedule.shifts);
      persistLocalWorkspace({}, schedule.importId);
    } catch (caught) {
      setSavedScheduleError(caught instanceof Error ? caught.message : "Saved schedule could not be loaded");
    } finally {
      setIsLoadingSavedSchedule(false);
    }
  }

  async function deleteSavedSchedule(scheduleImportId: string) {
    setSavedScheduleError("");
    try {
      if (databaseConnected) {
        await deleteSavedScheduleRequest(scheduleImportId);
      } else {
        deleteLocalSchedule(scheduleImportId);
      }
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
      const plan = {
        scheduleImportId,
        planDate: currentDate,
        departmentLabel: currentDepartment,
        positionListId: selectedList?.id ?? selectedListId,
        positionsSnapshot: selectedPositions,
        assignments: assignments.filter((assignment) => visibleShiftIds.has(assignment.shiftId))
      };
      if (databaseConnected) {
        await saveAssignmentPlanRequest(plan);
      } else {
        saveLocalAssignmentPlan(plan);
      }
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
      const query = {
        scheduleImportId,
        planDate: currentDate,
        departmentLabel: currentDepartment
      };
      const plan = databaseConnected ? await loadAssignmentPlanRequest(query) : loadLocalAssignmentPlan(query);

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
      const request = {
        scheduleImportId: currentScheduleImportId,
        ...input
      };
      const savedShift = databaseConnected ? await addManualShiftRequest(request) : addLocalManualShift(request);
      setShifts((current) => [...current, savedShift]);
      persistLocalWorkspace(calloutShiftIds, savedShift.scheduleImportId);
      if (!isLifeguardRotationShift(savedShift)) {
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
      const savedList = databaseConnected ? await savePositionListRequest(nextList) : saveLocalPositionList(nextList);
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
      if (databaseConnected && isSavedPositionList(listToDelete)) {
        await deletePositionListRequest(listToDelete.id);
      } else if (!databaseConnected) {
        deleteLocalPositionList(listToDelete.id);
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
    setIsPositionEditorOpen(false);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setAssignments([]);
    setIsPositionEditorOpen(false);
  }

  return (
    <Shell databaseConnected={databaseConnected} onDatabaseConnectedChange={changeDatabaseConnected}>
      <div className="workflow-bar no-print">
        <nav className="tabs" aria-label="Workflow">
          <button
            type="button"
            className={view === "import" ? "is-active" : undefined}
            onClick={() => setView("import")}
          >
            Import
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
        </nav>
        <div className="workflow-bar__actions" id="workflow-actions-root" aria-label="Workflow actions" />
      </div>

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
          databaseConnected={databaseConnected}
          onRequestSavedSchedules={refreshSavedSchedules}
          onLoadSavedSchedule={loadSavedSchedule}
          onDeleteSavedSchedule={deleteSavedSchedule}
          isLoadingSavedSchedules={isLoadingSavedSchedules}
          isLoadingSavedSchedule={isLoadingSavedSchedule}
          savedScheduleError={savedScheduleError}
        />
      ) : null}

      {view === "assign" ? (
        <>
          {positionListError ? <p className="app-alert" role="alert">{positionListError}</p> : null}
          <section className="panel panel--workspace">
            <div className="section-heading no-print">
              <div>
                <h2>{currentDepartment} Assignments</h2>
                <p>{currentDate}</p>
              </div>
              <div className="section-heading__actions no-print">
                <span>{selectedList?.name ?? "Default list"}</span>
                <label className="compact-field">
                  <span>Print layout</span>
                  <select value={crewPrintMode} onChange={(event) => setCrewPrintMode(event.target.value as PrintMode)}>
                    <option value="sign-in">Sign-in sheet</option>
                    <option value="simple">Simple list</option>
                  </select>
                </label>
                <button type="button" onClick={() => window.print()} disabled={visibleShifts.length === 0}>
                  Print crew list
                </button>
                <button type="button" onClick={() => setIsPositionEditorOpen((current) => !current)}>
                  {isPositionEditorOpen ? "Done editing positions" : "Edit positions"}
                </button>
              </div>
            </div>
            <AssignmentPersistenceActions
              canUse={visibleShifts.length > 0}
              saveState={assignmentSaveState}
              onSave={saveCurrentAssignments}
              onLoad={loadCurrentAssignments}
            />
            {isPositionEditorOpen ? (
              <div className="no-print">
                <PositionListEditor
                  departmentName={currentDepartment}
                  positionLists={departmentLists}
                  selectedListId={selectedListId}
                  onSelectList={(listId) => setSelectedListIds((current) => ({ ...current, [currentDepartmentId]: listId }))}
                  onCreateList={createPositionList}
                  onDeleteList={deletePositionList}
                  onSaveList={savePositionList}
                  embedded
                  initiallyEditing
                />
              </div>
            ) : null}
            <div className="no-print">
              <AssignmentBoard
                positions={selectedPositions}
                shifts={visibleShifts}
                assignments={assignments}
                onChange={(nextAssignments) => {
                  setAssignments(nextAssignments);
                  setAssignmentSaveState("idle");
                }}
              />
            </div>
            <PrintView
              departmentName={currentDepartment}
              date={currentDate}
              positions={selectedPositions}
              shifts={visibleShifts}
              assignments={assignments}
              printMode={crewPrintMode}
              onPrintModeChange={setCrewPrintMode}
              showActions={false}
            />
          </section>
        </>
      ) : null}

      {view === "rotations" ? (
        <RotationBuilder
          shifts={rotationShifts}
          onSavePlan={databaseConnected ? saveRotationPlanRequest : async (plan) => saveLocalRotationPlan(plan)}
          onLoadPlan={databaseConnected ? loadRotationPlanRequest : async (query) => loadLocalRotationPlan(query)}
        />
      ) : null}

    </Shell>
  );
}
