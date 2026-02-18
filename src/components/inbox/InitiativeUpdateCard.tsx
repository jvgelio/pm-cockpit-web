import { Target, AlertTriangle } from 'lucide-react'
import { SuggestionCard } from './SuggestionCard'
import { Input } from '@/components/ui/form'
import { Textarea } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import type { StatusUpdateSuggestion, InitiativeStatus } from '@/types'

interface InitiativeUpdateCardProps {
  suggestion: StatusUpdateSuggestion
  onUpdate: (updates: Partial<StatusUpdateSuggestion>) => void
  onToggle: (selected: boolean) => void
}

const statusOptions: { value: InitiativeStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'planned', label: 'Planejado' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'done', label: 'Concluído' },
  { value: 'blocked', label: 'Bloqueado' },
]

export function InitiativeUpdateCard({
  suggestion,
  onUpdate,
  onToggle,
}: InitiativeUpdateCardProps) {
  const { extractedData } = suggestion

  const handleFieldChange = (field: string, value: unknown) => {
    onUpdate({
      ...suggestion,
      extractedData: {
        ...extractedData,
        [field]: value,
      },
    })
  }

  return (
    <SuggestionCard
      type="status_update"
      confidence={suggestion.confidence}
      summary={suggestion.summary}
      selected={suggestion.selected}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Initiative reference */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <Target size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">{extractedData.initiativeTitle}</span>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {extractedData.initiativeId}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Novo Status</label>
            <Select
              value={extractedData.status || 'in_progress'}
              onValueChange={(v) => handleFieldChange('status', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Progresso (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={extractedData.progress ?? ''}
              onChange={(e) => handleFieldChange('progress', parseInt(e.target.value) || 0)}
              placeholder="0-100"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Notas de atualização</label>
          <Textarea
            value={extractedData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Detalhes sobre o progresso..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Risks */}
        {extractedData.risks && extractedData.risks.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-500" />
              Riscos identificados
            </label>
            <div className="flex flex-wrap gap-1">
              {extractedData.risks.map((risk, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {risk}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </SuggestionCard>
  )
}
