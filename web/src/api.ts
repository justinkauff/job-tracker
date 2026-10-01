// Every call to the backend lives here, so components never build URLs or parse responses.
import type { Application, ApplicationChanges } from './types'

export async function fetchApplications(): Promise<Application[]> {
  const response = await fetch('/applications')
  if (!response.ok) {
    throw new Error(`Loading applications failed (${await errorMessage(response)})`)
  }
  return response.json()
}

export async function updateApplication(
  id: number,
  changes: ApplicationChanges,
): Promise<Application> {
  const response = await fetch(`/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
  if (!response.ok) {
    throw new Error(`Saving failed (${await errorMessage(response)})`)
  }
  return response.json()
}

// Our API sends errors as { "error": "..." }. Fall back to the status code if it didn't.
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    return body.error ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}
