import { useEffect, useMemo, useState } from "react";
import type { RotationPlanRequest, SavedRotationPlan, Shift } from "../domain/types";
import { loadRotationPlan, saveRotationPlan } from "../lib/storageClient";
import { formatShiftRange } from "../lib/time";
import type { PersistenceState } from "./AssignmentPersistenceActions";
import { WorkflowActionsPortal } from "./WorkflowActionsPortal";
import "./RotationBuilder.css";

type RotationKind = "special" | "shallow";
type RotationTone = "orange" | "cyan" | "green";
type SupportRole = "captains" | "slideAttendants" | "groundCrew";
type RotationPrintLayout = "assigned" | "handout" | "break-sheet";

interface RotationPosition {
  id: string;
  label: string;
}

interface RotationDefinition {
  id: string;
  title: string;
  subtitle: string;
  kind: RotationKind;
  tone: RotationTone;
  positions: RotationPosition[];
}

interface RotationBuilderProps {
  shifts: Shift[];
  onSavePlan?: (plan: RotationPlanRequest) => Promise<SavedRotationPlan>;
  onLoadPlan?: (params: Pick<RotationPlanRequest, "scheduleImportId" | "planDate">) => Promise<SavedRotationPlan | null>;
}

const storageKey = "lifeguard-rotation-templates-v1";

const defaultRotations: RotationDefinition[] = [
  {
    id: "special-facilities",
    title: "Special Facilities",
    subtitle: "Red Shorts",
    kind: "special",
    tone: "orange",
    positions: [
      { id: "top-of-blaster", label: "Top of Blaster" },
      { id: "top-of-camille", label: "Top of Camille" },
      { id: "wave-3", label: "Wave 3" },
      { id: "wave-beach", label: "Wave Beach" },
      { id: "break-1", label: "Break" },
      { id: "top-of-racer", label: "Top of Racer" },
      { id: "top-of-shipwreck", label: "Top of Shipwreck" },
      { id: "top-of-beacon", label: "Top of Beacon" },
      { id: "wave-1", label: "Wave 1" },
      { id: "break-2", label: "Break" }
    ]
  },
  {
    id: "shallow-one",
    title: "Shallow Rotation 1",
    subtitle: "Blue/Red",
    kind: "shallow",
    tone: "cyan",
    positions: [
      { id: "bottom-of-blaster", label: "Bottom of Blaster" },
      { id: "bottom-of-camille", label: "Bottom of Camille" },
      { id: "splashpads-by-blaster", label: "Splashpads by Blaster" },
      { id: "ground-queue-blaster", label: "Ground Queue Blaster" },
      { id: "river-6", label: "River 6" },
      { id: "break-1", label: "Break" },
      { id: "long-beach", label: "Long Beach" },
      { id: "river-7", label: "River 7" },
      { id: "river-8", label: "River 8" },
      { id: "bottom-of-shipwreck", label: "Bottom of Shipwreck" },
      { id: "ground-queue-beacon", label: "Ground Queue Beacon" },
      { id: "break-2", label: "Break" }
    ]
  },
  {
    id: "shallow-two",
    title: "Shallow Rotation 2",
    subtitle: "Blue/Red",
    kind: "shallow",
    tone: "green",
    positions: [
      { id: "bottom-of-racer", label: "Bottom of Racer" },
      { id: "river-4", label: "River 4" },
      { id: "ground-queue-racer", label: "Ground Queue Racer" },
      { id: "kids-beach", label: "Kids Beach" },
      { id: "river-3", label: "River 3" },
      { id: "break-1", label: "Break" },
      { id: "b-beacon", label: "B. Beacon" },
      { id: "pads", label: "Pads" },
      { id: "river-5", label: "River 5" },
      { id: "river-2", label: "River 2" },
      { id: "river-1", label: "River 1" },
      { id: "break-2", label: "Break" }
    ]
  }
];

const slideAttendantPositionPreferences = [
  ["top of beacon"],
  ["top of blaster"],
  ["top of camille", "top of camile"],
  ["top of racer"]
];

