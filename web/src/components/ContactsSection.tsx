import { useState } from 'react'
import { deleteContact } from '../api'
import { OUTREACH_LABELS, REFERRAL_LABELS, type Contact } from '../types'

interface ContactsSectionProps {
  applicationId: number // used in step 3, to add contacts to this application
  contacts: Contact[]
  // Called with the new list after a change, so App can update the board too
  onChange: (contacts: Contact[]) => void
}

// The contacts part of the edit dialog. It doesn't keep its own copy of the list:
// App owns the contacts and passes them down; this component reports changes back up.
export function ContactsSection({ contacts, onChange }: ContactsSectionProps) {
  const [error, setError] = useState<string | null>(null)
  // Which contact is being removed right now, to disable its button while waiting
  const [removingId, setRemovingId] = useState<number | null>(null)

  async function handleRemove(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from this application?`)) return

    setError(null)
    setRemovingId(contact.id)
    try {
      await deleteContact(contact.id)
      // Report the list without this contact; App's state (and the board card) updates
      onChange(contacts.filter((c) => c.id !== contact.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="contacts">
      <h3>Contacts</h3>

      {contacts.length === 0 && <p className="contacts-empty">No contacts yet</p>}

      <ul className="contact-list">
        {contacts.map((contact) => (
          <li key={contact.id} className="contact">
            <div className="contact-main">
              <div>
                <strong>{contact.name}</strong>
                {contact.title && <span className="contact-title"> · {contact.title}</span>}
              </div>
              <div className="contact-statuses">
                {OUTREACH_LABELS[contact.outreach_status]} ·{' '}
                {REFERRAL_LABELS[contact.referral_status]}
              </div>
              {contact.email && <div className="contact-detail">{contact.email}</div>}
            </div>

            <button
              type="button"
              className="button-danger-quiet"
              onClick={() => handleRemove(contact)}
              disabled={removingId === contact.id}
            >
              {removingId === contact.id ? 'Removing…' : 'Remove'}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="error">{error}</p>}
    </section>
  )
}
