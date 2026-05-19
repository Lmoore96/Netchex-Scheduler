import type { Handler } from "@netlify/functions";
import { assignmentRequestSchema } from "../../src/domain/validation";
import {
  accessDeniedResponse,
  errorResponse,
  isAccessAllowed,
  jsonResponse,
  methodNotAllowedResponse
} from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowedResponse();
  }

  if (!isAccessAllowed(event)) {
    return accessDeniedResponse();
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return errorResponse("Assignment data must be valid JSON", 400);
  }

  const parsed = assignmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Assignment data is invalid", 400);
  }

  try {
    const repository = createSupabaseRepository();
    const result = await repository.saveAssignments(
      parsed.data.dailyPositionPlanId,
      parsed.data.assignments
    );
    return jsonResponse(result);
  } catch {
    return errorResponse("Assignments could not be saved", 500);
  }
};
