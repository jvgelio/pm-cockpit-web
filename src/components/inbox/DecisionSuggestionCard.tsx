import { ArrowRight } from 'lucide-react'
import { SuggestionCard } from './SuggestionCard'
import { Input } from '@/components/ui/form'
import { Textarea } from '@/components/ui/form'
import type { DecisionSuggestion } from '@/types'

interface DecisionSuggestionCardProps {
  suggestion: DecisionSuggestion
  onUpdate: (updates: Partial<DecisionSuggestion>) => void
  onToggle: (selected: boolean) => void
}

export function DecisionSuggestionCard({
  suggestion,
  onUpdate,
  onToggle,
}: DecisionSuggestionCardProps) {
  const { extractedData } = suggestion

  const handleFieldChange = (field: keyof typeof extractedData, value: string) => {
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
      type="decision"
      confidence={suggestion.confidence}
      summary={suggestion.summary}
      selected={suggestion.selected}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Título da decisão</label>
          <Input
            value={extractedData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Título da decisão"
            className="h-8 text-sm"
          />
        </div>

        {/* From -> To */}
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground font-medium">De (antes)</label>
            <Input
              value={extractedData.from}
              onChange={(e) => handleFieldChange('from', e.target.value)}
              placeholder="O que era antes"
              className="h-8 text-sm"
            />
          </div>
          <ArrowRight size={16} className="text-muted-foreground mt-6" />
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Para (decidido)</label>
            <Input
              value={extractedData.to}
              onChange={(e) => handleFieldChange('to', e.target.value)}
              placeholder="O que foi decidido"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Rationale */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Motivo</label>
          <Textarea
            value={extractedData.rationale}
            onChange={(e) => handleFieldChange('rationale', e.target.value)}
            placeholder="Por que essa decisão foi tomada?"
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      </div>
    </SuggestionCard>
  )
}
