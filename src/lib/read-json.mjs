// Returns { body }, or { errorResponse } when the request isn't valid JSON.
export async function readJson(request) {
  // Other websites can't send this content type without a CORS preflight,
  // which these routes don't allow, so they can't call them from a browser.
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return { errorResponse: Response.json({ error: 'Send the request as JSON.' }, { status: 415 }) };
  }

  try {
    return { body: await request.json() };
  } catch {
    return { errorResponse: Response.json({ error: 'Send the request as JSON.' }, { status: 400 }) };
  }
}
