import type { Initiative } from '@/types'
import {
    Calendar,
    Circle,
    CheckCircle2,
    Clock,
    AlertCircle,
    PlayCircle,
    MoreHorizontal
} from 'lucide-react'
import { PriorityBadge, ProgressBar } from '@/components/shared/StatusBadge'
import { formatRelativeTime } from '@/lib/cycle'
import { cn } from '@/lib/utils'

const statusIcons: Record<string, any> = {
    draft: Circle,
    planned: Clock,
    in_progress: PlayCircle,
    done: CheckCircle2,
    blocked: AlertCircle,
}

const statusColors: Record<string, string> = {
    draft: 'text-status-draft',
    planned: 'text-status-planned',
    in_progress: 'text-status-in-progress',
    done: 'text-status-done',
    blocked: 'text-status-blocked',
}

interface InitiativeRowProps {
    initiative: Initiative
    onClick: () => void
}

/**
 * Premium InitiativeRow component aligned with Design System.
 * Uses shadcn-ready shared components and clean icons.
 */
export function InitiativeRow({ initiative, onClick }: InitiativeRowProps) {
    const StatusIcon = statusIcons[initiative.status] || Circle

    return (
        <div
            onClick={onClick}
            className="group flex cursor-pointer items-center gap-4 border-b border-border/8 px-4 py-3 hover:bg-muted/30 transition-all duration-150"
        >
            {/* Status Icon Indicator */}
            <div className={cn("flex shrink-0 items-center justify-center w-6", statusColors[initiative.status])}>
                <StatusIcon size={18} strokeWidth={2.5} />
            </div>

            {/* ID & Title */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
                <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                    {initiative.id}
                </span>
                <h3 className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {initiative.title}
                </h3>
            </div>

            {/* Meta Information (Team, Date) */}
            <div className="hidden md:flex items-center gap-4 shrink-0 px-2">
                {initiative.team && (
                    <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/8">
                        {initiative.team}
                    </span>
                )}

                {initiative.dueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[100px]">
                        <Calendar size={13} className="opacity-50" />
                        <span>{formatRelativeTime(initiative.dueDate)}</span>
                    </div>
                )}
            </div>

            {/* Priority Indicator */}
            <div className="w-24 shrink-0 flex justify-center">
                <PriorityBadge priority={initiative.priority} size="sm" />
            </div>

            {/* Progress Section */}
            <div className="w-32 shrink-0">
                <ProgressBar value={initiative.progress} size="sm" showLabel />
            </div>

            {/* Action Indicator (Menu placeholder) */}
            <div className="flex items-center justify-center w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 hover:bg-muted rounded-md text-muted-foreground">
                    <MoreHorizontal size={14} />
                </button>
            </div>
        </div>
    )
}

export default InitiativeRow
