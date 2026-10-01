import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../types'
import { ApplicationCard } from './ApplicationCard'
import { Column } from './Column'

interface BoardProps {
  applications: Application[]
  // The Board doesn't save anything itself; it tells its parent what the user did
  onStatusChange: (id: number, status: ApplicationStatus) => void
  onOpen: (application: Application) => void
}

export function Board({ applications, onStatusChange, onOpen }: BoardProps) {
  // Which card is being dragged right now (null when nothing is)
  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(
    // A drag only starts after the pointer moves 5px, so a plain click
    // (like on the "Posting" link) still works as a click
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Tab to a card, Space to pick it up, arrow keys to move, Space to drop.
    // Enter is left out (dnd-kit uses it by default) because Enter opens the card.
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  // Derived data: the columns are computed from the one applications list on every render,
  // not stored in separate state. One source of truth means they can never disagree.
  const columns = APPLICATION_STATUSES.map((status) => ({
    status,
    applications: applications.filter((a) => a.status === status).sort(byMostRecentlyApplied),
  }))
  const activeApplication = applications.find((a) => a.id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return // dropped outside any column

    // Cards use the application id as their drag id; columns use their status
    const id = Number(active.id)
    const newStatus = over.id as ApplicationStatus
    const application = applications.find((a) => a.id === id)
    if (application && application.status !== newStatus) {
      onStatusChange(id, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="board">
        {columns.map((column) => (
          <Column
            key={column.status}
            status={column.status}
            applications={column.applications}
            onOpen={onOpen}
          />
        ))}
      </div>

      {/* The copy of the card that follows the pointer. It's drawn above the whole page,
          so it isn't cut off by the board's sideways scrolling. */}
      <DragOverlay>
        {activeApplication && <ApplicationCard application={activeApplication} />}
      </DragOverlay>
    </DndContext>
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
