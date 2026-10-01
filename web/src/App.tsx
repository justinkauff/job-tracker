import { useEffect, useState } from 'react'
import { fetchApplications, updateApplication } from './api'
import { ApplicationDialog } from './components/ApplicationDialog'
import { Board } from './components/Board'
import type { Application, ApplicationStatus } from './types'

// What the dialog is showing: nothing, the "add" form, or the edit form for one application
type DialogState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; application: Application }

export default function App() {
  // State: values that, when changed, make React re-run this function and update the page
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  // Runs after the first render. The empty [] means "only once", not on every re-render.
  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
      .then((saved) => replaceApplication(id, () => saved))
      .catch((err: Error) => {
        replaceApplication(id, (a) => ({ ...a, status: oldStatus }))
        setSaveError(err.message)
      })
  }

  // The form waits for the server before closing (not optimistic): the server might
  // reject the input, and the form needs to stay open to show why
  function handleSaved(saved: Application) {
    const exists = applications.some((a) => a.id === saved.id)
    setApplications((current) =>
      exists ? current.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...current],
    )
    setDialog({ mode: 'closed' })
  }

  function handleDeleted(id: number) {
    setApplications((current) => current.filter((a) => a.id !== id))
    setDialog({ mode: 'closed' })
  }

  return (
    <main>
      <header className="header">
        <h1>Job Tracker</h1>
        {!loading && !error && <span className="total">{applications.length} applications</span>}
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
      {!loading && !error && (
        <Board
          applications={applications}
          onStatusChange={handleStatusChange}
          onOpen={(application) => setDialog({ mode: 'edit', application })}
        />
      )}

      {/* Rendered only while open. The key gives each application its own fresh form,
          so switching from one card to another never shows the previous card's values. */}
      {dialog.mode !== 'closed' && (
        <ApplicationDialog
          key={dialog.mode === 'edit' ? dialog.application.id : 'new'}
          application={dialog.mode === 'edit' ? dialog.application : null}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </main>
  )
}
