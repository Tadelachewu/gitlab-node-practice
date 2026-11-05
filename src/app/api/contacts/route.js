import { addContact } from '../../../lib/contact-store.mjs';
import { validateContact } from '../../../lib/contacts.mjs';
import { readJson } from '../../../lib/read-json.mjs';

export async function POST(request) {
  const { body, errorResponse } = await readJson(request);
  if (errorResponse) return errorResponse;

  const { error, fields } = validateContact(body);
  if (error) return Response.json({ error }, { status: 400 });

  try {
    return Response.json(await addContact(fields), { status: 201 });
  } catch (saveError) {
    console.error('Failed to save contact:', saveError);
    return Response.json({ error: 'The contact could not be saved. Check the server logs.' }, { status: 500 });
  }
}
