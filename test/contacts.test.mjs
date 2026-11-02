import test from 'node:test';
import assert from 'node:assert/strict';
import { contacts, filterContacts, findContact } from '../src/lib/contacts.mjs';

test('contacts have unique ids', () => {
  const ids = contacts.map((contact) => contact.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('findContact returns undefined for an unknown id', () => {
  assert.equal(findContact(contacts[0].id), contacts[0]);
  assert.equal(findContact('nobody'), undefined);
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
