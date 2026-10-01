import { useDraggable, useDroppable } from '@dnd-kit/core'
import { STATUS_LABELS, type Application, type ApplicationStatus } from '../types'
import { ApplicationCard } from './ApplicationCard'

interface ColumnProps {
  status: ApplicationStatus
  applications: Application[]
  onOpen: (application: Application) => void
}

export function Column({ status, applications, onOpen }: ColumnProps) {
  // Makes this column a drop target. Its id is the status, so the Board knows
  // which status a card was dropped on. isOver is true while a card hovers over it.
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section ref={setNodeRef} className={isOver ? 'column column-over' : 'column'}>
      <h2 className="column-title">
        {STATUS_LABELS[status]}
        <span className="column-count">{applications.length}</span>
      </h2>

      <div className="column-cards">
        {applications.map((application) => (
          <DraggableCard key={application.id} application={application} onOpen={onOpen} />
        ))}
        {applications.length === 0 && <p className="column-empty">Nothing here</p>}
      </div>
    </section>
  )
}

// Wraps a card so it can be picked up. Kept separate from ApplicationCard so the
// same card can also be drawn in the DragOverlay without being draggable itself.
interface DraggableCardProps {
  application: Application
  onOpen: (application: Application) => void
}

function DraggableCard({ application, onOpen }: DraggableCardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: application.id })

  return (
    // listeners: the mouse/touch/keyboard handlers that start a drag
    // attributes: accessibility attributes (role, tabIndex) so keyboard users can drag too
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'draggable dragging' : 'draggable'}
      // A drag only starts after 5px of movement, so a plain click still arrives here
      onClick={() => onOpen(application)}
      // Enter opens the card; every other key goes to dnd-kit (Space picks the card up)
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(application)
        else listeners?.onKeyDown?.(event)
      }}
    >
      <ApplicationCard application={application} />
    </div>
  )
}
