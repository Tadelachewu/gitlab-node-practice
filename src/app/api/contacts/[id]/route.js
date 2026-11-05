import { updateContact } from '../../../../lib/contact-store.mjs';
import { validateContact } from '../../../../lib/contacts.mjs';
import { readJson } from '../../../../lib/read-json.mjs';

export async function PUT(request, { params }) {
  const { id } = await params;

  const { body, errorResponse } = await readJson(request);
  if (errorResponse) return errorResponse;

  const { error, fields } = validateContact(body);
  if (error) return Response.json({ error }, { status: 400 });

  try {
    const contact = await updateContact(id, fields);
    if (!contact) return Response.json({ error: 'Contact not found.' }, { status: 404 });
    return Response.json(contact);
  } catch (saveError) {
    console.error('Failed to save contact:', saveError);
    return Response.json({ error: 'The contact could not be saved. Check the server logs.' }, { status: 500 });
  }
}
