import type { Handler } from "@netlify/functions";
import { errorResponse, jsonResponse } from "./_shared/http";
import { parseNetchexPdf } from "./_shared/parser/netchexPdfParser";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  if (!event.body) {
    return errorResponse("Missing PDF upload body", 400);
  }

  const fileName = event.headers["x-file-name"] ?? "Netchex Scheduler.pdf";
  const bytes = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  const draft = await parseNetchexPdf(bytes, fileName);

  return jsonResponse(draft);
};
