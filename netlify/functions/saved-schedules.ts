import type { Handler } from "@netlify/functions";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

interface SavedScheduleImportRow {
  id: string;
  source_file_name: string;
  date_range_start: string;
  date_range_end: string;
  imported_at: string;
  shift_count: number;
}

function toSavedScheduleSummary(row: SavedScheduleImportRow) {
  return {
    id: row.id,
    sourceFileName: row.source_file_name,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    importedAt: row.imported_at,
    shiftCount: Number(row.shift_count)
  };
}

function errorDetails(caught: unknown) {
  if (!(caught instanceof Error)) return caught;

  return {
    name: caught.name,
    message: caught.message,
    ...("code" in caught ? { code: caught.code } : {}),
    ...("details" in caught ? { details: caught.details } : {}),
    ...("hint" in caught ? { hint: caught.hint } : {})
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return errorResponse("Method not allowed", 405, { Allow: "GET" });
  }

  if (!isAccessAllowed(event)) {
    return accessDeniedResponse();
  }

  try {
    const repository = createSupabaseRepository();
    const scheduleImportId = event.queryStringParameters?.id;

    if (scheduleImportId) {
      const schedule = await repository.loadSavedSchedule(scheduleImportId);
      return jsonResponse({ schedule });
    }

    const schedules = await repository.listSavedSchedules();
    return jsonResponse({ schedules: schedules.map(toSavedScheduleSummary) });
  } catch (caught) {
    return jsonResponse(
      { error: "Saved schedules could not be loaded", details: errorDetails(caught) },
      500
    );
  }
};
