import { ReactNode } from 'react'
import { CheckSquare, Scale, TrendingUp, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import type { SuggestionType } from '@/types'

interface SuggestionCardProps {
  type: SuggestionType
  confidence: number
  summary: string
  selected: boolean
  onToggle: (selected: boolean) => void
  children?: ReactNode
  className?: string
}

const typeConfig: Record<
  SuggestionType,
  {
    icon: typeof CheckSquare
    label: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  task: {
    icon: CheckSquare,
    label: 'Tarefa',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  decision: {
    icon: Scale,
    label: 'Decisão',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  status_update: {
    icon: TrendingUp,
    label: 'Atualização',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  new_initiative: {
    icon: Lightbulb,
    label: 'Nova Iniciativa',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
}

function getConfidenceLabel(confidence: number): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (confidence >= 0.8) {
    return { label: 'Alta confiança', variant: 'default' }
  }
  if (confidence >= 0.5) {
    return { label: 'Média confiança', variant: 'secondary' }
  }
  return { label: 'Baixa confiança', variant: 'outline' }
}

export function SuggestionCard({
  type,
  confidence,
  summary,
  selected,
  onToggle,
  children,
  className,
}: SuggestionCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  const confidenceInfo = getConfidenceLabel(confidence)

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        config.borderColor,
        selected ? config.bgColor : 'bg-background',
        selected ? 'ring-2 ring-primary/20' : '',
        'hover:shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Type badge and confidence */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('flex items-center gap-1.5 text-xs font-medium', config.color)}>
              <Icon size={14} />
              <span>{config.label}</span>
            </div>
            <Badge variant={confidenceInfo.variant} className="text-[10px] px-1.5 py-0">
              {Math.round(confidence * 100)}%
            </Badge>
          </div>

          {/* Summary */}
          <p className="text-sm text-foreground leading-relaxed">
            {summary}
          </p>

          {/* Additional details (children) */}
          {children && (
            <div className="mt-3 pt-3 border-t border-border/50">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
