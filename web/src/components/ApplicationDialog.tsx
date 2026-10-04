import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ApiError, createApplication, deleteApplication, updateApplication } from '../api'
import { todayIso } from '../format'
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationChanges,
  type ApplicationRow,
  type ApplicationStatus,
  type Contact,
} from '../types'
import { ContactsSection } from './ContactsSection'

interface ApplicationDialogProps {
  // The application to edit, or null to add a new one
  application: Application | null
  // The live contacts from App's state (not the snapshot inside `application`),
  // so changes show up here and on the board at the same time
  contacts: Contact[]
  onContactsChange: (contacts: Contact[]) => void
  onClose: () => void
  onSaved: (saved: ApplicationRow) => void
  onDeleted: (id: number) => void
}

// Every input holds a string while editing ("" means empty). They're converted
// to the API's types (null for empty) only when the form is submitted.
interface FormValues {
  company: string
  role: string
  status: ApplicationStatus
  date_applied: string
  location: string
  url: string
  notes: string
}

export function ApplicationDialog({
  application,
  contacts,
  onContactsChange,
  onClose,
  onSaved,
  onDeleted,
}: ApplicationDialogProps) {
  const isNew = application === null
  const [values, setValues] = useState<FormValues>(() => initialValues(application))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // A ref points at the real <dialog> element in the page, so we can call its
  // browser methods. showModal() dims the page behind it and makes Esc close it.
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // One change handler for every input: the input's name says which field to update
  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    // Stop the browser's default form behavior (reloading the page)
    event.preventDefault()
    setBusy(true)
    setFieldErrors({})
    setFormError(null)

    try {
      const payload = toPayload(values)
      const saved = isNew
        ? await createApplication(payload)
        : await updateApplication(application.id, payload)
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors)
      } else {
        setFormError((err as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (isNew) return
    if (!window.confirm(`Delete ${application.company}? Its contacts will be deleted too.`)) return
    setBusy(true)
    try {
      await deleteApplication(application.id)
      onDeleted(application.id)
    } catch (err) {
      setFormError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    // onClose fires when Esc is pressed, so the parent can stop showing this dialog
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>{isNew ? 'Add application' : 'Edit application'}</h2>

        <Field label="Company *" error={fieldErrors.company}>
          <input name="company" value={values.company} onChange={handleChange} required autoFocus />
        </Field>
        <Field label="Role" error={fieldErrors.role}>
          <input name="role" value={values.role} onChange={handleChange} />
        </Field>

        <div className="field-row">
          <Field label="Status" error={fieldErrors.status}>
            <select name="status" value={values.status} onChange={handleChange}>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date applied" error={fieldErrors.date_applied}>
            {/* type="date" shows a date picker and gives us "YYYY-MM-DD", the format the API wants */}
            <input type="date" name="date_applied" value={values.date_applied} onChange={handleChange} />
          </Field>
        </div>

        <Field label="Location" error={fieldErrors.location}>
          <input name="location" value={values.location} onChange={handleChange} />
        </Field>
        <Field label="Posting link" error={fieldErrors.url}>
          <input type="url" name="url" value={values.url} onChange={handleChange} placeholder="https://" />
        </Field>
        <Field label="Notes" error={fieldErrors.notes}>
          <textarea name="notes" value={values.notes} onChange={handleChange} rows={3} />
        </Field>

        {formError && <p className="error">{formError}</p>}

        <div className="dialog-actions">
          {!isNew && (
            <button type="button" className="button-danger" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      {/* Outside the <form> on purpose: HTML doesn't allow a form inside a form, and the
          contacts section gets its own form in step 3. Only when editing, because a new
          application has no id yet, so it can't have contacts. */}
      {!isNew && (
        <ContactsSection
          applicationId={application.id}
          contacts={contacts}
          onChange={onContactsChange}
        />
      )}
    </dialog>
  )
}

// A label wrapped around its input, with the input's error message underneath.
// children is whatever is placed between <Field> and </Field>.
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

function initialValues(application: Application | null): FormValues {
  if (application === null) {
    // New applications are usually added right after applying
    return {
      company: '',
      role: '',
      status: 'applied',
      date_applied: todayIso(),
      location: '',
      url: '',
      notes: '',
    }
  }
  return {
    company: application.company,
    role: application.role ?? '',
    status: application.status,
    date_applied: application.date_applied ?? '',
    location: application.location ?? '',
    url: application.url ?? '',
    notes: application.notes ?? '',
  }
}

// Form strings → API values. Empty optional fields become null, which clears them on edit.
function toPayload(values: FormValues): ApplicationChanges {
  const orNull = (text: string) => (text.trim() === '' ? null : text.trim())
  return {
    company: values.company.trim(),
    role: orNull(values.role),
    status: values.status,
    date_applied: orNull(values.date_applied),
    location: orNull(values.location),
    url: orNull(values.url),
    notes: orNull(values.notes),
  }
}
