import test from 'node:test';
import assert from 'node:assert/strict';
import { filterContacts, sampleContacts, validateContact } from '../src/lib/contacts.mjs';

test('sample contacts have unique ids', () => {
  const ids = sampleContacts.map((contact) => contact.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('filterContacts matches any field, ignoring case and spaces', () => {
  const list = [
    { name: 'Ann Lee', email: 'ann@example.com', company: 'Acme', role: 'Designer' },
    { name: 'Bo Kim', email: 'bo@example.com', company: 'Globex', role: 'Engineer' },
  ];

  assert.deepEqual(filterContacts(list, ' GLOBEX '), [list[1]]);
  assert.deepEqual(filterContacts(list, 'ann@'), [list[0]]);
  assert.deepEqual(filterContacts(list, ''), list);
  assert.deepEqual(filterContacts(list, 'zzz'), []);
});

test('validateContact trims fields and makes company and role optional', () => {
  assert.deepEqual(validateContact({ name: ' Ann ', email: ' ann@example.com ' }), {
    fields: { name: 'Ann', email: 'ann@example.com', company: '', role: '' },
  });
});

test('validateContact ignores fields a contact should not have', () => {
  const { fields } = validateContact({ id: 'chosen-id', name: 'Ann', email: 'ann@example.com', admin: true });
  assert.deepEqual(Object.keys(fields), ['name', 'email', 'company', 'role']);
});

test('validateContact rejects bad input', () => {
  assert.match(validateContact(null).error, /name/);
  assert.match(validateContact({ email: 'ann@example.com' }).error, /name/);
  assert.match(validateContact({ name: 'Ann', email: 'not-an-email' }).error, /email/);
  assert.match(validateContact({ name: 'Ann', email: 'ann@example.com\nBcc: x@example.com' }).error, /email/);
  assert.match(validateContact({ name: 'A\nB', email: 'ann@example.com' }).error, /name/);
  assert.match(validateContact({ name: 42, email: 'ann@example.com' }).error, /name/);
  assert.match(validateContact({ name: 'x'.repeat(101), email: 'ann@example.com' }).error, /name/);
});
