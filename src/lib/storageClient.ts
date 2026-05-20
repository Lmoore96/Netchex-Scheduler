import type { ParsedScheduleDraft } from "../domain/types";
import { parsedScheduleDraftSchema } from "../domain/validation";
import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional()
});

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
    const errorMessage = errorResponseSchema.safeParse(body);
    if (!errorMessage.success) {
      throw new Error("Request failed");
    }

    const details = errorMessage.data.details
      ? ` Details: ${JSON.stringify(errorMessage.data.details)}`
      : "";
    throw new Error(`${errorMessage.data.error}${details}`);
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

const confirmImportResponseSchema = z.object({
  importId: z.string().min(1)
});

export async function confirmReviewedImport(draft: ParsedScheduleDraft): Promise<{ importId: string }> {
  const response = await fetch("/.netlify/functions/confirm-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft)
  });

  return confirmImportResponseSchema.parse(await parseJsonResponse(response));
}
