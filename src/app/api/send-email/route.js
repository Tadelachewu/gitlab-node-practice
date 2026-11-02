import nodemailer from 'nodemailer';
import { findContact } from '../../../lib/contacts.mjs';
import { buildMessage, getSmtpConfig, validateEmail } from '../../../lib/email.mjs';

export async function POST(request) {
  // Other websites can't send this content type without a CORS preflight,
  // which this route doesn't allow, so they can't trigger emails from a browser.
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return Response.json({ error: 'Send the request as JSON.' }, { status: 415 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send the request as JSON.' }, { status: 400 });
  }

  // Recipients come from the contact list, so this can't email arbitrary addresses.
  const contact = findContact(body?.contactId);
  if (!contact) {
    return Response.json({ error: 'Contact not found.' }, { status: 404 });
  }

  const validationError = validateEmail(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const smtp = getSmtpConfig(process.env);
  if (!smtp) {
    return Response.json(
      { error: 'Email is not set up yet. Add the SMTP settings described in the README.' },
      { status: 503 },
    );
  }

  try {
    const transporter = nodemailer.createTransport(smtp.transport);
    await transporter.sendMail(
      buildMessage({ from: smtp.from, contact, subject: body.subject, message: body.message }),
    );
  } catch (error) {
    console.error('Failed to send email:', error);
    return Response.json({ error: 'The email could not be sent. Check the server logs.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
