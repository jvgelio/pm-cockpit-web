
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Initiative } from '@/types'
import { ChevronRight } from 'lucide-react'

// Constants for layout
const ROW_HEIGHT = 44
const SIDEBAR_WIDTH = 300

type ViewMode = 'week' | 'month' | 'quarter'

const ZOOM_LEVELS: Record<ViewMode, number> = {
  week: 60,   // Wide days
  month: 20,  // Narrow days
  quarter: 6, // Very narrow (overview)
}

// Helper to manipulate dates
const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const getDaysDiff = (start: Date, end: Date) => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

const formatDate = (date: Date, mode: ViewMode) => {
  if (mode === 'quarter') return date.toLocaleDateString('pt-BR', { month: 'short' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ... imports ...

// ... imports ...

interface TimelineProps {
  minimalLayout?: boolean
  initiatives: Initiative[]
}

function Timeline({ minimalLayout = false, initiatives }: TimelineProps) {
  const navigate = useNavigate()
  const {
    currentCycle,
    selectInitiative,
    updateInitiative
  } = useAppStore()

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const pixelsPerDay = ZOOM_LEVELS[viewMode]
  // ... rest of state ...

  // Refs for scroll syncing
  const sidebarRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const [hoveredInitiativeId, setHoveredInitiativeId] = useState<string | null>(null)

  // Drag state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-start' | 'resize-end'
    initiativeId: string
    initialStartX: number
    initialStartDate: Date
    initialDueDate: Date
    currentX: number
  } | null>(null)

  // Timeline boundaries
  const { startDate, visibleDays } = useMemo(() => {
    let start = new Date()
    let end = new Date()

    if (initiatives.length > 0) {
      // Find min start and max end from initiatives
      const startDates = initiatives.map(i => i.startDate).filter((d): d is Date => !!d)
      const endDates = initiatives.map(i => i.dueDate).filter((d): d is Date => !!d)

      if (startDates.length > 0) {
        start = new Date(Math.min(...startDates.map(d => d.getTime())))
      }
      if (endDates.length > 0) {
        end = new Date(Math.max(...endDates.map(d => d.getTime())))
      }

      // Default duration if single point or invalid
      if (start.getTime() >= end.getTime()) {
        end = new Date(start)
        end.setDate(end.getDate() + 30) // default 30 days
      }
    } else if (currentCycle) {
      start = new Date(currentCycle.start)
      end = new Date(currentCycle.end)
    } else {
      start.setDate(start.getDate() - 15)
      end.setDate(end.getDate() + 45)
    }

    // Adjust buffer based on view mode for better context
    const buffer = viewMode === 'quarter' ? 30 : viewMode === 'month' ? 14 : 7

    start.setDate(start.getDate() - buffer)
    end.setDate(end.getDate() + buffer)

    const days = getDaysDiff(start, end)

    const daysArray = []
    for (let i = 0; i <= days; i++) {
      daysArray.push(addDays(start, i))
    }

    return { startDate: start, visibleDays: daysArray }
  }, [currentCycle, viewMode, initiatives])

  // Sort and filter initiatives (Prevent duplicates)
  const sortedInitiatives = useMemo(() => {
    const uniqueMap = new Map<string, Initiative>()

    // Deduplicate by ID
    initiatives.forEach(init => {
      uniqueMap.set(init.id, init)
    })

    return Array.from(uniqueMap.values()).sort((a, b) => {
      // Sort logic
      const aStart = a.startDate?.getTime() || 0
      const bStart = b.startDate?.getTime() || 0
      if (aStart !== bStart) return aStart - bStart
      return 0
    })
  }, [initiatives])

  // Scroll Sync Handler
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = e.currentTarget.scrollTop
    }
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Drag handlers
  const handleDragStart = (
    e: React.MouseEvent,
    type: 'move' | 'resize-start' | 'resize-end',
    initiative: Initiative
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (!initiative.startDate || !initiative.dueDate) return

    setDragState({
      type,
      initiativeId: initiative.id,
      initialStartX: e.clientX,
      initialStartDate: new Date(initiative.startDate),
      initialDueDate: new Date(initiative.dueDate),
      currentX: e.clientX
    })
  }

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return
    setDragState(prev => prev ? { ...prev, currentX: e.clientX } : null)
  }, [dragState])

  const handleGlobalMouseUp = useCallback(async (e: MouseEvent) => {
    if (!dragState) return

    const {
      type,
      initialStartX,
      initialStartDate,
      initialDueDate,
      initiativeId
    } = dragState

    const currentX = e.clientX
    const deltaDays = Math.round((currentX - initialStartX) / pixelsPerDay)

    // Only update if changed
    if (deltaDays !== 0) {
      let newStart = new Date(initialStartDate)
      let newDue = new Date(initialDueDate)

      if (type === 'move') {
        newStart = addDays(initialStartDate, deltaDays)
        newDue = addDays(initialDueDate, deltaDays)
      } else if (type === 'resize-start') {
        newStart = addDays(initialStartDate, deltaDays)
        if (newStart > newDue) newStart = newDue
      } else if (type === 'resize-end') {
        newDue = addDays(initialDueDate, deltaDays)
        if (newDue < newStart) newDue = newStart
      }

      await updateInitiative(initiativeId, {
        startDate: newStart,
        dueDate: newDue
      })
    }

    setDragState(null)
  }, [dragState, updateInitiative, pixelsPerDay])

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragState, handleGlobalMouseMove, handleGlobalMouseUp])


  // Render Helpers
  const getInitiativeStyle = (initiative: Initiative) => {
    let start = initiative.startDate || startDate
    let end = initiative.dueDate || startDate

    // Apply temporary drag values
    if (dragState && dragState.initiativeId === initiative.id) {
      const deltaDays = Math.round((dragState.currentX - dragState.initialStartX) / pixelsPerDay)

      if (dragState.type === 'move') {
        start = addDays(dragState.initialStartDate, deltaDays)
        end = addDays(dragState.initialDueDate, deltaDays)
      } else if (dragState.type === 'resize-start') {
        start = addDays(dragState.initialStartDate, deltaDays)
        if (start > end) start = end
      } else if (dragState.type === 'resize-end') {
        end = addDays(dragState.initialDueDate, deltaDays)
        if (end < start) end = start
      }
    }

    const startOffset = Math.max(0, getDaysDiff(startDate, start))
    const duration = Math.max(1, getDaysDiff(start, end)) + 1

    const left = startOffset * pixelsPerDay
    const width = duration * pixelsPerDay

    const isDone = initiative.status === 'done'
    const colorClasses = isDone
      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100 ring-emerald-500/50'
      : initiative.status === 'in_progress'
        ? 'bg-amber-500/20 border-amber-500/30 text-amber-100 ring-amber-500/50'
        : initiative.status === 'blocked'
          ? 'bg-rose-500/20 border-rose-500/30 text-rose-100 ring-rose-500/50'
          : 'bg-blue-500/20 border-blue-500/30 text-blue-100 ring-blue-500/50'

    return {
      style: { left: `${left}px`, width: `${width}px` },
      className: `absolute top-1 bottom-1 rounded-md border text-xs font-medium
        flex items-center px-2 cursor-grab active:cursor-grabbing select-none
        transition-colors duration-150 group/bar ${colorClasses}
        hover:bg-opacity-40 hover:border-opacity-60
        ${dragState?.initiativeId === initiative.id ? 'z-20 ring-2' : 'z-10'}
      `,
      dates: { start, end }
    }
  }

  // Header Ticks Generation
  const getHeaderTicks = () => {
    const ticks: { label: string; left: number; type: 'month' | 'week' }[] = []
    let currentKey = ''

    visibleDays.forEach((date, i) => {
      // Determine when to place a label based on view mode
      let shouldLabel = false
      let label = ''
      let key = ''

      if (viewMode === 'quarter') {
        // Label months in quarter view
        key = `${date.getFullYear()}-${date.getMonth()}`
        if (key !== currentKey) {
          shouldLabel = true
          label = date.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' })
        }
      } else if (viewMode === 'month') {
        // Label months
        key = `${date.getFullYear()}-${date.getMonth()}`
        if (key !== currentKey) {
          shouldLabel = true
          label = date.toLocaleDateString('pt-BR', { month: 'long' })
        }
      } else {
        // Label months in week view too (or weeks?)
        // Let's stick to months for major headers in all views for consistency
        key = `${date.getFullYear()}-${date.getMonth()}`
        if (key !== currentKey) {
          shouldLabel = true
          label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        }
      }

      if (shouldLabel) {
        currentKey = key
        ticks.push({
          type: 'month',
          label,
          left: i * pixelsPerDay
        })
      }
    })
    return ticks
  }

  if (initiatives.length === 0 && !currentCycle) return null

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header Area */}
      <div className="flex-none border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          {!minimalLayout ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timeline</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentCycle?.name || "Todas as Iniciativas"}
              </p>
            </div>
          ) : (
            <div /> // Spacer if needed or just empty
          )}
          <div className="flex items-center gap-4">
            {/* View Mode Switcher */}
            <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {(['week', 'month', 'quarter'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                      px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all
                      ${viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                    `}
                >
                  {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Trimestre'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Planejado</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Em Andamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Split View */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div
          className="flex flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50 z-20 shadow-xl"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="h-[60px] border-b border-gray-200 dark:border-gray-800 flex items-end pb-2 px-4 bg-gray-50/50 dark:bg-gray-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Iniciativa</span>
          </div>

          <div
            ref={sidebarRef}
            className="flex-1 overflow-hidden"
          >
            {sortedInitiatives.map((initiative) => (
              <div
                key={initiative.id}
                className="flex items-center border-b border-gray-100 px-4 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-white/5 transition-colors group"
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredInitiativeId(initiative.id)}
                onMouseLeave={() => setHoveredInitiativeId(null)}
                onClick={() => {
                  selectInitiative(initiative.id)
                  navigate(`/initiative/${initiative.id}`)
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden w-full cursor-pointer">
                  <StatusBadge status={initiative.status} size="sm" showDot={false} />
                  <span className={`truncate text-sm font-medium ${hoveredInitiativeId === initiative.id ? 'text-primary-500' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    {initiative.title}
                  </span>
                  {hoveredInitiativeId === initiative.id && (
                    <ChevronRight size={14} className="ml-auto text-primary-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="relative flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">

          {/* Header */}
          <div
            ref={headerRef}
            className="flex-none overflow-hidden border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
            style={{ height: 60 }}
          >
            <div style={{ width: `${visibleDays.length * pixelsPerDay} px`, height: '100%', position: 'relative' }}>
              {/* Major Ticks (Months) */}
              {getHeaderTicks().map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-2 text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap px-2"
                  style={{ left: tick.left }}
                >
                  {tick.label}
                </div>
              ))}

              {/* Minor Ticks Grid (Days/Weeks) */}
              <div className="absolute bottom-0 w-full flex items-end h-8">
                {visibleDays.map((date, i) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isWeekStart = date.getDay() === 1

                  // In Quarter view, only show week starts or month starts
                  if (viewMode === 'quarter' && date.getDate() !== 1 && !isWeekStart) return null

                  return (
                    <div
                      key={i}
                      className={`absolute bottom - 0 border - l border - gray - 100 dark: border - gray - 800 flex flex - col justify - end items - center
                           ${isToday ? 'bg-primary-500/10' : ''}
`}
                      style={{
                        left: i * pixelsPerDay,
                        width: viewMode === 'quarter' ? pixelsPerDay * 7 : pixelsPerDay, // approximate visual width
                        height: '50%'
                      }}
                    >
                      {viewMode === 'week' && (
                        <span className={`text - [10px] mb - 1 ${isToday ? 'text-primary-600 font-bold' : 'text-gray-400'} `}>
                          {date.getDate()}
                        </span>
                      )}
                      {viewMode === 'month' && isWeekStart && (
                        <span className="text-[9px] mb-1 text-gray-300 dark:text-gray-600">
                          {date.getDate()}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Body */}
          <div
            ref={timelineRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-auto custom-scrollbar"
          >
            <div style={{ width: `${visibleDays.length * pixelsPerDay} px`, minHeight: '100%' }}>
              <div className="relative">

                {/* Background Grid */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  {visibleDays.map((date, i) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    const isToday = date.toDateString() === new Date().toDateString()

                    // Optimization: Don't render every single day line in quarter view
                    if (viewMode === 'quarter' && date.getDay() !== 1) return null

                    return (
                      <div
                        key={i}
                        className={`
                          absolute top - 0 bottom - 0 border - l
                          ${isToday ? 'bg-primary-500/5 border-primary-500/30' : 'border-gray-100 dark:border-gray-800/40'}
                          ${isWeekend && viewMode !== 'quarter' ? 'bg-gray-50/50 dark:bg-white/[0.02]' : ''}
`}
                        style={{
                          left: i * pixelsPerDay,
                          width: pixelsPerDay
                        }}
                      />
                    )
                  })}
                </div>

                {/* Today Line */}
                {(() => {
                  const todayIndex = visibleDays.findIndex(d => d.toDateString() === new Date().toDateString())
                  if (todayIndex >= 0) {
                    return (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-primary-500 z-10 pointer-events-none"
                        style={{ left: todayIndex * pixelsPerDay }}
                      />
                    )
                  }
                  return null
                })()}

                {/* Bars */}
                <div className="relative z-10 pt-0">
                  {sortedInitiatives.map((initiative) => {
                    const { style, className, dates } = getInitiativeStyle(initiative)
                    const widthVal = parseInt(style.width.replace('px', ''))

                    return (
                      <div
                        key={initiative.id}
                        className="relative border-b border-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={() => setHoveredInitiativeId(initiative.id)}
                        onMouseLeave={() => setHoveredInitiativeId(null)}
                      >
                        <div
                          className={className}
                          style={style}
                          onMouseDown={(e) => handleDragStart(e, 'move', initiative)}
                        >
                          {/* Handles */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 group-hover/bar:opacity-100 hover:bg-white/30 rounded-l-md transition-all"
                            onMouseDown={(e) => handleDragStart(e, 'resize-start', initiative)}
                          />

                          <div className="flex-1 overflow-hidden whitespace-nowrap px-1 flex items-center">
                            {/* Only show title if width is sufficient */}
                            {widthVal > 30 && (
                              <span className="truncate">{initiative.title}</span>
                            )}
                            {/* Only show dates if width is generous */}
                            {widthVal > 150 && (
                              <span className="text-[10px] opacity-70 ml-2 font-normal ml-auto">
                                {formatDate(dates.start, viewMode)} - {formatDate(dates.end, viewMode)}
                              </span>
                            )}
                          </div>

                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 group-hover/bar:opacity-100 hover:bg-white/30 rounded-r-md transition-all"
                            onMouseDown={(e) => handleDragStart(e, 'resize-end', initiative)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline
