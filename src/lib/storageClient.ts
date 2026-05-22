import type { LoadedSchedule, ParsedScheduleDraft, PositionList, SavedScheduleSummary } from "../domain/types";
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
