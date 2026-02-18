import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: ReactNode
    className?: string
}

/**
 * Consistent Page Header for all views.
 */
export function PageHeader({
    title,
    subtitle,
    actions,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-8", className)}>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                    {actions}
                </div>
            )}
        </div>
    )
}

export default PageHeader
