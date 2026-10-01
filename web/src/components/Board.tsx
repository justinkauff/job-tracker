import { APPLICATION_STATUSES, type Application } from '../types'
import { Column } from './Column'

interface BoardProps {
  applications: Application[]
}

export function Board({ applications }: BoardProps) {
  // Derived data: the columns are computed from the one applications list on every render,
  // not stored in separate state. One source of truth means they can never disagree.
  const columns = APPLICATION_STATUSES.map((status) => ({
    status,
    applications: applications.filter((a) => a.status === status).sort(byMostRecentlyApplied),
  }))

  return (
    <div className="board">
      {columns.map((column) => (
        <Column key={column.status} status={column.status} applications={column.applications} />
      ))}
    </div>
  )
}

// Newest date_applied first; applications without a date go last.
// ISO dates sort correctly as plain strings, which is one reason we store them that way.
function byMostRecentlyApplied(a: Application, b: Application): number {
  if (a.date_applied === b.date_applied) return 0
  if (a.date_applied === null) return 1
  if (b.date_applied === null) return -1
  return b.date_applied.localeCompare(a.date_applied)
}