const groundCrewPositionPreferences = [
  ["ground queue blaster"],
  ["ground queue beacon"],
  ["ground queue racer"]
];

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function shiftSearchText(shift: Shift) {
  return `${shift.departmentLabel} ${shift.sourceNotes ?? ""}`.toLowerCase();
}

function isSpecialFacilitiesShift(shift: Shift) {
  return shiftSearchText(shift).includes("special facilit");
}

function isShallowShift(shift: Shift) {
  return shiftSearchText(shift).includes("shallow");
}

function isSlideAttendantShift(shift: Shift) {
  return shiftSearchText(shift).includes("slide attendant");
}

function isGroundCrewShift(shift: Shift) {
  const text = shiftSearchText(shift);
  return text.includes("ground crew") || text.includes("ground queue");
}

function assignmentKey(rotationId: string, positionId: string) {
  return `${rotationId}:${positionId}`;
}

function slugFromLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "position";
}

function formatEmployeeName(employeeName: string) {
  const trimmed = employeeName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(",");

  if (parts.length > 1) {
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(",").trim();
    if (firstName && lastName) return `${firstName} ${lastName}`;
  }

  return trimmed;
}

function employeeOptionLabel(shift: Shift) {
  return formatEmployeeName(shift.employeeName);
}

function normalizedPositionLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function handoutTitle(rotation: RotationDefinition) {
  if (rotation.kind === "shallow") return rotation.subtitle ? `Shallow (${rotation.subtitle})` : "Shallow";
  return rotation.subtitle ? `${rotation.title} (${rotation.subtitle})` : rotation.title;
}

function eligibleShifts(rotation: RotationDefinition, shifts: Shift[]) {
  if (rotation.kind === "special") {
    return shifts.filter((shift) => isSpecialFacilitiesShift(shift) && !isSlideAttendantShift(shift) && !isGroundCrewShift(shift));
  }

  return shifts.filter(
    (shift) => !isSlideAttendantShift(shift) && !isGroundCrewShift(shift) && (isSpecialFacilitiesShift(shift) || isShallowShift(shift))
  );
}

function preferredAssignmentKeys(rotations: RotationDefinition[], preferences: string[][]) {
  return preferences.flatMap((labelOptions) => {
    const normalizedOptions = new Set(labelOptions.map(normalizedPositionLabel));

    for (const rotation of rotations) {
      const position = rotation.positions.find((candidate) => normalizedOptions.has(normalizedPositionLabel(candidate.label)));
      if (position) return [assignmentKey(rotation.id, position.id)];
    }

    return [];
  });
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function loadRotationTemplates() {
  if (typeof window === "undefined") return defaultRotations;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultRotations;

    const parsed = JSON.parse(saved) as RotationDefinition[];
    if (!Array.isArray(parsed)) return defaultRotations;
    if (!parsed.every((rotation) => rotation.id && Array.isArray(rotation.positions))) return defaultRotations;

    return parsed;
  } catch {
    return defaultRotations;
  }
}

function isRotationKind(value: string): value is RotationKind {
  return value === "special" || value === "shallow";
}

function isRotationTone(value: string): value is RotationTone {
  return value === "orange" || value === "cyan" || value === "green";
}

function restoreRotationTemplates(savedTemplates: unknown): RotationDefinition[] {
  if (!Array.isArray(savedTemplates)) return defaultRotations;

  const restored = savedTemplates
    .map((rotation) => {
      if (!rotation || typeof rotation !== "object") return null;
      const candidate = rotation as Partial<RotationDefinition>;
      const kind = String(candidate.kind);
      const tone = String(candidate.tone);
      if (!candidate.id || !candidate.title || !isRotationKind(kind) || !isRotationTone(tone)) {
        return null;
      }

      return {
        id: String(candidate.id),
        title: String(candidate.title),
        subtitle: String(candidate.subtitle ?? ""),
        kind,
        tone,
        positions: Array.isArray(candidate.positions)
          ? candidate.positions
              .filter((position) => position?.id && position?.label)
              .map((position) => ({ id: String(position.id), label: String(position.label) }))
          : []
      } satisfies RotationDefinition;
    })
    .filter((rotation): rotation is RotationDefinition => Boolean(rotation));

  return restored.length > 0 ? restored : defaultRotations;
}

