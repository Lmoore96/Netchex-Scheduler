import type { Handler } from "@netlify/functions";
import type { PositionList } from "../../src/domain/types";
import { positionListRequestSchema } from "../../src/domain/validation";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

interface PositionListRow {
  id: string;
  department_id: string;
  name: string;
  positions: PositionList["positions"];
}

function toPositionList(row: PositionListRow): PositionList {
  return {
    id: row.id,
    departmentId: row.department_id,
    name: row.name,
    positions: row.positions
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
  if (!isAccessAllowed(event)) {
    return accessDeniedResponse();
  }

  try {
    const repository = createSupabaseRepository();

    if (event.httpMethod === "GET") {
      const positionLists = await repository.listPositionLists();
      return jsonResponse({ positionLists: positionLists.map(toPositionList) });
    }

    if (event.httpMethod !== "POST") {
      return errorResponse("Method not allowed", 405, { Allow: "GET, POST" });
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return errorResponse("Position list data must be valid JSON", 400);
    }

    const parsed = positionListRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Position list data is invalid", details: parsed.error.flatten() },
        400
      );
    }

    const positionList = await repository.savePositionList(
      parsed.data.departmentId,
      parsed.data.name,
      parsed.data.positions
    );

    return jsonResponse({ positionList: toPositionList(positionList) });
  } catch (caught) {
    return jsonResponse(
      { error: "Position lists could not be loaded or saved", details: errorDetails(caught) },
      500
    );
  }
};
