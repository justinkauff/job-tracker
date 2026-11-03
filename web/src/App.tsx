import { useEffect, useRef, useState } from 'react'
import { fetchApplications, updateApplication } from './api'
import { ApplicationDialog } from './components/ApplicationDialog'
import { Board } from './components/Board'
import { matchesSearch } from './search'
import type {
  Application,
  ApplicationDocument,
  ApplicationRow,
  ApplicationStatus,
  Contact,
} from './types'

// What the dialog is showing: nothing, the "add" form (optionally with the company filled in,
// e.g. from a search with no results), or the edit form for one application (optionally
// with a notice at the top, e.g. "these files didn't upload")
type DialogState =
  | { mode: 'closed' }
  | { mode: 'add'; company?: string }
  | { mode: 'edit'; application: Application; notice?: string }

export default function App() {
  // State: values that, when changed, make React re-run this function and update the page
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)

  // Runs after the first render. The empty [] means "only once", not on every re-render.
  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Pressing "/" anywhere on the board jumps to the search box (unless you're already
  // typing in a field). The listener is added once, and the cleanup function removes it
  // if App ever unmounts, so it isn't left behind.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const typing = target.closest('input, textarea, select, dialog') !== null
      if (event.key === '/' && !typing) {
        event.preventDefault() // don't type the "/" into the box
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Derived data again: the board shows the matching applications, computed on every
  // render from the full list. The full list itself never changes because of a search.
  const visible = applications.filter((a) => matchesSearch(a, query))
  const searching = query.trim() !== ''

  // Replace one application in the list. Uses the "updater" form of setApplications
  // (a function of the current list) so it always works on the latest state.
  function replaceApplication(id: number, change: (a: Application) => Application) {
    setApplications((current) => current.map((a) => (a.id === id ? change(a) : a)))
  }

  // Optimistic update: move the card right away so the board feels instant,
  // then save. If the save fails, put the card back and show why.
  function handleStatusChange(id: number, newStatus: ApplicationStatus) {
    const oldStatus = applications.find((a) => a.id === id)?.status
    if (!oldStatus) return

    setSaveError(null)
    replaceApplication(id, (a) => ({ ...a, status: newStatus }))

    updateApplication(id, { status: newStatus })
      .then((saved) => replaceApplication(id, (a) => keepAttached(saved, a)))
      .catch((err: Error) => {
        replaceApplication(id, (a) => ({ ...a, status: oldStatus }))
        setSaveError(err.message)
      })
  }

  // An edit was saved. The form waits for the server before closing (not optimistic):
  // the server might reject the input, and the form needs to stay open to show why.
  function handleSaved(saved: ApplicationRow) {
    replaceApplication(saved.id, (a) => keepAttached(saved, a))
    setDialog({ mode: 'closed' })
  }

  // A new application was created, along with whatever files and contacts saved with it
  function handleCreated(created: Application, failures: string[]) {
    setApplications((current) => [created, ...current])
    if (failures.length === 0) {
      setDialog({ mode: 'closed' })
    } else {
      // The application exists now, so reopen it in edit mode to retry what failed
      setDialog({
        mode: 'edit',
        application: created,
        notice: `Saved the application, but these didn't save: ${failures.join(' · ')}. You can add them again below.`,
      })
    }
  }

  function handleDeleted(id: number) {
    setApplications((current) => current.filter((a) => a.id !== id))
    setDialog({ mode: 'closed' })
  }

  // The contacts section saved a change: store the new list on that application,
  // which updates both the dialog and the card on the board
  function handleContactsChange(applicationId: number, contacts: Contact[]) {
    replaceApplication(applicationId, (a) => ({ ...a, contacts }))
  }

  // Same for documents
  function handleDocumentsChange(applicationId: number, documents: ApplicationDocument[]) {
    replaceApplication(applicationId, (a) => ({ ...a, documents }))
  }

  // The live version of the application being edited. dialog.application is a snapshot
  // from when the dialog opened, so its contacts and documents would go stale after a change.
  const editing =
    dialog.mode === 'edit' ? applications.find((a) => a.id === dialog.application.id) : undefined

  return (
    <main>
      <header className="header">
        <h1>Job Tracker</h1>
        {!loading && !error && (
          <span className="total">
            {searching ? `${visible.length} of ${applications.length}` : applications.length}{' '}
            applications
          </span>
        )}

        <div className="search">
          <input
            ref={searchInput}
            type="search"
            className="search-input"
            placeholder="Search company, role, or contact  ( / )"
            aria-label="Search applications"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Esc clears the search; a second Esc (when it's already empty) leaves the box
              if (e.key === 'Escape') {
                if (query) setQuery('')
                else e.currentTarget.blur()
              }
            }}
            disabled={loading || error !== null}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                searchInput.current?.focus()
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="button-primary header-add"
          onClick={() => setDialog({ mode: 'add' })}
          disabled={loading || error !== null}
        >
          + Add application
        </button>
      </header>

      {saveError && (
        <p className="error banner">
          {saveError}
          <button type="button" onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </p>
      )}

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && searching && visible.length === 0 ? (
        // Nothing matches: say so, and offer to add it (the usual next step when you
        // were checking whether you'd applied somewhere)
        <div className="empty-search">
          <p>No applications match “{query.trim()}”.</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => setDialog({ mode: 'add', company: query.trim() })}
          >
            + Add “{query.trim()}” as a new application
          </button>
        </div>
      ) : (
        !loading &&
        !error && (
          <Board
            applications={visible}
            onStatusChange={handleStatusChange}
            onOpen={(application) => setDialog({ mode: 'edit', application })}
          />
        )
      )}

      {/* Rendered only while open. The key gives each application its own fresh form,
          so switching from one card to another never shows the previous card's values. */}
      {dialog.mode !== 'closed' && (
        <ApplicationDialog
          key={dialog.mode === 'edit' ? dialog.application.id : 'new'}
          application={dialog.mode === 'edit' ? dialog.application : null}
          initialCompany={dialog.mode === 'add' ? dialog.company : undefined}
          contacts={editing?.contacts ?? []}
          onContactsChange={(contacts) => {
            if (editing) handleContactsChange(editing.id, contacts)
          }}
          documents={editing?.documents ?? []}
          onDocumentsChange={(documents) => {
            if (editing) handleDocumentsChange(editing.id, documents)
          }}
          notice={dialog.mode === 'edit' ? (dialog.notice ?? null) : null}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={handleSaved}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
      )}
    </main>
  )
}

// POST and PATCH return a bare row without contacts or documents. Combine the saved row
// with the lists the board already has, so the card doesn't lose them after a save.
function keepAttached(saved: ApplicationRow, previous: Application): Application {
  return { ...saved, contacts: previous.contacts, documents: previous.documents }
}
