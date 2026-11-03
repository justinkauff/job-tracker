import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  ApiError,
  createApplication,
  createContact,
  deleteApplication,
  deleteContact,
  deleteDocument,
  updateApplication,
  updateContact,
  uploadDocument,
} from '../api'
import { todayIso } from '../format'
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationChanges,
  type ApplicationDocument,
  type ApplicationRow,
  type ApplicationStatus,
  type Contact,
  type ContactChanges,
  type DocumentKind,
} from '../types'
import { ContactsSection } from './ContactsSection'
import { DocumentsSection } from './DocumentsSection'

interface ApplicationDialogProps {
  // The application to edit, or null to add a new one
  application: Application | null
  // Adding only: a company to start the form with (from a search with no results)
  initialCompany?: string
  // When editing: the live contacts and documents from App's state (not the snapshot
  // inside `application`), so changes show up here and on the board at the same time
  contacts: Contact[]
  onContactsChange: (contacts: Contact[]) => void
  documents: ApplicationDocument[]
  onDocumentsChange: (documents: ApplicationDocument[]) => void
  // A message to show at the top, e.g. after a new application saved only partly
  notice: string | null
  onClose: () => void
  // Editing: the saved row. Adding: the new application with whatever was attached to it,
  // plus a description of anything that failed to save.
  onSaved: (saved: ApplicationRow) => void
  onCreated: (created: Application, failures: string[]) => void
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

// A file chosen in the Add form, waiting to be uploaded on Save.
// `document` is a stand-in so DocumentsSection can show it like a real one.
interface DraftDocument {
  document: ApplicationDocument
  file: File
}

export function ApplicationDialog({
  application,
  initialCompany,
  contacts,
  onContactsChange,
  documents,
  onDocumentsChange,
  notice,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: ApplicationDialogProps) {
  const isNew = application === null
  const [values, setValues] = useState<FormValues>(() => initialValues(application, initialCompany))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // A unique id for the <form>, so the Save button below the sections can submit it
  const formId = useId()

  // Adding only: contacts and files collected before the application exists.
  // They get negative ids (from this counter) so they can't clash with real ones.
  const [draftContacts, setDraftContacts] = useState<Contact[]>([])
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([])
  const nextDraftId = useRef(-1)
  const takeDraftId = () => nextDraftId.current--

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
      if (isNew) {
        await createWithAttachments(payload)
      } else {
        onSaved(await updateApplication(application.id, payload))
      }
    } catch (err) {
      // Only the application itself can fail here; the drafts stay in the form for a retry
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors)
      } else {
        setFormError((err as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }

  // Adding: create the application first (everything else needs its id), then upload
  // each file and create each contact. One failed file or contact doesn't undo the rest;
  // it's reported so the parent can reopen the new application to fix it.
  async function createWithAttachments(payload: ApplicationChanges) {
    const created = await createApplication(payload)
    const failures: string[] = []

    const uploaded: ApplicationDocument[] = []
    for (const draft of draftDocuments) {
      try {
        uploaded.push(await uploadDocument(created.id, draft.document.kind, draft.file))
      } catch (err) {
        failures.push(`${draft.file.name}: ${describeError(err)}`)
      }
    }

    const savedContacts: Contact[] = []
    for (const draft of draftContacts) {
      try {
        savedContacts.push(await createContact(created.id, contactValues(draft)))
      } catch (err) {
        failures.push(`${draft.name}: ${describeError(err)}`)
      }
    }

    // reverse(): newest first, matching the order the server lists documents in
    onCreated({ ...created, contacts: savedContacts, documents: uploaded.reverse() }, failures)
  }

  async function handleDelete() {
    if (isNew) return
    if (!window.confirm(`Delete ${application.company}? Its contacts and documents will be deleted too.`)) {
      return
    }
    setBusy(true)
    try {
      await deleteApplication(application.id)
      onDeleted(application.id)
    } catch (err) {
      setFormError((err as Error).message)
      setBusy(false)
    }
  }

  // What the contacts and documents sections' actions do. Editing: save to the API now
  // and tell App. Adding: change the drafts held in this form.
  const contactActions =
    application === null
      ? {
          onAdd: async (values: ContactChanges) =>
            setDraftContacts((current) => [...current, draftContact(takeDraftId(), values)]),
          onUpdate: async (contact: Contact, changes: ContactChanges) =>
            setDraftContacts((current) =>
              current.map((c) => (c.id === contact.id ? { ...c, ...changes } : c)),
            ),
          onRemove: async (contact: Contact) =>
            setDraftContacts((current) => current.filter((c) => c.id !== contact.id)),
        }
      : {
          onAdd: async (values: ContactChanges) => {
            const created = await createContact(application.id, values)
            onContactsChange([...contacts, created])
          },
          onUpdate: async (contact: Contact, changes: ContactChanges) => {
            const saved = await updateContact(contact.id, changes)
            onContactsChange(contacts.map((c) => (c.id === saved.id ? saved : c)))
          },
          onRemove: async (contact: Contact) => {
            await deleteContact(contact.id)
            onContactsChange(contacts.filter((c) => c.id !== contact.id))
          },
        }

  const documentActions =
    application === null
      ? {
          onAdd: async (kind: DocumentKind, file: File) =>
            setDraftDocuments((current) => [draftDocument(takeDraftId(), kind, file), ...current]),
          onRemove: async (document: ApplicationDocument) =>
            setDraftDocuments((current) => current.filter((d) => d.document.id !== document.id)),
        }
      : {
          onAdd: async (kind: DocumentKind, file: File) => {
            const uploaded = await uploadDocument(application.id, kind, file)
            onDocumentsChange([uploaded, ...documents]) // newest first, like the server's order
          },
          onRemove: async (document: ApplicationDocument) => {
            await deleteDocument(document.id)
            onDocumentsChange(documents.filter((d) => d.id !== document.id))
          },
        }

  return (
    // onClose fires when Esc is pressed, so the parent can stop showing this dialog
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <form id={formId} onSubmit={handleSubmit}>
        <h2>{isNew ? 'Add application' : 'Edit application'}</h2>

        {notice && <p className="notice">{notice}</p>}

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

        {/* Editing saves right here. When adding, Save is at the bottom instead,
            after the documents and contacts, since it saves those too. */}
        {!isNew && (
          <DialogActions busy={busy} onClose={onClose} onDelete={handleDelete} />
        )}
      </form>

      {/* Outside the <form> on purpose: HTML doesn't allow a form inside a form,
          and each section has its own small form for adding an item */}
      <DocumentsSection
        documents={isNew ? draftDocuments.map((d) => d.document) : documents}
        draft={isNew}
        {...documentActions}
      />
      <ContactsSection
        contacts={isNew ? draftContacts : contacts}
        confirmRemove={!isNew}
        {...contactActions}
      />

      {isNew && (
        <div className="dialog-footer">
          <DialogActions busy={busy} onClose={onClose} formId={formId} />
        </div>
      )}
    </dialog>
  )
}

// Cancel/Save (and Delete when editing). Save is always the form's submit button, so the
// browser's own checks (like "Company is required") run first. Below the sections it's
// outside the <form>, so formId connects it: <button form="id"> submits that form.
function DialogActions({
  busy,
  onClose,
  onDelete,
  formId,
}: {
  busy: boolean
  onClose: () => void
  onDelete?: () => void
  formId?: string
}) {
  return (
    <div className="dialog-actions">
      {onDelete && (
        <button type="button" className="button-danger" onClick={onDelete} disabled={busy}>
          Delete
        </button>
      )}
      <button type="button" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="submit" form={formId} className="button-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
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

function initialValues(application: Application | null, initialCompany = ''): FormValues {
  if (application === null) {
    // New applications are usually added right after applying
    return {
      company: initialCompany,
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

// A draft contact shaped like a real one, so ContactsSection can show it the same way
function draftContact(id: number, values: ContactChanges): Contact {
  return {
    id,
    application_id: 0,
    name: values.name ?? '',
    title: values.title ?? null,
    email: values.email ?? null,
    linkedin_url: values.linkedin_url ?? null,
    how_met: values.how_met ?? null,
    outreach_status: values.outreach_status ?? 'not_contacted',
    referral_status: values.referral_status ?? 'none',
    last_contacted_on: values.last_contacted_on ?? null,
    notes: values.notes ?? null,
    created_at: '',
    updated_at: '',
  }
}

// The fields of a draft contact that get sent to the API when saving
function contactValues(contact: Contact): ContactChanges {
  return {
    name: contact.name,
    title: contact.title,
    email: contact.email,
    linkedin_url: contact.linkedin_url,
    how_met: contact.how_met,
    outreach_status: contact.outreach_status,
    referral_status: contact.referral_status,
  }
}

function draftDocument(id: number, kind: DocumentKind, file: File): DraftDocument {
  return {
    document: {
      id,
      application_id: 0,
      kind,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      created_at: '',
    },
    file,
  }
}

// A short reason for a failed save: the field messages if the API sent any, else the error
function describeError(err: unknown): string {
  if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
    return Object.values(err.fieldErrors).join('; ')
  }
  return (err as Error).message
}
