'use client';

import { useState } from 'react';
import ContactForm from './ContactForm';
import { filterContacts } from '../lib/contacts.mjs';

function initials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

export default function ContactsApp({ initialContacts }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialContacts[0]?.id);
  // What the right-hand panel shows: 'email', 'add', or 'edit'.
  const [panel, setPanel] = useState(initialContacts.length ? 'email' : 'add');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const visibleContacts = filterContacts(contacts, query);
  const selected = contacts.find((contact) => contact.id === selectedId);

  function selectContact(id) {
    setSelectedId(id);
    setPanel('email');
    setStatus(null);
  }

  function showForm(form) {
    setPanel(form);
    setStatus(null);
  }

  function handleSaved(saved) {
    const isNew = !contacts.some((contact) => contact.id === saved.id);
    setContacts(
      isNew ? [...contacts, saved] : contacts.map((contact) => (contact.id === saved.id ? saved : contact)),
    );
    setSelectedId(saved.id);
    setPanel('email');
    setStatus({ type: 'success', text: `${saved.name} ${isNew ? 'added' : 'updated'}.` });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setStatus(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selected.id, subject, message }),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus({ type: 'error', text: result.error });
        return;
      }
      setStatus({ type: 'success', text: `Email sent to ${selected.name}.` });
      setSubject('');
      setMessage('');
    } catch {
      setStatus({ type: 'error', text: 'Could not reach the server. Try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="app">
      <section className="contacts" aria-label="Contacts">
        <div className="panel-header">
          <h1>Contacts</h1>
          <button type="button" className="secondary" onClick={() => showForm('add')}>Add contact</button>
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search contacts"
          aria-label="Search contacts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {visibleContacts.length === 0 && <p className="empty">No contacts match your search.</p>}

        <ul className="contact-list">
          {visibleContacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                className="contact"
                aria-pressed={contact.id === selectedId}
                onClick={() => selectContact(contact.id)}
              >
                <span className="avatar" aria-hidden="true">{initials(contact.name)}</span>
                <span>
                  <strong>{contact.name}</strong>
                  <small>{[contact.role, contact.company].filter(Boolean).join(', ') || contact.email}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="composer" aria-label={panel === 'email' ? 'Send an email' : 'Contact details'}>
        {panel === 'add' && (
          <ContactForm key="add" onSaved={handleSaved} onCancel={() => showForm(selected ? 'email' : 'add')} />
        )}

        {panel === 'edit' && (
          <ContactForm key={selected.id} contact={selected} onSaved={handleSaved} onCancel={() => showForm('email')} />
        )}

        {panel === 'email' && (
          <>
            <div className="panel-header">
              <h2>Email {selected.name}</h2>
              <button type="button" className="secondary" onClick={() => showForm('edit')}>Edit contact</button>
            </div>
            <p className="recipient">{selected.email}</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                required
                maxLength={200}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />

              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                required
                rows={9}
                maxLength={5000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <button type="submit" className="send" disabled={sending}>
                {sending ? 'Sending…' : 'Send email'}
              </button>
            </form>
          </>
        )}

        {status && panel === 'email' && (
          <p className={`status ${status.type}`} role="status">{status.text}</p>
        )}
      </section>
    </main>
  );
}
