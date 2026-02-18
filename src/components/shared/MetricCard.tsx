import { LucideIcon } from 'lucide-react'
import { Card, CardBody } from '@/components/shared/Card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    color?: 'blue' | 'amber' | 'red' | 'green' | 'purple' | 'gray'
    alert?: boolean
    description?: string
    className?: string
}

const colorVariants = {
    blue: 'bg-status-planned/10 text-status-planned',
    amber: 'bg-status-in-progress/10 text-status-in-progress',
    red: 'bg-status-blocked/10 text-status-blocked',
    green: 'bg-status-done/10 text-status-done',
    purple: 'bg-primary/10 text-primary',
    gray: 'bg-muted text-muted-foreground',
}

/**
 * MetricCard component for displaying key performance indicators.
 * Built with shadcn/ui Card.
 */
export function MetricCard({
    title,
    value,
    icon: Icon,
    color = 'blue',
    alert = false,
    description,
    className
}: MetricCardProps) {
    return (
        <Card
            className={cn(
                "transition-all duration-200",
                alert && "border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
                className
            )}
        >
            <CardBody className="flex items-center gap-4">
                <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    colorVariants[color]
                )}>
                    <Icon size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                            {value}
                        </h3>
                        {description && (
                            <span className="text-xs text-muted-foreground truncate italic">
                                {description}
                            </span>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default MetricCard
