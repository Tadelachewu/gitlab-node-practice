import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sampleContacts } from './contacts.mjs';

function getContactsFile() {
  const directory = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(directory, 'contacts.json');
}

export async function readContacts() {
  try {
    return JSON.parse(await readFile(getContactsFile(), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return sampleContacts;
    throw error;
  }
}

export async function findContact(id) {
  return (await readContacts()).find((contact) => contact.id === id);
}

// Writes to a temporary file first, so a crash can't leave a half-written contacts file.
async function writeContacts(contacts) {
  const file = getContactsFile();
  const temporaryFile = `${file}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(temporaryFile, JSON.stringify(contacts, null, 2));
  await rename(temporaryFile, file);
}

// Runs changes one at a time, so simultaneous saves can't overwrite each other. The queue is
// on globalThis because each API route can load its own copy of this module.
function runInOrder(change) {
  const result = (globalThis.contactWriteQueue ?? Promise.resolve()).then(change);
  globalThis.contactWriteQueue = result.catch(() => {});
  return result;
}

export function addContact(fields) {
  return runInOrder(async () => {
    const contact = { id: randomUUID(), ...fields };
    await writeContacts([...(await readContacts()), contact]);
    return contact;
  });
}

// Returns the updated contact, or undefined if there is no contact with that ID.
export function updateContact(id, fields) {
  return runInOrder(async () => {
    const contacts = await readContacts();
    const index = contacts.findIndex((contact) => contact.id === id);
    if (index === -1) return undefined;

    const contact = { id, ...fields };
    await writeContacts(contacts.with(index, contact));
    return contact;
  });
}
