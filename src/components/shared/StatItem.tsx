import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatItemProps {
    label: ReactNode
    value: string | number
    subValue?: string | number
    className?: string
    trend?: 'up' | 'down' | 'neutral'
}

/**
 * StatItem for small data visualizations like status breakdowns or sidebars.
 */
export function StatItem({
    label,
    value,
    subValue,
    className,
    trend: _trend
}: StatItemProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border/60 hover:bg-muted/50 transition-all",
            className
        )}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground">
                {value}
            </div>
            {subValue && (
                <div className="text-[11px] font-medium text-muted-foreground/80">
                    {subValue}
                </div>
            )}
        </div>
    )
}

export default StatItem
