const MAX_FIELD_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;

// The starting contacts, used until the first contact is added or edited.
export const sampleContacts = [
  { id: 'amara-okafor', name: 'Amara Okafor', email: 'amara.okafor@example.com', company: 'Northwind Logistics', role: 'Operations Manager' },
  { id: 'daniel-reyes', name: 'Daniel Reyes', email: 'daniel.reyes@example.com', company: 'Brightline Studio', role: 'Product Designer' },
  { id: 'hana-sato', name: 'Hana Sato', email: 'hana.sato@example.com', company: 'Kestrel Software', role: 'Engineering Lead' },
  { id: 'liam-novak', name: 'Liam Novak', email: 'liam.novak@example.com', company: 'Harbor Finance', role: 'Account Director' },
  { id: 'meron-tesfaye', name: 'Meron Tesfaye', email: 'meron.tesfaye@example.com', company: 'Blue Nile Trading', role: 'Founder' },
  { id: 'sofia-marin', name: 'Sofia Marin', email: 'sofia.marin@example.com', company: 'Evergreen Health', role: 'Recruiter' },
];

export function filterContacts(list, query) {
  const term = query.trim().toLowerCase();
  if (!term) return list;
  return list.filter((contact) =>
    [contact.name, contact.email, contact.company, contact.role].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
}

// Returns { error } or { fields }, keeping only the fields a contact is allowed to have.
export function validateContact(input) {
  const fields = {};
  for (const name of ['name', 'email', 'company', 'role']) {
    const value = input?.[name] ?? '';
    if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) {
      return { error: `Enter a valid ${name}.` };
    }
    fields[name] = value.trim();
  }

  if (!fields.name) return { error: 'Enter a name.' };
  if (!EMAIL_PATTERN.test(fields.email) || fields.email.length > MAX_EMAIL_LENGTH) {
    return { error: 'Enter a valid email address.' };
  }
  for (const name of ['name', 'company', 'role']) {
    if (fields[name].length > MAX_FIELD_LENGTH) {
      return { error: `Keep the ${name} under ${MAX_FIELD_LENGTH} characters.` };
    }
  }
  return { fields };
}
