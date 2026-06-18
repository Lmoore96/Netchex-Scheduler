import { z } from "zod";
import type {
  AssignmentPlanRequest,
  LoadedSchedule,
  ManualShiftRequest,
  ParsedScheduleDraft,
  PositionList,
  RotationPlanRequest,
  SavedAssignmentPlan,
  SavedRotationPlan,
  SavedScheduleSummary,
  Shift
} from "../domain/types";
import { positionDefinitionSchema } from "../domain/validation";

const localDataKey = "netchex-local-data-v1";

export interface LocalWorkspace {
  scheduleImportId: string;
  calloutShiftIds: Record<string, boolean>;
}

type AssignmentPlanQuery = Pick<AssignmentPlanRequest, "scheduleImportId" | "planDate" | "departmentLabel">;
type RotationPlanQuery = Pick<RotationPlanRequest, "scheduleImportId" | "planDate">;

interface LocalData {
  schedules: LoadedSchedule[];
  positionLists: PositionList[];
  assignmentPlans: SavedAssignmentPlan[];
  rotationPlans: SavedRotationPlan[];
  workspace: LocalWorkspace | null;
}

const importedAtByScheduleId = new Map<string, string>();

const shiftSchema = z.object({
  id: z.string().min(1),
  scheduleImportId: z.string().min(1),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  departmentLabel: z.string().min(1),
  normalizedDepartmentId: z.string().optional(),
  sourceConfidence: z.enum(["high", "medium", "low"]),
  sourceNotes: z.string().optional()
});

const loadedScheduleSchema = z.object({
  importId: z.string().min(1),
  sourceFileName: z.string().min(1),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shifts: z.array(shiftSchema),
  warnings: z.array(z.string())
});

const positionListSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  name: z.string().min(1),
  positions: z.array(positionDefinitionSchema)
});

const assignmentSchema = z.object({
  id: z.string().min(1),
  dailyPositionPlanId: z.string().min(1),
  shiftId: z.string().min(1),
  positionKey: z.string().min(1),
  sortOrder: z.number().int().min(0),
  notes: z.string().optional()
});

const assignmentPlanSchema = z.object({
  id: z.string().min(1),
  scheduleImportId: z.string().min(1),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentLabel: z.string().min(1),
  positionListId: z.string(),
  positionsSnapshot: z.array(positionDefinitionSchema),
  assignments: z.array(assignmentSchema),
  savedAt: z.string().min(1)
});

const rotationPositionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const rotationTemplateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  kind: z.string().min(1),
  tone: z.string().min(1),
  positions: z.array(rotationPositionSchema)
});

const rotationPlanSchema = z.object({
  id: z.string().min(1),
  scheduleImportId: z.string().min(1),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rotationTemplates: z.array(rotationTemplateSchema),
  assignments: z.record(z.string()),
  supportAssignments: z.object({
    captains: z.array(z.string()),
    slideAttendants: z.array(z.string()),
    groundCrew: z.array(z.string()).default([])
  }),
  savedAt: z.string().min(1)
});

const localWorkspaceSchema = z.object({
  scheduleImportId: z.string().min(1),
  calloutShiftIds: z.record(z.boolean())
});

const localDataSchema = z.object({
  schedules: z.array(loadedScheduleSchema),
  positionLists: z.array(positionListSchema),
  assignmentPlans: z.array(assignmentPlanSchema),
  rotationPlans: z.array(rotationPlanSchema),
  workspace: localWorkspaceSchema.nullable()
});

function emptyLocalData(): LocalData {
  return { schedules: [], positionLists: [], assignmentPlans: [], rotationPlans: [], workspace: null };
}

function readLocalData(): LocalData {
  if (typeof window === "undefined") return emptyLocalData();
  const stored = window.localStorage.getItem(localDataKey);
  if (!stored) return emptyLocalData();

  try {
    return localDataSchema.parse(JSON.parse(stored));
  } catch {
    return emptyLocalData();
  }
}

function writeLocalData(data: LocalData) {
  window.localStorage.setItem(localDataKey, JSON.stringify(data));
}

function localId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function summaryFromSchedule(schedule: LoadedSchedule): SavedScheduleSummary {
  return {
    id: schedule.importId,
    sourceFileName: schedule.sourceFileName,
    dateRangeStart: schedule.dateRangeStart,
    dateRangeEnd: schedule.dateRangeEnd,
    importedAt: importedAtByScheduleId.get(schedule.importId) ?? now(),
    shiftCount: schedule.shifts.length
  };
}

