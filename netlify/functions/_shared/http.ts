export function jsonResponse(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

export function errorResponse(message: string, statusCode = 400) {
  return jsonResponse({ error: message }, statusCode);
}
