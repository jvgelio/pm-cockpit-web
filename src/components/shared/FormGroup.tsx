import { ReactNode } from 'react'
import { Label } from '@/components/ui/form'
import { cn } from '@/lib/utils'

interface FormGroupProps {
    label: string
    children: ReactNode
    description?: string
    error?: string
    className?: string
    inline?: boolean
}

/**
 * Shared FormGroup to wrap inputs with labels and hints.
 */
export function FormGroup({
    label,
    children,
    description,
    error,
    className,
    inline = false
}: FormGroupProps) {
    return (
        <div className={cn(
            "flex flex-col gap-2",
            inline && "sm:flex-row sm:items-center sm:gap-4",
            className
        )}>
            <div className={cn("flex flex-col", inline && "sm:min-w-[120px]")}>
                <Label className="text-sm font-medium tracking-tight text-foreground/80">
                    {label}
                </Label>
                {description && (
                    <p className="text-[11px] text-muted-foreground font-medium">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex-1">
                {children}
                {error && (
                    <p className="text-xs text-destructive mt-1 font-medium">{error}</p>
                )}
            </div>
        </div>
    )
}

export default FormGroup
