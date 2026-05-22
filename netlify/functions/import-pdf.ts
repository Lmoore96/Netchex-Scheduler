import type { Handler } from "@netlify/functions";
import { parsedScheduleDraftSchema } from "../../src/domain/validation";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse, methodNotAllowedResponse } from "./_shared/http";
import { parseNetchexPdf } from "./_shared/parser/netchexPdfParser";

const maxPdfBytes = 8 * 1024 * 1024;

function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("utf8") === "%PDF-";
}

function parseErrorResponse(message: string, details: unknown) {
  return jsonResponse({ error: message, details }, 422);
}

function parserShapeReason(draft: { dateRangeStart: string; dateRangeEnd: string; shifts: unknown[] }): string {
  if (!draft.dateRangeStart && !draft.dateRangeEnd && draft.shifts.length === 0) {
    return "No Netchex schedule grid was found. Upload the original Netchex Scheduler PDF/export, not a PDF printed from this app.";
  }

  return "Parsed PDF did not match expected schedule shape";
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowedResponse();
  }

  if (!isAccessAllowed(event)) {
    return accessDeniedResponse();
  }

  if (!event.body) {
    return errorResponse("Missing PDF upload body", 400);
  }

  if (event.headers["content-type"] && !event.headers["content-type"].includes("application/pdf")) {
    return errorResponse("Upload must be a PDF", 415);
  }

  const fileName = event.headers["x-file-name"] ?? "Netchex Scheduler.pdf";
  const bytes = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");

  if (bytes.byteLength > maxPdfBytes) {
    return errorResponse("PDF upload is too large", 413);
  }

  if (!isPdf(bytes)) {
    return errorResponse("Upload must be a PDF", 415);
  }

  try {
    const draft = await parseNetchexPdf(bytes, fileName);
    const parsed = parsedScheduleDraftSchema.safeParse(draft);
    if (!parsed.success) {
      return parseErrorResponse("The schedule PDF could not be parsed", {
        reason: parserShapeReason(draft),
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        dateRangeStart: draft.dateRangeStart,
        dateRangeEnd: draft.dateRangeEnd,
        shiftCount: draft.shifts.length,
        warnings: draft.warnings
      });
    }
    return jsonResponse(draft);
  } catch (caught) {
    return parseErrorResponse("The schedule PDF could not be parsed", {
      reason: caught instanceof Error ? caught.message : "Unknown parser error"
    });
  }
};
