import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage, getSmtpConfig, validateEmail } from '../src/lib/email.mjs';

const smtpEnv = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'user',
  SMTP_PASS: 'secret',
  EMAIL_FROM: 'me@example.com',
};

test('validateEmail accepts a complete email', () => {
  assert.equal(validateEmail({ subject: 'Hi', message: 'Hello' }), null);
});

test('validateEmail rejects missing, blank, and oversized fields', () => {
  assert.match(validateEmail({ message: 'Hello' }), /subject/);
  assert.match(validateEmail({ subject: '   ', message: 'Hello' }), /subject/);
  assert.match(validateEmail({ subject: 'Hi', message: '   ' }), /message/);
  assert.match(validateEmail({ subject: 'x'.repeat(201), message: 'Hello' }), /subject/);
  assert.match(validateEmail({ subject: 'Hi', message: 'x'.repeat(5001) }), /message/);
});

test('getSmtpConfig returns null when a setting is missing', () => {
  assert.equal(getSmtpConfig({}), null);
  assert.equal(getSmtpConfig({ ...smtpEnv, SMTP_PASS: '' }), null);
});

test('getSmtpConfig uses TLS only on port 465', () => {
  assert.deepEqual(
    [getSmtpConfig(smtpEnv).transport.port, getSmtpConfig(smtpEnv).transport.secure],
    [587, false],
  );
  assert.equal(getSmtpConfig({ ...smtpEnv, SMTP_PORT: '465' }).transport.secure, true);
});

test('buildMessage addresses the contact and trims the content', () => {
  const contact = { name: 'Ann Lee', email: 'ann@example.com' };

  assert.deepEqual(
    buildMessage({ from: 'me@example.com', contact, subject: ' Hi ', message: ' Hello\n' }),
    {
      from: 'me@example.com',
      to: { name: 'Ann Lee', address: 'ann@example.com' },
      subject: 'Hi',
      text: 'Hello',
    },
  );
});
