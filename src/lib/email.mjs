const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

// Returns an error message, or null when the email can be sent.
export function validateEmail({ subject, message }) {
  if (typeof subject !== 'string' || !subject.trim()) return 'Enter a subject.';
  if (typeof message !== 'string' || !message.trim()) return 'Enter a message.';
  if (subject.length > MAX_SUBJECT_LENGTH) return `Keep the subject under ${MAX_SUBJECT_LENGTH} characters.`;
  if (message.length > MAX_MESSAGE_LENGTH) return `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`;
  return null;
}

// Returns null when any required setting is missing, so the API can report it.
export function getSmtpConfig(env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) return null;

  const port = Number(SMTP_PORT) || 587;
  return {
    from: EMAIL_FROM,
    transport: {
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    },
  };
}

export function buildMessage({ from, contact, subject, message }) {
  return {
    from,
    to: { name: contact.name, address: contact.email },
    subject: subject.trim(),
    text: message.trim(),
  };
}
