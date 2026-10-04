import { useRef, useState, type FormEvent } from 'react'
import { deleteDocument, documentUrl, uploadDocument } from '../api'
import { formatBytes, formatDate } from '../format'
import {
  ALLOWED_EXTENSIONS,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KINDS,
  MAX_UPLOAD_BYTES,
  type ApplicationDocument,
  type DocumentKind,
} from '../types'

interface DocumentsSectionProps {
  applicationId: number
  documents: ApplicationDocument[]
  // Called with the new list after a change, so App can update the board too
  onChange: (documents: ApplicationDocument[]) => void
}

// The documents part of the edit dialog. Like ContactsSection, it doesn't keep its own
// copy of the list: App owns it and passes it down; changes are reported back up.
export function DocumentsSection({ applicationId, documents, onChange }: DocumentsSectionProps) {
  const [kind, setKind] = useState<DocumentKind>('resume')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A file input can't be cleared through state (browsers don't let pages set which
  // file is chosen), so a ref to the real <input> is used to reset it after uploading
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleUpload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setError(null)

    // Check in the browser first, so a wrong or huge file fails instantly
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Only PDF and DOCX files can be uploaded')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${formatBytes(file.size)}; the limit is 10 MB`)
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadDocument(applicationId, kind, file)
      onChange([uploaded, ...documents]) // newest first, like the server's order
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(document: ApplicationDocument) {
    if (!window.confirm(`Remove ${document.original_name}?`)) return
    setError(null)
    setRemovingId(document.id)
    try {
      await deleteDocument(document.id)
      onChange(documents.filter((d) => d.id !== document.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="documents">
      <h3>Documents</h3>

      {documents.length === 0 && <p className="contacts-empty">No resume or cover letter yet</p>}

      <ul className="contact-list">
        {documents.map((document) => (
          <li key={document.id} className="contact">
            <div className="contact-main">
              <div>
                <span className="document-kind">{DOCUMENT_KIND_LABELS[document.kind]}</span>{' '}
                {/* PDFs open in a new tab; DOCX files download (the server decides via
                    Content-Disposition). rel="noreferrer" as with the posting link. */}
                <a href={documentUrl(document.id)} target="_blank" rel="noreferrer">
                  {document.original_name}
                </a>
              </div>
              <div className="contact-detail">
                {formatBytes(document.size_bytes)} · uploaded {formatDate(document.created_at.slice(0, 10))}
              </div>
            </div>
            <button
              type="button"
              className="button-danger-quiet"
              onClick={() => handleRemove(document)}
              disabled={removingId === document.id}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* Its own form, outside the application's form (forms can't be nested) */}
      <form className="document-upload" onSubmit={handleUpload}>
        <select
          aria-label="Document type"
          value={kind}
          onChange={(e) => setKind(e.target.value as DocumentKind)}
        >
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {DOCUMENT_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <input
          ref={fileInput}
          type="file"
          aria-label="File to upload"
          // accept filters the file picker to these types (the server still checks)
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" className="button-primary" disabled={!file || uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </section>
  )
}
