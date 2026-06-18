import type { AssignmentPlanRequest, LoadedSchedule, ManualShiftRequest, ParsedScheduleDraft, PositionList, SavedAssignmentPlan, SavedRotationPlan, SavedScheduleSummary, RotationPlanRequest, Shift } from "../domain/types";
import { parsedScheduleDraftSchema, positionDefinitionSchema } from "../domain/validation";
import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional()
});

function compactBody(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  let body: unknown = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!response.ok) {
    const errorMessage = errorResponseSchema.safeParse(body);
    if (!errorMessage.success) {
      const rawBody = compactBody(text);
      throw new Error(
        `Request failed (${response.status} ${response.statusText})${rawBody ? `: ${rawBody}` : ""}`
      );
    }

    const details = errorMessage.data.details
      ? ` Details: ${JSON.stringify(errorMessage.data.details)}`
      : "";
    throw new Error(`${errorMessage.data.error}${details}`);
  }

  return body;
}

export async function uploadSchedulePdf(file: File): Promise<ParsedScheduleDraft> {
  const response = await fetch("/.netlify/functions/import-pdf", {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-file-name": file.name
    },
    body: await file.arrayBuffer()
  });

  return parsedScheduleDraftSchema.parse(await parseJsonResponse(response));
}

const confirmImportResponseSchema = z.object({
  importId: z.string().min(1)
});

export async function confirmReviewedImport(draft: ParsedScheduleDraft): Promise<{ importId: string }> {
  const response = await fetch("/.netlify/functions/confirm-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft)
  });

  return confirmImportResponseSchema.parse(await parseJsonResponse(response));
}

const positionListSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  name: z.string().min(1),
  positions: z.array(positionDefinitionSchema)
});

const positionListsResponseSchema = z.object({
  positionLists: z.array(positionListSchema)
});

const positionListResponseSchema = z.object({
  positionList: positionListSchema
});

const deletePositionListResponseSchema = z.object({
  deleted: z.boolean()
});

const savedScheduleSummarySchema = z.object({
  id: z.string().min(1),
  sourceFileName: z.string().min(1),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  importedAt: z.string().min(1),
  shiftCount: z.number().int().min(0)
});

const savedSchedulesResponseSchema = z.object({
  schedules: z.array(savedScheduleSummarySchema)
});

const loadedShiftSchema = z.object({
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

const loadedScheduleResponseSchema = z.object({
  schedule: z.object({
    importId: z.string().min(1),
    sourceFileName: z.string().min(1),
    dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    shifts: z.array(loadedShiftSchema),
    warnings: z.array(z.string())
  })
});

const manualShiftResponseSchema = z.object({
  shift: loadedShiftSchema
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

const assignmentPlanResponseSchema = z.object({
  plan: assignmentPlanSchema.nullable()
});

const rotationPositionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1)
});

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

const rotationPlanResponseSchema = z.object({
  plan: rotationPlanSchema.nullable()
});

const saveResponseSchema = z.object({
  saved: z.boolean()
});


export async function loadPositionLists(): Promise<PositionList[]> {
  const response = await fetch("/.netlify/functions/position-lists");
  return positionListsResponseSchema.parse(await parseJsonResponse(response)).positionLists;
}

export async function savePositionList(positionList: PositionList): Promise<PositionList> {
  const response = await fetch("/.netlify/functions/position-lists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      departmentId: positionList.departmentId,
      name: positionList.name,
      positions: positionList.positions
    })
  });

  return positionListResponseSchema.parse(await parseJsonResponse(response)).positionList;
}

export async function deletePositionList(id: string): Promise<void> {
  const response = await fetch(`/.netlify/functions/position-lists?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  deletePositionListResponseSchema.parse(await parseJsonResponse(response));
}

export async function listSavedSchedules(): Promise<SavedScheduleSummary[]> {
  const response = await fetch("/.netlify/functions/saved-schedules");
  return savedSchedulesResponseSchema.parse(await parseJsonResponse(response)).schedules;
}

export async function loadSavedSchedule(scheduleImportId: string): Promise<LoadedSchedule> {
  const response = await fetch(`/.netlify/functions/saved-schedules?id=${encodeURIComponent(scheduleImportId)}`);
  return loadedScheduleResponseSchema.parse(await parseJsonResponse(response)).schedule;
}

export async function deleteSavedSchedule(scheduleImportId: string): Promise<void> {
  const response = await fetch(`/.netlify/functions/saved-schedules?id=${encodeURIComponent(scheduleImportId)}`, {
    method: "DELETE"
  });

  deletePositionListResponseSchema.parse(await parseJsonResponse(response));
}

export async function addManualShift(shift: ManualShiftRequest): Promise<Shift> {
  const response = await fetch("/.netlify/functions/manual-shifts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(shift)
  });

  return manualShiftResponseSchema.parse(await parseJsonResponse(response)).shift;
}

export async function saveAssignmentPlan(plan: AssignmentPlanRequest): Promise<SavedAssignmentPlan> {
  const response = await fetch("/.netlify/functions/assignment-plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(plan)
  });

  return assignmentPlanResponseSchema.parse(await parseJsonResponse(response)).plan as SavedAssignmentPlan;
}

export async function loadAssignmentPlan(params: Pick<AssignmentPlanRequest, "scheduleImportId" | "planDate" | "departmentLabel">): Promise<SavedAssignmentPlan | null> {
  const query = new URLSearchParams({
    scheduleImportId: params.scheduleImportId,
    planDate: params.planDate,
    departmentLabel: params.departmentLabel
  });
  const response = await fetch(`/.netlify/functions/assignment-plans?${query.toString()}`);

  return assignmentPlanResponseSchema.parse(await parseJsonResponse(response)).plan;
}

export async function saveRotationPlan(plan: RotationPlanRequest): Promise<SavedRotationPlan> {
  const response = await fetch("/.netlify/functions/rotation-plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(plan)
  });

  return rotationPlanResponseSchema.parse(await parseJsonResponse(response)).plan as SavedRotationPlan;
}

export async function loadRotationPlan(params: Pick<RotationPlanRequest, "scheduleImportId" | "planDate">): Promise<SavedRotationPlan | null> {
  const query = new URLSearchParams({
    scheduleImportId: params.scheduleImportId,
    planDate: params.planDate
  });
  const response = await fetch(`/.netlify/functions/rotation-plans?${query.toString()}`);

  return rotationPlanResponseSchema.parse(await parseJsonResponse(response)).plan;
}
