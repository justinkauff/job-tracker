// Every call to the backend lives here, so components never build URLs or parse responses.
import type {
  Application,
  ApplicationChanges,
  ApplicationRow,
  Contact,
  ContactChanges,
} from './types'

// An error from our API. fieldErrors maps a field name to its validation message,
// built from the 400 response's details array: [{ field, message }].
export class ApiError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

export function fetchApplications(): Promise<Application[]> {
  return request('/applications')
}

// POST and PATCH return the row without contacts (ApplicationRow)
export function createApplication(values: ApplicationChanges): Promise<ApplicationRow> {
  return request('/applications', { method: 'POST', body: values })
}

export function updateApplication(id: number, changes: ApplicationChanges): Promise<ApplicationRow> {
  return request(`/applications/${id}`, { method: 'PATCH', body: changes })
}

export function deleteApplication(id: number): Promise<void> {
  return request(`/applications/${id}`, { method: 'DELETE' })
}

// Contacts are created under their application, then edited and deleted by their own id
// (the same URL design as the API: POST /applications/:id/contacts, PATCH/DELETE /contacts/:id)

export function createContact(applicationId: number, values: ContactChanges): Promise<Contact> {
  return request(`/applications/${applicationId}/contacts`, { method: 'POST', body: values })
}

export function updateContact(id: number, changes: ContactChanges): Promise<Contact> {
  return request(`/contacts/${id}`, { method: 'PATCH', body: changes })
}

export function deleteContact(id: number): Promise<void> {
  return request(`/contacts/${id}`, { method: 'DELETE' })
}

// One place that sends a request, turns the body into JSON, and turns errors into ApiError.
// <T> is a generic, like Java's: each caller says what type the response holds.
async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw await toApiError(response)
  }
  // 204 No Content (e.g. after DELETE) has no body to parse
  return response.status === 204 ? (undefined as T) : response.json()
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    const fieldErrors: Record<string, string> = {}
    for (const detail of body.details ?? []) {
      // A detail with an empty field is about the whole body, not one input
      if (detail.field) fieldErrors[detail.field] = detail.message
    }
    return new ApiError(body.error ?? `HTTP ${response.status}`, fieldErrors)
  } catch {
    return new ApiError(`HTTP ${response.status}`)
  }
}
