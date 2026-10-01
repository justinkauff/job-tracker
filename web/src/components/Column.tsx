import { STATUS_LABELS, type Application, type ApplicationStatus } from '../types'
import { ApplicationCard } from './ApplicationCard'

interface ColumnProps {
  status: ApplicationStatus
  applications: Application[]
}

export function Column({ status, applications }: ColumnProps) {
  return (
    <section className="column">
      <h2 className="column-title">
        {STATUS_LABELS[status]}
        <span className="column-count">{applications.length}</span>
      </h2>

      <div className="column-cards">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
        {applications.length === 0 && <p className="column-empty">Nothing here</p>}
      </div>
    </section>
  )
}
