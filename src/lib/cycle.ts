import type { Cycle, CycleStatus } from '@/types'

// ============================================
// Cycle Logic - April/October Semester System
// ============================================

/**
 * Semester definitions
 * H1: April - September
 * H2: October - March
 */

export interface SemesterInfo {
  id: string // e.g., "2026-H1"
  name: string // e.g., "Ciclo Abril 2026"
  start: Date
  end: Date
  year: number
  half: 1 | 2
}

/**
 * Get the current semester based on a date
 */
export function getCurrentSemester(date: Date = new Date()): SemesterInfo {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()

  if (month >= 4 && month <= 9) {
    // H1: April - September
    return {
      id: `${year}-H1`,
      name: `Ciclo Abril ${year}`,
      start: new Date(year, 3, 1), // April 1
      end: new Date(year, 8, 30), // September 30
      year,
      half: 1,
    }
  } else {
    // H2: October - March
    // If we're in Oct-Dec, the cycle ends next year
    // If we're in Jan-Mar, the cycle started last year
    const startYear = month >= 10 ? year : year - 1
    const endYear = month >= 10 ? year + 1 : year

    return {
      id: `${startYear}-H2`,
      name: `Ciclo Outubro ${startYear}`,
      start: new Date(startYear, 9, 1), // October 1
      end: new Date(endYear, 2, 31), // March 31
      year: startYear,
      half: 2,
    }
  }
}

/**
 * Get semester info for a specific cycle ID
 */
export function getSemesterById(cycleId: string): SemesterInfo | null {
  const match = cycleId.match(/^(\d{4})-H([12])$/)
  if (!match) return null

  const year = parseInt(match[1], 10)
  const half = parseInt(match[2], 10) as 1 | 2

  if (half === 1) {
    return {
      id: cycleId,
      name: `Ciclo Abril ${year}`,
      start: new Date(year, 3, 1),
      end: new Date(year, 8, 30),
      year,
      half,
    }
  } else {
    return {
      id: cycleId,
      name: `Ciclo Outubro ${year}`,
      start: new Date(year, 9, 1),
      end: new Date(year + 1, 2, 31),
      year,
      half,
    }
  }
}

/**
 * Get the next semester
 */
export function getNextSemester(current: SemesterInfo): SemesterInfo {
  if (current.half === 1) {
    return {
      id: `${current.year}-H2`,
      name: `Ciclo Outubro ${current.year}`,
      start: new Date(current.year, 9, 1),
      end: new Date(current.year + 1, 2, 31),
      year: current.year,
      half: 2,
    }
  } else {
    const nextYear = current.year + 1
    return {
      id: `${nextYear}-H1`,
      name: `Ciclo Abril ${nextYear}`,
      start: new Date(nextYear, 3, 1),
      end: new Date(nextYear, 8, 30),
      year: nextYear,
      half: 1,
    }
  }
}

/**
 * Get the previous semester
 */
export function getPreviousSemester(current: SemesterInfo): SemesterInfo {
  if (current.half === 2) {
    return {
      id: `${current.year}-H1`,
      name: `Ciclo Abril ${current.year}`,
      start: new Date(current.year, 3, 1),
      end: new Date(current.year, 8, 30),
      year: current.year,
      half: 1,
    }
  } else {
    const prevYear = current.year - 1
    return {
      id: `${prevYear}-H2`,
      name: `Ciclo Outubro ${prevYear}`,
      start: new Date(prevYear, 9, 1),
      end: new Date(current.year, 2, 31),
      year: prevYear,
      half: 2,
    }
  }
}

/**
 * Calculate cycle progress percentage based on dates
 */
export function getCycleProgress(cycle: Cycle | SemesterInfo): number {
  const now = new Date()
  const start = cycle.start
  const end = cycle.end

  if (now < start) return 0
  if (now > end) return 100

  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()

  return Math.round((elapsed / total) * 100)
}

/**
 * Get days remaining in cycle
 */
export function getDaysRemaining(cycle: Cycle | SemesterInfo): number {
  const now = new Date()
  const end = cycle.end

  if (now > end) return 0

  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Determine the appropriate status for a cycle based on dates
 */
export function inferCycleStatus(cycle: Cycle | SemesterInfo): CycleStatus {
  const now = new Date()

  if (now < cycle.start) return 'planning'
  if (now > cycle.end) return 'closed'
  return 'active'
}

/**
 * Format a date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

/**
 * Format relative time (e.g., "em 15 dias", "há 3 dias")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  if (days > 0) return `em ${days} dias`
  return `há ${Math.abs(days)} dias`
}

/**
 * Check if a date is within the current week
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return date >= startOfWeek && date < endOfWeek
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return date < now
}

/**
 * Generate folder name for a cycle
 */
export function getCycleFolderName(cycleId: string): string {
  return cycleId // e.g., "2026-H1"
}

/**
 * Sort cycles by date (most recent first)
 */
export function sortCyclesByDate(cycles: Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => b.start.getTime() - a.start.getTime())
}

/**
 * Get all semesters between two dates
 */
export function getSemestersBetween(
  startDate: Date,
  endDate: Date
): SemesterInfo[] {
  const semesters: SemesterInfo[] = []
  let current = getCurrentSemester(startDate)

  while (current.start <= endDate) {
    semesters.push(current)
    current = getNextSemester(current)
  }

  return semesters
}
