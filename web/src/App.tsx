import { useEffect, useState } from 'react'
import { fetchApplications } from './api'
import { Board } from './components/Board'
import type { Application } from './types'

export default function App() {
  // State: values that, when changed, make React re-run this function and update the page
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Runs after the first render. The empty [] means "only once", not on every re-render.
  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main>
      <header className="header">
        <h1>Job Tracker</h1>
        {!loading && !error && <span className="total">{applications.length} applications</span>}
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <Board applications={applications} />}
    </main>
  )
}
