import ContactsApp from '../components/ContactsApp';
import { contacts } from '../lib/contacts.mjs';

export default function HomePage() {
  return <ContactsApp contacts={contacts} />;
}
