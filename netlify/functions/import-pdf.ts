import type { Handler } from "@netlify/functions";
import { accessDeniedResponse, errorResponse, isAccessAllowed, jsonResponse, methodNotAllowedResponse } from "./_shared/http";
import { parseNetchexPdf } from "./_shared/parser/netchexPdfParser";

const maxPdfBytes = 8 * 1024 * 1024;

function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("utf8") === "%PDF-";
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
    return jsonResponse(draft);
  } catch {
    return errorResponse("The schedule PDF could not be parsed", 422);
  }
};
