import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

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

const rotationPlanRequestSchema = z.object({
  scheduleImportId: z.string().min(1),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rotationTemplates: z.array(rotationTemplateSchema),
  assignments: z.record(z.string()),
  supportAssignments: z.object({
    captains: z.array(z.string()),
    slideAttendants: z.array(z.string()),
    groundCrew: z.array(z.string()).default([])
  })
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

      if (!scheduleImportId || !planDate) {
        return errorResponse("Schedule import and date are required", 400);
      }

      const plan = await repository.loadRotationPlan(scheduleImportId, planDate);
      return jsonResponse({ plan });
    }

    if (event.httpMethod !== "POST") {
      return errorResponse("Method not allowed", 405, { Allow: "GET, POST" });
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return errorResponse("Rotation plan data must be valid JSON", 400);
    }

    const parsed = rotationPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Rotation plan data is invalid", details: parsed.error.flatten() }, 400);
    }

    const plan = await repository.saveRotationPlan(parsed.data);
    return jsonResponse({ plan });
  } catch (caught) {
    return jsonResponse(
      { error: "Rotation plan could not be loaded or saved", details: errorDetails(caught) },
      500
    );
  }
};
