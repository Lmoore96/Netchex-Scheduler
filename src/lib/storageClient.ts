import type { ParsedScheduleDraft } from "../domain/types";
import { parsedScheduleDraftSchema } from "../domain/validation";
import { z } from "zod";

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  let body: unknown = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!response.ok) {
    const errorMessage = z.object({ error: z.string() }).safeParse(body);
    throw new Error(errorMessage.success ? errorMessage.data.error : "Request failed");
  }

  return body;
}

function accessHeaders(): Record<string, string> {
  const accessCode = globalThis.localStorage?.getItem("schedule-app-access-code");
  return accessCode ? { "x-access-code": accessCode } : {};
}

export async function uploadSchedulePdf(file: File): Promise<ParsedScheduleDraft> {
  const response = await fetch("/.netlify/functions/import-pdf", {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-file-name": file.name,
      ...accessHeaders()
    },
    body: await file.arrayBuffer()
  });

  return parsedScheduleDraftSchema.parse(await parseJsonResponse(response));
}

const confirmImportResponseSchema = z.object({
  importId: z.string().min(1)
});

export async function confirmReviewedImport(draft: ParsedScheduleDraft): Promise<{ importId: string }> {
  const response = await fetch("/.netlify/functions/confirm-import", {
    method: "POST",
    headers: { "content-type": "application/json", ...accessHeaders() },
    body: JSON.stringify(draft)
  });

  return confirmImportResponseSchema.parse(await parseJsonResponse(response));
}
