// Every call to the backend lives here, so components never build URLs or parse responses.
import type { Application } from './types'

export async function fetchApplications(): Promise<Application[]> {
  const response = await fetch('/applications')
  if (!response.ok) {
    throw new Error(`Loading applications failed (HTTP ${response.status})`)
  }
  return response.json()
}
