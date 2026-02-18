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
import type { NewInitiativeSuggestion, InitiativeType, InitiativePriority } from '@/types'

interface NewInitiativeCardProps {
  suggestion: NewInitiativeSuggestion
  onUpdate: (updates: Partial<NewInitiativeSuggestion>) => void
  onToggle: (selected: boolean) => void
}

const typeOptions: { value: InitiativeType; label: string }[] = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'product', label: 'Produto' },
]

const priorityOptions: { value: InitiativePriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
]

export function NewInitiativeCard({
  suggestion,
  onUpdate,
  onToggle,
}: NewInitiativeCardProps) {
  const { extractedData } = suggestion

  const handleFieldChange = (field: keyof typeof extractedData, value: any) => {
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
      type="new_initiative"
      confidence={suggestion.confidence}
      summary={suggestion.summary}
      selected={suggestion.selected}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Nome da iniciativa</label>
          <Input
            value={extractedData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Nome da nova iniciativa"
            className="h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Type */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tipo</label>
            <Select
              value={extractedData.type || 'product'}
              onValueChange={(v) => handleFieldChange('type', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Prioridade</label>
            <Select
              value={extractedData.priority || 'medium'}
              onValueChange={(v) => handleFieldChange('priority', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Problem */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Problema</label>
          <Textarea
            value={extractedData.problem || ''}
            onChange={(e) => handleFieldChange('problem', e.target.value)}
            placeholder="Qual o problema a ser resolvido?"
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Solution */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Solução Proposta</label>
          <Textarea
            value={extractedData.solution || ''}
            onChange={(e) => handleFieldChange('solution', e.target.value)}
            placeholder="Como vamos resolver?"
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Success Criteria */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Critérios de Sucesso</label>
          <Textarea
            value={extractedData.successCriteria?.join('\n') || ''}
            onChange={(e) => handleFieldChange('successCriteria', e.target.value.split('\n'))}
            placeholder="Um critério por linha..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        <p className="text-xs text-muted-foreground italic">
          Esta iniciativa será criada no backlog como rascunho.
        </p>
      </div>
    </SuggestionCard>
  )
}
