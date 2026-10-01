import { useEffect, useState } from 'react'
import { fetchApplications, updateApplication } from './api'
import { Board } from './components/Board'
import type { Application, ApplicationStatus } from './types'

export default function App() {
  // State: values that, when changed, make React re-run this function and update the page
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  return (
    <main>
      <header className="header">
        <h1>Job Tracker</h1>
        {!loading && !error && <span className="total">{applications.length} applications</span>}
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
        <Board applications={applications} onStatusChange={handleStatusChange} />
      )}
    </main>
  )
}
