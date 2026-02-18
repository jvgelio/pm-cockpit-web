import { useMemo } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { useNavigate } from 'react-router-dom'
import { Calendar, User } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { PriorityBadge, ProgressBar } from '@/components/shared/StatusBadge'
import { formatRelativeTime } from '@/lib/cycle'
import { type Initiative, type InitiativeStatus } from '@/types'

const COLUMNS: { id: InitiativeStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Rascunho', color: 'border-t-status-draft' },
  { id: 'planned', label: 'Planejado', color: 'border-t-status-planned' },
  { id: 'in_progress', label: 'Em Progresso', color: 'border-t-status-in-progress' },
  { id: 'done', label: 'Concluído', color: 'border-t-status-done' },
  { id: 'blocked', label: 'Bloqueado', color: 'border-t-status-blocked' },
]

// ... imports ...

interface KanbanBoardProps {
  minimalLayout?: boolean
  initiatives: Initiative[]
}

function KanbanBoard({ minimalLayout = false, initiatives }: KanbanBoardProps) {
  const { updateInitiative, selectInitiative } =
    useAppStore()
  const navigate = useNavigate()

  // Group initiatives by status
  const columns = useMemo(() => {
    const grouped: Record<InitiativeStatus, Initiative[]> = {
      draft: [],
      planned: [],
      in_progress: [],
      done: [],
      blocked: [],
    }

    for (const initiative of initiatives) {
      grouped[initiative.status].push(initiative)
    }

    return grouped
  }, [initiatives])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside a column
    if (!destination) return

    // No change
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStatus = destination.droppableId as InitiativeStatus

    // Update initiative status
    await updateInitiative(draggableId, { status: newStatus })
  }

  const handleCardClick = (initiative: Initiative) => {
    selectInitiative(initiative.id)
    navigate(`/initiative/${initiative.id}`)
  }

  return (
    <div className="h-full">
      {/* Page header */}
      {!minimalLayout && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kanban
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Arraste os cards para alterar o status
          </p>
        </div>
      )}

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <div
              key={column.id}
              className="flex w-72 flex-shrink-0 flex-col"
            >
              {/* Column header */}
              <div
                className={`
                  mb-3 rounded-lg border-t-4 bg-white p-3 dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  ${column.color}
                `}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {column.label}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {columns[column.id].length}
                  </span>
                </div>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      flex-1 space-y-3 rounded-lg p-2 min-h-[200px]
                      ${snapshot.isDraggingOver
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'bg-gray-50 dark:bg-gray-900/50'
                      }
                    `}
                  >
                    {columns[column.id].map((initiative, index) => (
                      <Draggable
                        key={initiative.id}
                        draggableId={initiative.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleCardClick(initiative)}
                            className={`
                              rounded-lg border bg-white p-3 dark:bg-gray-800
                              border-gray-200 dark:border-gray-700
                              cursor-pointer
                              ${snapshot.isDragging
                                ? 'shadow-lg ring-2 ring-primary-500'
                                : 'hover:shadow-md'
                              }
                            `}
                          >
                            <KanbanCard initiative={initiative} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}

interface KanbanCardProps {
  initiative: Initiative
}

function KanbanCard({ initiative }: KanbanCardProps) {
  return (
    <div className="space-y-2">
      {/* ID and priority */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {initiative.id}
        </span>
        <PriorityBadge priority={initiative.priority} size="sm" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2">
        {initiative.title}
      </h4>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {initiative.owner && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {initiative.owner}
          </span>
        )}
        {initiative.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatRelativeTime(initiative.dueDate)}
          </span>
        )}
      </div>

      {/* Progress */}
      <ProgressBar value={initiative.progress} size="sm" showLabel />

      {/* Tags */}
      {initiative.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {initiative.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {initiative.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{initiative.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default KanbanBoard
