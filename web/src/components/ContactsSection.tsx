import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError, createContact, deleteContact, updateContact } from '../api'
import {
  OUTREACH_LABELS,
  OUTREACH_STATUSES,
  REFERRAL_LABELS,
  REFERRAL_STATUSES,
  type Contact,
  type ContactChanges,
  type OutreachStatus,
  type ReferralStatus,
} from '../types'
import { Field } from './ApplicationDialog'

interface ContactsSectionProps {
  applicationId: number
  contacts: Contact[]
  // Called with the new list after a change, so App can update the board too
  onChange: (contacts: Contact[]) => void
}

// The add-contact form. Every input holds a string while typing ("" means empty).
interface ContactFormValues {
  name: string
  title: string
  email: string
  linkedin_url: string
  how_met: string
  outreach_status: OutreachStatus
  referral_status: ReferralStatus
}

const EMPTY_CONTACT: ContactFormValues = {
  name: '',
  title: '',
  email: '',
  linkedin_url: '',
  how_met: '',
  outreach_status: 'not_contacted',
  referral_status: 'none',
}

// The contacts part of the edit dialog. It doesn't keep its own copy of the list:
// App owns the contacts and passes them down; this component reports changes back up.
export function ContactsSection({ applicationId, contacts, onChange }: ContactsSectionProps) {
  const [error, setError] = useState<string | null>(null)
  // Which contact is being saved or removed right now, to disable its controls while waiting
  const [busyId, setBusyId] = useState<number | null>(null)

  // The add form
  const [adding, setAdding] = useState(false)
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSaving(true)

    try {
      const created = await createContact(applicationId, toPayload(values))
      onChange([...contacts, created]) // the old list plus the new contact
      setValues(EMPTY_CONTACT)
      setAdding(false)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors)
      } else {
        setError((err as Error).message)
      }
    } finally {
      setSaving(false)
    }
  }

  function cancelAdd() {
    setValues(EMPTY_CONTACT)
    setFieldErrors({})
    setAdding(false)
  }

  // Changing a status dropdown saves right away (no Save button).
  // Like removing, it waits for the server, then swaps in the saved contact.
  async function handleStatusChange(contact: Contact, changes: ContactChanges) {
    setError(null)
    setBusyId(contact.id)
    try {
      const saved = await updateContact(contact.id, changes)
      onChange(contacts.map((c) => (c.id === saved.id ? saved : c)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from this application?`)) return

    setError(null)
    setBusyId(contact.id)
    try {
      await deleteContact(contact.id)
      // Report the list without this contact; App's state (and the board card) updates
      onChange(contacts.filter((c) => c.id !== contact.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="contacts">
      <h3>Contacts</h3>

      {contacts.length === 0 && !adding && <p className="contacts-empty">No contacts yet</p>}

      <ul className="contact-list">
        {contacts.map((contact) => (
          <li key={contact.id} className="contact">
            <div className="contact-main">
              <div>
                <strong>{contact.name}</strong>
                {contact.title && <span className="contact-title"> · {contact.title}</span>}
              </div>
              {contact.email && <div className="contact-detail">{contact.email}</div>}
              {contact.how_met && <div className="contact-detail">Met: {contact.how_met}</div>}

              <div className="contact-selects">
                <select
                  aria-label={`Outreach status for ${contact.name}`}
                  value={contact.outreach_status}
                  disabled={busyId === contact.id}
                  onChange={(e) =>
                    handleStatusChange(contact, { outreach_status: e.target.value as OutreachStatus })
                  }
                >
                  {OUTREACH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {OUTREACH_LABELS[status]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Referral status for ${contact.name}`}
                  value={contact.referral_status}
                  disabled={busyId === contact.id}
                  onChange={(e) =>
                    handleStatusChange(contact, { referral_status: e.target.value as ReferralStatus })
                  }
                >
                  {REFERRAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {REFERRAL_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="button-danger-quiet"
              onClick={() => handleRemove(contact)}
              disabled={busyId === contact.id}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {!adding && (
        <button type="button" className="contacts-add" onClick={() => setAdding(true)}>
          + Add contact
        </button>
      )}

      {adding && (
        // Its own form, outside the application's form (forms can't be nested)
        <form className="contact-form" onSubmit={handleAdd}>
          <div className="field-row">
            <Field label="Name *" error={fieldErrors.name}>
              <input name="name" value={values.name} onChange={handleChange} required autoFocus />
            </Field>
            <Field label="Title" error={fieldErrors.title}>
              <input name="title" value={values.title} onChange={handleChange} placeholder="Recruiter" />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Email" error={fieldErrors.email}>
              <input type="email" name="email" value={values.email} onChange={handleChange} />
            </Field>
            <Field label="LinkedIn" error={fieldErrors.linkedin_url}>
              <input
                type="url"
                name="linkedin_url"
                value={values.linkedin_url}
                onChange={handleChange}
                placeholder="https://"
              />
            </Field>
          </div>
          <Field label="How you met" error={fieldErrors.how_met}>
            <input name="how_met" value={values.how_met} onChange={handleChange} placeholder="Career fair" />
          </Field>
          <div className="field-row">
            <Field label="Outreach" error={fieldErrors.outreach_status}>
              <select name="outreach_status" value={values.outreach_status} onChange={handleChange}>
                {OUTREACH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {OUTREACH_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Referral" error={fieldErrors.referral_status}>
              <select name="referral_status" value={values.referral_status} onChange={handleChange}>
                {REFERRAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {REFERRAL_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="dialog-actions">
            <button type="button" onClick={cancelAdd} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add contact'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

// Form strings → API values. Empty optional fields become null.
function toPayload(values: ContactFormValues): ContactChanges {
  const orNull = (text: string) => (text.trim() === '' ? null : text.trim())
  return {
    name: values.name.trim(),
    title: orNull(values.title),
    email: orNull(values.email),
    linkedin_url: orNull(values.linkedin_url),
    how_met: orNull(values.how_met),
    outreach_status: values.outreach_status,
    referral_status: values.referral_status,
  }
}
