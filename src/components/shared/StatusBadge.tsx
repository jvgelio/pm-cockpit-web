import type { InitiativeStatus, InitiativePriority, CycleStatus } from '@/types'
import { getStatusLabel, getPriorityLabel, getCycleStatusLabel } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: InitiativeStatus
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const statusConfig: Record<InitiativeStatus, { badgeClass: string, dot: string }> = {
    draft: {
      badgeClass: 'bg-status-draft/10 text-status-draft border-status-draft/20',
      dot: 'bg-status-draft'
    },
    planned: {
      badgeClass: 'bg-status-planned/10 text-status-planned border-status-planned/20',
      dot: 'bg-status-planned'
    },
    in_progress: {
      badgeClass: 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20',
      dot: 'bg-status-in-progress'
    },
    done: {
      badgeClass: 'bg-status-done/10 text-status-done border-status-done/20',
      dot: 'bg-status-done'
    },
    blocked: {
      badgeClass: 'bg-status-blocked/10 text-status-blocked border-status-blocked/20',
      dot: 'bg-status-blocked'
    },
  }

  const { badgeClass, dot } = statusConfig[status]
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0 h-5 text-[10px]' : 'px-2 py-0.5 h-6 text-xs'

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium gap-1.5",
        badgeClass,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      )}
      {getStatusLabel(status)}
    </Badge>
  )
}

interface PriorityBadgeProps {
  priority: InitiativePriority
  size?: 'sm' | 'md'
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const config: Record<InitiativePriority, { badgeClass: string, icon: string }> = {
    low: {
      badgeClass: 'bg-priority-low/10 text-priority-low border-priority-low/20',
      icon: '↓'
    },
    medium: {
      badgeClass: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
      icon: '→'
    },
    high: {
      badgeClass: 'bg-priority-high/10 text-priority-high border-priority-high/20',
      icon: '↑'
    },
    critical: {
      badgeClass: 'bg-priority-critical/10 text-priority-critical border-priority-critical/20',
      icon: '⚡'
    },
  }

  const { badgeClass, icon } = config[priority]
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0 h-5 text-[10px]' : 'px-2 py-0.5 h-6 text-xs'

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1",
        badgeClass,
        sizeClasses
      )}
    >
      <span className="opacity-70">{icon}</span>
      {getPriorityLabel(priority)}
    </Badge>
  )
}

interface CycleStatusBadgeProps {
  status: CycleStatus
}

export function CycleStatusBadge({ status }: CycleStatusBadgeProps) {
  const colors: Record<CycleStatus, string> = {
    planning: 'bg-status-planned/10 text-status-planned border-status-planned/20',
    active: 'bg-status-done/10 text-status-done border-status-done/20',
    closed: 'bg-muted text-muted-foreground border-border/10',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        colors[status]
      )}
    >
      {getCycleStatusLabel(status)}
    </Badge>
  )
}

interface ProgressBarProps {
  value: number
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        value={clampedValue}
        className={cn(heightClass, "flex-1 shadow-none bg-muted overflow-hidden")}
      />
      {showLabel && (
        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right shrink-0">
          {clampedValue}%
        </span>
      )}
    </div>
  )
}

export default StatusBadge
