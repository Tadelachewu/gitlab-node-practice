import ContactsApp from '../components/ContactsApp';
import { readContacts } from '../lib/contact-store.mjs';

// Contacts can change while the app is running, so read them on every request.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <ContactsApp initialContacts={await readContacts()} />;
}
