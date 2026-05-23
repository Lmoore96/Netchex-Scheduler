import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { positionDefinitionSchema } from "../../src/domain/validation";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

const assignmentSchema = z.object({
  id: z.string().min(1),
  dailyPositionPlanId: z.string().min(1),
  shiftId: z.string().min(1),
  positionKey: z.string().min(1),
  sortOrder: z.number().int().min(0),
  notes: z.string().optional()
});

const assignmentPlanRequestSchema = z.object({
  scheduleImportId: z.string().min(1),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentLabel: z.string().min(1),
  positionListId: z.string(),
  positionsSnapshot: z.array(positionDefinitionSchema),
  assignments: z.array(assignmentSchema)
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

  try {
    const repository = createSupabaseRepository();

    if (event.httpMethod === "GET") {
      const scheduleImportId = event.queryStringParameters?.scheduleImportId;
      const planDate = event.queryStringParameters?.planDate;
      const departmentLabel = event.queryStringParameters?.departmentLabel;

      if (!scheduleImportId || !planDate || !departmentLabel) {
        return errorResponse("Schedule import, date, and department are required", 400);
      }

      const plan = await repository.loadAssignmentPlan(scheduleImportId, planDate, departmentLabel);
      return jsonResponse({ plan });
    }

    if (event.httpMethod !== "POST") {
      return errorResponse("Method not allowed", 405, { Allow: "GET, POST" });
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return errorResponse("Assignment plan data must be valid JSON", 400);
    }

    const parsed = assignmentPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Assignment plan data is invalid", details: parsed.error.flatten() }, 400);
    }

    const plan = await repository.saveAssignmentPlan(parsed.data);
    return jsonResponse({ plan });
  } catch (caught) {
    return jsonResponse(
      { error: "Assignment plan could not be loaded or saved", details: errorDetails(caught) },
      500
    );
  }
};
