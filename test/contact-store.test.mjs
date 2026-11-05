import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addContact, findContact, readContacts, updateContact } from '../src/lib/contact-store.mjs';
import { sampleContacts } from '../src/lib/contacts.mjs';

const fields = { name: 'Ann Lee', email: 'ann@example.com', company: 'Acme', role: 'Designer' };
const directories = [];

beforeEach(async () => {
  process.env.DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'contacts-test-'));
  directories.push(process.env.DATA_DIR);
});

after(async () => {
  delete process.env.DATA_DIR;
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

test('starts with the sample contacts', async () => {
  assert.deepEqual(await readContacts(), sampleContacts);
});

test('addContact keeps the existing contacts and gives the new one an id', async () => {
  const contact = await addContact(fields);

  assert.ok(contact.id);
  assert.equal((await readContacts()).length, sampleContacts.length + 1);
  assert.deepEqual(await findContact(contact.id), contact);
});

test('updateContact changes only that contact and keeps its id', async () => {
  const [first, second] = sampleContacts;
  const updated = await updateContact(first.id, fields);

  assert.deepEqual(updated, { id: first.id, ...fields });
  assert.deepEqual(await findContact(first.id), updated);
  assert.deepEqual(await findContact(second.id), second);
});

test('updateContact returns undefined and saves nothing for an unknown id', async () => {
  assert.equal(await updateContact('nobody', fields), undefined);
  assert.deepEqual(await readdir(process.env.DATA_DIR), []);
});

test('simultaneous saves all survive and leave no temporary files', async () => {
  await Promise.all(Array.from({ length: 20 }, (_, index) => addContact({ ...fields, name: `Contact ${index}` })));

  assert.equal((await readContacts()).length, sampleContacts.length + 20);
  assert.deepEqual(await readdir(process.env.DATA_DIR), ['contacts.json']);
});

test('a damaged contacts file is an error, so it never gets overwritten with samples', async () => {
  await writeFile(path.join(process.env.DATA_DIR, 'contacts.json'), '{ not json');

  await assert.rejects(readContacts());
  await assert.rejects(addContact(fields));
});