export function importLocalSchedule(draft: ParsedScheduleDraft): LoadedSchedule {
  const importId = localId("local-import");
  const schedule: LoadedSchedule = {
    importId,
    sourceFileName: draft.sourceFileName,
    dateRangeStart: draft.dateRangeStart,
    dateRangeEnd: draft.dateRangeEnd,
    warnings: draft.warnings,
    shifts: draft.shifts
      .filter((shift) => !shift.ignored)
      .map((shift, index) => ({
        id: localId("local-shift"),
        scheduleImportId: importId,
        employeeId: localId("local-employee"),
        employeeName: shift.employeeName,
        shiftDate: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        departmentLabel: shift.departmentLabel,
        sourceConfidence: shift.sourceConfidence,
        sourceNotes: shift.sourceNotes || `Imported locally as row ${index + 1}`
      }))
  };

  const data = readLocalData();
  importedAtByScheduleId.set(importId, now());
  writeLocalData({ ...data, schedules: [schedule, ...data.schedules] });
  return schedule;
}

export function listLocalSchedules(): SavedScheduleSummary[] {
  return readLocalData().schedules.map(summaryFromSchedule);
}

export function loadLocalSchedule(id: string): LoadedSchedule | null {
  return readLocalData().schedules.find((schedule) => schedule.importId === id) ?? null;
}

export function deleteLocalSchedule(id: string) {
  const data = readLocalData();
  writeLocalData({
    ...data,
    schedules: data.schedules.filter((schedule) => schedule.importId !== id),
    assignmentPlans: data.assignmentPlans.filter((plan) => plan.scheduleImportId !== id),
    rotationPlans: data.rotationPlans.filter((plan) => plan.scheduleImportId !== id),
    workspace: data.workspace?.scheduleImportId === id ? null : data.workspace
  });
}

export function loadLocalPositionLists(): PositionList[] {
  return readLocalData().positionLists;
}

export function saveLocalPositionList(positionList: PositionList): PositionList {
  const data = readLocalData();
  const savedList = { ...positionList, id: positionList.id || localId("local-list") };
  const lists = data.positionLists.some((list) => list.id === savedList.id)
    ? data.positionLists.map((list) => (list.id === savedList.id ? savedList : list))
    : [...data.positionLists, savedList];
  writeLocalData({ ...data, positionLists: lists });
  return savedList;
}

export function deleteLocalPositionList(id: string) {
  const data = readLocalData();
  writeLocalData({ ...data, positionLists: data.positionLists.filter((list) => list.id !== id) });
}

export function addLocalManualShift(request: ManualShiftRequest): Shift {
  const data = readLocalData();
  const shift: Shift = {
    id: localId("local-shift"),
    scheduleImportId: request.scheduleImportId,
    employeeId: localId("local-employee"),
    employeeName: request.employeeName,
    shiftDate: request.shiftDate,
    startTime: request.startTime,
    endTime: request.endTime,
    departmentLabel: request.departmentLabel,
    sourceConfidence: "high",
    sourceNotes: "Added manually in local mode"
  };
  writeLocalData({
    ...data,
    schedules: data.schedules.map((schedule) =>
      schedule.importId === request.scheduleImportId ? { ...schedule, shifts: [...schedule.shifts, shift] } : schedule
    )
  });
  return shift;
}

export function saveLocalAssignmentPlan(plan: AssignmentPlanRequest): SavedAssignmentPlan {
  const data = readLocalData();
  const savedPlan: SavedAssignmentPlan = { ...plan, id: localId("local-assignment-plan"), savedAt: now() };
  writeLocalData({
    ...data,
    assignmentPlans: [
      ...data.assignmentPlans.filter(
        (candidate) =>
          candidate.scheduleImportId !== plan.scheduleImportId ||
          candidate.planDate !== plan.planDate ||
          candidate.departmentLabel !== plan.departmentLabel
      ),
      savedPlan
    ]
  });
  return savedPlan;
}

export function loadLocalAssignmentPlan(query: AssignmentPlanQuery): SavedAssignmentPlan | null {
  return readLocalData().assignmentPlans.find(
    (plan) =>
      plan.scheduleImportId === query.scheduleImportId &&
      plan.planDate === query.planDate &&
      plan.departmentLabel === query.departmentLabel
  ) ?? null;
}

export function saveLocalRotationPlan(plan: RotationPlanRequest): SavedRotationPlan {
  const data = readLocalData();
  const savedPlan: SavedRotationPlan = { ...plan, id: localId("local-rotation-plan"), savedAt: now() };
  writeLocalData({
    ...data,
    rotationPlans: [
      ...data.rotationPlans.filter(
        (candidate) => candidate.scheduleImportId !== plan.scheduleImportId || candidate.planDate !== plan.planDate
      ),
      savedPlan
    ]
  });
  return savedPlan;
}

export function loadLocalRotationPlan(query: RotationPlanQuery): SavedRotationPlan | null {
  return readLocalData().rotationPlans.find(
    (plan) => plan.scheduleImportId === query.scheduleImportId && plan.planDate === query.planDate
  ) ?? null;
}

export function saveLocalWorkspace(workspace: LocalWorkspace) {
  const data = readLocalData();
  writeLocalData({ ...data, workspace });
}

export function loadLocalWorkspace(): LocalWorkspace | null {
  return readLocalData().workspace;
}
