'use client';

import { useState } from 'react';
import { filterContacts } from '../lib/contacts.mjs';

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

export default function ContactsApp({ contacts }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(contacts[0].id);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const visibleContacts = filterContacts(contacts, query);
  const selected = contacts.find((contact) => contact.id === selectedId);

  function selectContact(id) {
    setSelectedId(id);
    setStatus(null);
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
        <h1>Contacts</h1>
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
                  <small>{contact.role}, {contact.company}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="composer" aria-label="Send an email">
        <h2>Email {selected.name}</h2>
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

        {status && (
          <p className={`status ${status.type}`} role="status">{status.text}</p>
        )}
      </section>
    </main>
  );
}
