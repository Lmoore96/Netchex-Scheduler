import type { HandlerEvent } from "@netlify/functions";

export function jsonResponse(body: unknown, statusCode = 200, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function errorResponse(message: string, statusCode = 400, headers: Record<string, string> = {}) {
  return jsonResponse({ error: message }, statusCode, headers);
}

export function methodNotAllowedResponse() {
  return errorResponse("Method not allowed", 405, { Allow: "POST" });
}

export function accessDeniedResponse() {
  return errorResponse("Access code is missing or invalid", 401);
}

export function isAccessAllowed(event: HandlerEvent): boolean {
  const expected = process.env.SCHEDULE_APP_ACCESS_CODE;
  if (!expected) {
    return process.env.ALLOW_UNAUTHENTICATED_IMPORT_API === "true";
  }
  return event.headers["x-access-code"] === expected;
}
