// Sample contacts. Replace an email with your own address to test real sending.
export const contacts = [
  { id: 'amara-okafor', name: 'Amara Okafor', email: 'amara.okafor@example.com', company: 'Northwind Logistics', role: 'Operations Manager' },
  { id: 'daniel-reyes', name: 'Daniel Reyes', email: 'daniel.reyes@example.com', company: 'Brightline Studio', role: 'Product Designer' },
  { id: 'hana-sato', name: 'Hana Sato', email: 'hana.sato@example.com', company: 'Kestrel Software', role: 'Engineering Lead' },
  { id: 'liam-novak', name: 'Liam Novak', email: 'liam.novak@example.com', company: 'Harbor Finance', role: 'Account Director' },
  { id: 'meron-tesfaye', name: 'Meron Tesfaye', email: 'meron.tesfaye@example.com', company: 'Blue Nile Trading', role: 'Founder' },
  { id: 'sofia-marin', name: 'Sofia Marin', email: 'sofia.marin@example.com', company: 'Evergreen Health', role: 'Recruiter' },
];

export function findContact(id) {
  return contacts.find((contact) => contact.id === id);
}

export function filterContacts(list, query) {
  const term = query.trim().toLowerCase();
  if (!term) return list;
  return list.filter((contact) =>
    [contact.name, contact.email, contact.company, contact.role].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
}