function rotationStatusMessage(saveState: PersistenceState) {
  if (saveState === "saving") return "Saving rotations...";
  if (saveState === "saved") return "Rotations saved.";
  if (saveState === "loading") return "Loading saved rotations...";
  if (saveState === "loaded") return "Saved rotations loaded.";
  if (saveState === "empty") return "No saved rotations found for this date.";
  if (saveState === "error") return "Rotations could not be saved or loaded.";
  return "";
}

export function RotationBuilder({ shifts, onSavePlan = saveRotationPlan, onLoadPlan = loadRotationPlan }: RotationBuilderProps) {
  const dates = useMemo(() => uniqueSorted(shifts.map((shift) => shift.shiftDate)), [shifts]);
  const [selectedDate, setSelectedDate] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [supportAssignments, setSupportAssignments] = useState<Record<SupportRole, string[]>>({
    captains: [],
    slideAttendants: [],
    groundCrew: []
  });
  const [rotationTemplates, setRotationTemplates] = useState<RotationDefinition[]>(loadRotationTemplates);
  const [newPositionLabels, setNewPositionLabels] = useState<Record<string, string>>({});
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isSupportCollapsed, setIsSupportCollapsed] = useState(false);
  const [rotationSaveState, setRotationSaveState] = useState<PersistenceState>("idle");
  const [printLayout, setPrintLayout] = useState<RotationPrintLayout>("assigned");
  const slideAttendantAssignmentKeySet = useMemo(
    () => new Set(preferredAssignmentKeys(rotationTemplates, slideAttendantPositionPreferences)),
    [rotationTemplates]
  );
  const groundCrewAssignmentKeySet = useMemo(
    () => new Set(preferredAssignmentKeys(rotationTemplates, groundCrewPositionPreferences)),
    [rotationTemplates]
  );

  useEffect(() => {
    if (!selectedDate && dates[0]) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(rotationTemplates));
    }
  }, [rotationTemplates]);

  const currentDate = selectedDate || dates[0] || "";
  const dateShifts = useMemo(
    () => shifts.filter((shift) => shift.shiftDate === currentDate),
    [currentDate, shifts]
  );
  const automaticSlideAttendantIds = useMemo(
    () => dateShifts.filter(isSlideAttendantShift).map((shift) => shift.id),
    [dateShifts]
  );
  const automaticGroundCrewIds = useMemo(
    () => dateShifts.filter(isGroundCrewShift).map((shift) => shift.id),
    [dateShifts]
  );

  useEffect(() => {
    const activeShiftIds = new Set(shifts.map((shift) => shift.id));
    const supportShiftIds = new Set(
      shifts.filter((shift) => isSlideAttendantShift(shift) || isGroundCrewShift(shift)).map((shift) => shift.id)
    );

    setAssignments((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, shiftId]) => activeShiftIds.has(shiftId) && !supportShiftIds.has(shiftId))
      )
    );
    setSupportAssignments((current) => ({
      captains: current.captains.filter((shiftId) => activeShiftIds.has(shiftId)),
      slideAttendants: uniqueValues([
        ...current.slideAttendants.filter((shiftId) => activeShiftIds.has(shiftId)),
        ...automaticSlideAttendantIds
      ]),
      groundCrew: uniqueValues([
        ...current.groundCrew.filter((shiftId) => activeShiftIds.has(shiftId)),
        ...automaticGroundCrewIds
      ])
    }));
  }, [automaticGroundCrewIds, automaticSlideAttendantIds, shifts]);

  const currentScheduleImportId = dateShifts[0]?.scheduleImportId ?? "";
  const assignedShiftIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments]
  );
  const supportShiftIds = useMemo(
    () => new Set([...supportAssignments.captains, ...supportAssignments.slideAttendants, ...supportAssignments.groundCrew]),
    [supportAssignments]
  );
  const unassignedShifts = dateShifts.filter(
    (shift) => !assignedShiftIds.has(shift.id) && !supportShiftIds.has(shift.id)
  );
  const specialCount = dateShifts.filter(isSpecialFacilitiesShift).length;
  const shallowCount = dateShifts.filter(isShallowShift).length;
  const supportCount = dateShifts.filter((shift) => supportShiftIds.has(shift.id)).length;
  const captainShifts = supportAssignments.captains
    .map((shiftId) => dateShifts.find((shift) => shift.id === shiftId))
    .filter((shift): shift is Shift => Boolean(shift));
  const slideAttendantShifts = supportAssignments.slideAttendants
    .map((shiftId) => dateShifts.find((shift) => shift.id === shiftId))
    .filter((shift): shift is Shift => Boolean(shift));
  const groundCrewShifts = supportAssignments.groundCrew
    .map((shiftId) => dateShifts.find((shift) => shift.id === shiftId))
    .filter((shift): shift is Shift => Boolean(shift));
  const captainOptions = dateShifts.filter(
    (shift) => isSpecialFacilitiesShift(shift) && !supportShiftIds.has(shift.id) && !assignedShiftIds.has(shift.id)
  );
  const slideAttendantOptions = dateShifts.filter(
    (shift) => (isShallowShift(shift) || isSlideAttendantShift(shift)) && !supportShiftIds.has(shift.id) && !assignedShiftIds.has(shift.id)
  );
  const groundCrewOptions = dateShifts.filter(
    (shift) => isGroundCrewShift(shift) && !supportShiftIds.has(shift.id) && !assignedShiftIds.has(shift.id)
  );
  const startingPositionsByShiftId = useMemo(() => {
    const next = new Map<string, string>();

    Object.entries(assignments).forEach(([key, shiftId]) => {
      if (!shiftId || next.has(shiftId)) return;
      const [rotationId, positionId] = key.split(":");
      const rotation = rotationTemplates.find((candidate) => candidate.id === rotationId);
      const position = rotation?.positions.find((candidate) => candidate.id === positionId);
      if (position) next.set(shiftId, position.label);
    });

    return next;
  }, [assignments, rotationTemplates]);
  const breakSheetRows = useMemo(
    () =>
      [...dateShifts]
        .map((shift) => ({
          employeeName: formatEmployeeName(shift.employeeName),
          id: shift.id,
          startingPosition: startingPositionsByShiftId.get(shift.id) || ""
        }))
        .sort((first, second) => first.employeeName.localeCompare(second.employeeName)),
    [dateShifts, startingPositionsByShiftId]
  );
  const breakSheetBlankRows = Array.from({ length: 8 }, (_, index) => index);

  function selectDate(date: string) {
    setSelectedDate(date);
    setAssignments({});
    setSupportAssignments({ captains: [], slideAttendants: [], groundCrew: [] });
    setRotationSaveState("idle");
  }

  function selectAssignment(key: string, shiftId: string) {
    setAssignments((current) => ({ ...current, [key]: shiftId }));
    setRotationSaveState("idle");
  }

  function addSupportAssignment(role: SupportRole, shiftId: string) {
    if (!shiftId) return;

    setSupportAssignments((current) => ({
      ...current,
      [role]: current[role].includes(shiftId) ? current[role] : [...current[role], shiftId]
    }));
    setAssignments((current) =>
      Object.fromEntries(Object.entries(current).filter(([, assignedShiftId]) => assignedShiftId !== shiftId))
    );
    setRotationSaveState("idle");
  }

  function removeSupportAssignment(role: SupportRole, shiftId: string) {
    setSupportAssignments((current) => ({
      ...current,
      [role]: current[role].filter((currentShiftId) => currentShiftId !== shiftId)
    }));
    setRotationSaveState("idle");
  }

  function autofillRotations() {
    const availableShiftIds = new Set(
      dateShifts.filter((shift) => !supportShiftIds.has(shift.id)).map((shift) => shift.id)
    );
    const nextAssignments: Record<string, string> = {};
    const slideAssignmentKeys = preferredAssignmentKeys(rotationTemplates, slideAttendantPositionPreferences);
    const groundAssignmentKeys = preferredAssignmentKeys(rotationTemplates, groundCrewPositionPreferences);
    const dateShiftIds = new Set(dateShifts.map((shift) => shift.id));
    const usedSupportShiftIds = new Set<string>();
    const remainingGroundAssignmentKeys = [...groundAssignmentKeys];

    function assignSupportShift(shiftId: string, assignmentKey: string | undefined) {
      if (!assignmentKey || !dateShiftIds.has(shiftId)) return false;

      nextAssignments[assignmentKey] = shiftId;
      usedSupportShiftIds.add(shiftId);
      return true;
    }

    supportAssignments.slideAttendants.slice(0, slideAssignmentKeys.length).forEach((shiftId, index) => {
      assignSupportShift(shiftId, slideAssignmentKeys[index]);
    });

    supportAssignments.groundCrew.forEach((shiftId) => {
      if (assignSupportShift(shiftId, remainingGroundAssignmentKeys[0])) {
        remainingGroundAssignmentKeys.shift();
      }
    });

    supportAssignments.slideAttendants
      .filter((shiftId) => !usedSupportShiftIds.has(shiftId))
      .forEach((shiftId) => {
        if (assignSupportShift(shiftId, remainingGroundAssignmentKeys[0])) {
          remainingGroundAssignmentKeys.shift();
        }
      });

    rotationTemplates.forEach((rotation) => {
      rotation.positions.forEach((position) => {
        const key = assignmentKey(rotation.id, position.id);
        if (nextAssignments[key]) return;

        const candidates = shuffle(
          eligibleShifts(rotation, dateShifts).filter((shift) => availableShiftIds.has(shift.id))
        );
        const selectedShift = candidates[0];

        if (selectedShift) {
          nextAssignments[key] = selectedShift.id;
          availableShiftIds.delete(selectedShift.id);
        }
      });
    });

    setAssignments(nextAssignments);
    setRotationSaveState("idle");
  }

  function clearAssignments() {
    setAssignments({});
    setRotationSaveState("idle");
  }

  function updatePositionLabel(rotationId: string, positionId: string, label: string) {
    setRotationTemplates((current) =>
      current.map((rotation) =>
        rotation.id === rotationId
          ? {
              ...rotation,
              positions: rotation.positions.map((position) =>
                position.id === positionId ? { ...position, label } : position
              )
            }
          : rotation
      )
    );
    setRotationSaveState("idle");
  }

  function movePosition(rotationId: string, positionId: string, direction: -1 | 1) {
    setRotationTemplates((current) =>
      current.map((rotation) => {
        if (rotation.id !== rotationId) return rotation;

        const currentIndex = rotation.positions.findIndex((position) => position.id === positionId);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= rotation.positions.length) return rotation;

        const nextPositions = [...rotation.positions];
        const [position] = nextPositions.splice(currentIndex, 1);
        nextPositions.splice(nextIndex, 0, position);
        return { ...rotation, positions: nextPositions };
      })
    );
    setRotationSaveState("idle");
  }

  function removePosition(rotationId: string, positionId: string) {
    setRotationTemplates((current) =>
      current.map((rotation) =>
        rotation.id === rotationId
          ? { ...rotation, positions: rotation.positions.filter((position) => position.id !== positionId) }
          : rotation
      )
    );
    setAssignments((current) => {
      const next = { ...current };
      delete next[assignmentKey(rotationId, positionId)];
      return next;
    });
    setRotationSaveState("idle");
  }

  function addPosition(rotationId: string) {
    const label = (newPositionLabels[rotationId] || "").trim();
    if (!label) return;

    setRotationTemplates((current) =>
      current.map((rotation) => {
        if (rotation.id !== rotationId) return rotation;

        const baseId = slugFromLabel(label);
        const existingIds = new Set(rotation.positions.map((position) => position.id));
        let id = baseId;
        let suffix = 2;
        while (existingIds.has(id)) {
          id = `${baseId}-${suffix}`;
          suffix += 1;
        }

        return { ...rotation, positions: [...rotation.positions, { id, label }] };
      })
    );
    setNewPositionLabels((current) => ({ ...current, [rotationId]: "" }));
    setRotationSaveState("idle");
  }

  function resetRotations() {
    setRotationTemplates(defaultRotations);
    setAssignments({});
    setNewPositionLabels({});
    setRotationSaveState("idle");
  }

  async function saveCurrentRotationPlan() {
    if (!currentScheduleImportId || !currentDate) return;

    setRotationSaveState("saving");
    try {
      await onSavePlan({
        scheduleImportId: currentScheduleImportId,
        planDate: currentDate,
        rotationTemplates,
        assignments,
        supportAssignments
      });
      setRotationSaveState("saved");
    } catch {
      setRotationSaveState("error");
    }
  }

  async function loadCurrentRotationPlan() {
    if (!currentScheduleImportId || !currentDate) return;

    setRotationSaveState("loading");
    try {
      const plan = await onLoadPlan({ scheduleImportId: currentScheduleImportId, planDate: currentDate });
      if (!plan) {
        setRotationSaveState("empty");
        return;
      }

      setRotationTemplates(restoreRotationTemplates(plan.rotationTemplates));
      setAssignments(plan.assignments);
      setSupportAssignments({ ...plan.supportAssignments, groundCrew: plan.supportAssignments.groundCrew ?? [] });
      setRotationSaveState("loaded");
    } catch {
      setRotationSaveState("error");
    }
  }

  function renderSupportGroup(title: string, role: SupportRole, assignedShifts: Shift[], options: Shift[]) {
    return (
      <div className="rotation-support__group">
        <label>
          <span>{title}</span>
          <select value="" onChange={(event) => addSupportAssignment(role, event.target.value)}>
            <option value="">Add person</option>
            {options.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {employeeOptionLabel(shift)}
              </option>
            ))}
          </select>
        </label>
        {assignedShifts.length > 0 ? (
          <ul>
            {assignedShifts.map((shift) => (
              <li key={shift.id}>
                <strong>{formatEmployeeName(shift.employeeName)}</strong>
                <span>{formatShiftRange(shift.startTime, shift.endTime)}</span>
                <button type="button" className="no-print" onClick={() => removeSupportAssignment(role, shift.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>None assigned.</p>
        )}
      </div>
    );
  }

  return (
    <section className={`panel rotation-builder rotation-builder--print-${printLayout}`}>
      <div className="section-heading rotation-builder__heading">
        <div>
          <h2>Lifeguard Rotations</h2>
          <p>Special Facilities can fill any rotation. Shallow lifeguards stay on shallow rotations.</p>
        </div>
        <div className="rotation-builder__toolbar no-print">
          <label>
            <span>Date</span>
            <select value={currentDate} onChange={(event) => selectDate(event.target.value)}>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={autofillRotations} disabled={dateShifts.length === 0 || isEditingTemplate}>
            Autofill
          </button>
          <button type="button" onClick={clearAssignments} disabled={Object.keys(assignments).length === 0 || isEditingTemplate}>
            Clear
          </button>
          <button type="button" onClick={() => setIsEditingTemplate((current) => !current)}>
            {isEditingTemplate ? "Done editing" : "Edit rotations"}
          </button>
          {isEditingTemplate ? (
            <button type="button" onClick={resetRotations}>
              Reset default
            </button>
          ) : null}
          <label>
            <span>Print layout</span>
            <select value={printLayout} onChange={(event) => setPrintLayout(event.target.value as RotationPrintLayout)}>
              <option value="assigned">Assigned Rotations</option>
              <option value="handout">Rotation Handout</option>
              <option value="break-sheet">Break Sheet</option>
            </select>
          </label>
          <button type="button" onClick={() => window.print()} disabled={dateShifts.length === 0}>
            Print rotations
          </button>
        </div>
      </div>

      <WorkflowActionsPortal>
        <div className="rotation-builder__header-actions" role="group" aria-label="Header actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => void saveCurrentRotationPlan()}
            disabled={!currentScheduleImportId || isEditingTemplate}
          >
            Save rotations
          </button>
          <button type="button" onClick={() => void loadCurrentRotationPlan()} disabled={!currentScheduleImportId || isEditingTemplate}>
            Load saved rotations
          </button>
        </div>
      </WorkflowActionsPortal>

      {dateShifts.length === 0 ? (
        <p className="app-alert" role="alert">
          No Special Facilities or Shallow Lifeguard shifts were found for this date.
        </p>
      ) : (
        <>
          {rotationStatusMessage(rotationSaveState) ? (
            <p className="rotation-builder__status no-print" role="status">
              {rotationStatusMessage(rotationSaveState)}
            </p>
          ) : null}

          {printLayout === "handout" ? (
            <section className="rotation-print-handout" aria-label="Daily rotation handout">
              {rotationTemplates.map((rotation) => (
                <section key={rotation.id} className={`rotation-print-handout__card rotation-print-handout__card--${rotation.tone}`}>
                  <h3>{handoutTitle(rotation)}</h3>
                  <ol>
                    {rotation.positions.map((position) => (
                      <li key={position.id} className={position.label.toLowerCase().includes("break") ? "is-break" : undefined}>
                        {position.label}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </section>
          ) : printLayout === "break-sheet" ? (
            <section className="rotation-break-sheet">
              <table aria-label="Lifeguard break sheet">
                <thead>
                  <tr>
                    <th scope="col">Employee Name</th>
                    <th scope="col">Loc B4 Break 1</th>
                    <th scope="col">Brk 1 Start Time</th>
                    <th scope="col">Brk 1 End Time</th>
                    <th scope="col">Loc B4 Break 2</th>
                    <th scope="col">Brk 2 Start Time</th>
                    <th scope="col">Brk 2 End Time</th>
                    <th scope="col">Loc B4 Break 3</th>
                    <th scope="col">Brk 3 Start Time</th>
                    <th scope="col">Brk 3 End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {breakSheetRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.employeeName}</td>
                      <td>{row.startingPosition}</td>
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                    </tr>
                  ))}
                  {breakSheetBlankRows.map((rowIndex) => (
                    <tr key={`blank-${rowIndex}`} aria-label={`Blank break sheet row ${rowIndex + 1}`}>
                      <td />
                      <td />
                      <td />
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
            </section>
          ) : (
            <>
          <div className="rotation-builder__counts" aria-label="Scheduled lifeguard counts">
            <span>{specialCount} Special Facilities</span>
            <span>{shallowCount} Shallow</span>
            <span>{supportCount} Support</span>
            <span>{unassignedShifts.length} On deck</span>
          </div>

          <div className="rotation-builder__grid">
            {rotationTemplates.map((rotation) => (
              <section key={rotation.id} className={`rotation-card rotation-card--${rotation.tone}`}>
                <header className="rotation-card__header">
                  <div>
                    <h3>{rotation.title}</h3>
                    <p>{rotation.subtitle}</p>
                  </div>
                  <span>Opening Positions</span>
                </header>

                <div className="rotation-card__rows">
                  {rotation.positions.map((position, index) => {
                    const key = assignmentKey(rotation.id, position.id);
                    const currentShiftId = assignments[key] || "";
                    const assignedShift = dateShifts.find((shift) => shift.id === currentShiftId);
                    const eligibleOptions = eligibleShifts(rotation, dateShifts).filter(
                      (shift) =>
                        (!assignedShiftIds.has(shift.id) && !supportShiftIds.has(shift.id)) || shift.id === currentShiftId
                    );
                    const eligibleSupportOptions = dateShifts.filter((shift) => {
                      const isEligibleSupportShift =
                        (slideAttendantAssignmentKeySet.has(key) && isSlideAttendantShift(shift)) ||
                        (groundCrewAssignmentKeySet.has(key) && (isSlideAttendantShift(shift) || isGroundCrewShift(shift)));

                      return isEligibleSupportShift && (!assignedShiftIds.has(shift.id) || shift.id === currentShiftId);
                    });
                    const options =
                      assignedShift && !eligibleOptions.some((shift) => shift.id === assignedShift.id) && !eligibleSupportOptions.some((shift) => shift.id === assignedShift.id)
                        ? [assignedShift, ...eligibleOptions, ...eligibleSupportOptions]
                        : [...eligibleOptions, ...eligibleSupportOptions];

                    if (isEditingTemplate) {
                      return (
                        <div key={key} className="rotation-row rotation-row--editing">
                          <input
                            aria-label={`Position name for ${rotation.title}`}
                            value={position.label}
                            onChange={(event) => updatePositionLabel(rotation.id, position.id, event.target.value)}
                          />
                          <div className="rotation-row__edit-actions">
                            <button type="button" onClick={() => movePosition(rotation.id, position.id, -1)} disabled={index === 0}>
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => movePosition(rotation.id, position.id, 1)}
                              disabled={index === rotation.positions.length - 1}
                            >
                              Down
                            </button>
                            <button type="button" className="button-danger" onClick={() => removePosition(rotation.id, position.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <label key={key} className="rotation-row">
                        <span className="rotation-row__position">{position.label}</span>
                        <select aria-label={position.label} value={currentShiftId} onChange={(event) => selectAssignment(key, event.target.value)}>
                          <option value="">Open</option>
                          {options.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {employeeOptionLabel(shift)}
                            </option>
                          ))}
                        </select>
                        <span className="rotation-row__print-name">
                          {assignedShift ? formatEmployeeName(assignedShift.employeeName) : "Open"}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {isEditingTemplate ? (
                  <form className="rotation-card__add no-print" onSubmit={(event) => { event.preventDefault(); addPosition(rotation.id); }}>
                    <input
                      aria-label={`Add position to ${rotation.title}`}
                      placeholder="Add position"
                      value={newPositionLabels[rotation.id] || ""}
                      onChange={(event) => setNewPositionLabels((current) => ({ ...current, [rotation.id]: event.target.value }))}
                    />
                    <button type="submit">Add</button>
                  </form>
                ) : null}
              </section>
            ))}
          </div>

          <section className={`rotation-support ${isSupportCollapsed ? "is-collapsed" : ""}`}>
            <header className="rotation-support__header">
              <div>
                <h3>Captains, Slide Attendants & Ground Crew</h3>
                <p>People assigned here are skipped by Autofill.</p>
              </div>
              <button type="button" className="no-print" onClick={() => setIsSupportCollapsed((current) => !current)}>
                {isSupportCollapsed ? "Show" : "Minimize"}
              </button>
            </header>
            <div className="rotation-support__body">
              {renderSupportGroup("Captains / Supervisors", "captains", captainShifts, captainOptions)}
              {renderSupportGroup("Slide Attendants", "slideAttendants", slideAttendantShifts, slideAttendantOptions)}
              {renderSupportGroup("Ground Crew", "groundCrew", groundCrewShifts, groundCrewOptions)}
            </div>
          </section>

          <section className="rotation-builder__extras">
            <div>
              <h3>On Deck / Extras</h3>
              <p>Anyone not assigned above stays here automatically.</p>
            </div>
            {unassignedShifts.length > 0 ? (
              <ul>
                {unassignedShifts.map((shift) => (
                  <li key={shift.id}>
                    <strong>{formatEmployeeName(shift.employeeName)}</strong>
                    <span>{shift.departmentLabel}</span>
                    <span>{formatShiftRange(shift.startTime, shift.endTime)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Everyone scheduled for this rotation group has been assigned.</p>
            )}
          </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
