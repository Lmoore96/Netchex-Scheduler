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
  return errorResponse("Access denied", 401);
}

export function isAccessAllowed(event: HandlerEvent): boolean {
  void event;
  return true;
}
