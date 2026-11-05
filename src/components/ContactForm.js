'use client';

import { useState } from 'react';

const FIELDS = [
  { name: 'name', label: 'Name', required: true, maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', required: true, maxLength: 254 },
  { name: 'company', label: 'Company', maxLength: 100 },
  { name: 'role', label: 'Role', maxLength: 100 },
];

// Adds a new contact, or edits the given contact.
export default function ContactForm({ contact, onSaved, onCancel }) {
  const [values, setValues] = useState({
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    company: contact?.company ?? '',
    role: contact?.role ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(contact ? `/api/contacts/${encodeURIComponent(contact.id)}` : '/api/contacts', {
        method: contact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
        return;
      }
      onSaved(result);
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h2>{contact ? `Edit ${contact.name}` : 'Add a contact'}</h2>

      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ name, label, type = 'text', required = false, maxLength }) => (
          <div key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              type={type}
              required={required}
              maxLength={maxLength}
              value={values[name]}
              onChange={(event) => setValues({ ...values, [name]: event.target.value })}
            />
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" className="send" disabled={saving}>
            {saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
          </button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>

      {error && <p className="status error" role="status">{error}</p>}
    </>
  );
}
