import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { parsedScheduleDraftSchema } from "../../src/domain/validation";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse, methodNotAllowedResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

const confirmImportSchema = parsedScheduleDraftSchema.extend({
  shifts: parsedScheduleDraftSchema.shape.shifts.max(1000),
  warnings: z.array(z.string().max(500)).max(100)
});

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
    return errorResponse("Import review data must be valid JSON", 400);
  }

  const parsed = confirmImportSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Import review data is invalid", 400);
  }

  try {
    const repository = createSupabaseRepository();
    const importRow = await repository.confirmImport(parsed.data);
    return jsonResponse({ importId: importRow.id });
  } catch {
    return errorResponse("Import could not be confirmed", 500);
  }
};
