import type { Handler } from "@netlify/functions";
import { parsedScheduleDraftSchema } from "../../src/domain/validation";
import { errorResponse, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const parsed = parsedScheduleDraftSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) {
    return errorResponse("Import review data is invalid", 400);
  }

  const repository = createSupabaseRepository();
  const importRow = await repository.confirmImport(parsed.data);
  return jsonResponse({ importId: importRow.id });
};
