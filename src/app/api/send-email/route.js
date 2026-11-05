import nodemailer from 'nodemailer';
import { findContact } from '../../../lib/contact-store.mjs';
import { buildMessage, getSmtpConfig, validateEmail } from '../../../lib/email.mjs';
import { readJson } from '../../../lib/read-json.mjs';

export async function POST(request) {
  const { body, errorResponse } = await readJson(request);
  if (errorResponse) return errorResponse;

  // Recipients must be in the contact list, not typed into this request.
  const contact = await findContact(body?.contactId);
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
