import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

const manualShiftRequestSchema = z.object({
  scheduleImportId: z.string().min(1),
  employeeName: z.string().trim().min(1),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  departmentLabel: z.string().trim().min(1)
});

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
  if (!isAccessAllowed(event)) return accessDeniedResponse();

  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405, { Allow: "POST" });
  }

  try {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return errorResponse("Manual shift data must be valid JSON", 400);
    }

    const parsed = manualShiftRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Manual shift data is invalid", details: parsed.error.flatten() }, 400);
    }

    const repository = createSupabaseRepository();
    const shift = await repository.addManualShift(parsed.data);
    return jsonResponse({ shift });
  } catch (caught) {
    return jsonResponse(
      { error: "Manual shift could not be saved", details: errorDetails(caught) },
      500
    );
  }
};
