import type { ParsedScheduleDraft } from "../domain/types";
import { parsedScheduleDraftSchema } from "../domain/validation";

async function parseJsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body;
}

export async function uploadSchedulePdf(file: File): Promise<ParsedScheduleDraft> {
  const response = await fetch("/.netlify/functions/import-pdf", {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-file-name": file.name
    },
    body: await file.arrayBuffer()
  });

  return parsedScheduleDraftSchema.parse(await parseJsonResponse(response));
}

export async function confirmReviewedImport(draft: ParsedScheduleDraft): Promise<{ importId: string }> {
  const response = await fetch("/.netlify/functions/confirm-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft)
  });

  return parseJsonResponse(response);
}
