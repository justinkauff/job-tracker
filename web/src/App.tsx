import { useEffect, useState } from 'react'
import { fetchApplications } from './api'
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
      <h1>Job Tracker</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <p>{applications.length} applications</p>
          <ul className="application-list">
            {applications.map((application) => (
              <li key={application.id}>
                <strong>{application.company}</strong>
                {application.role && <> · {application.role}</>}
                <span className="status">{application.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
