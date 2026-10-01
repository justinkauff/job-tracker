import { formatDate } from '../format'
import type { Application } from '../types'

// Props: the inputs a parent passes in, like constructor arguments.
// A component never changes its props; it only displays them.
interface ApplicationCardProps {
  application: Application
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const { company, role, location, date_applied, url } = application

  return (
    <article className="card">
      <div className="card-company">{company}</div>
      {role && <div className="card-role">{role}</div>}

      <div className="card-meta">
        {date_applied && <span>Applied {formatDate(date_applied)}</span>}
        {location && <span>{location}</span>}
        {url && (
          // rel="noreferrer" stops the opened page from seeing or controlling this tab
          // stopPropagation: following the link shouldn't also open the edit dialog
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            Posting ↗
          </a>
        )}
      </div>
    </article>
  )
}
