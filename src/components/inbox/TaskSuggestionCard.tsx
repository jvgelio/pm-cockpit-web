import { User, Calendar, Flag } from 'lucide-react'
import { SuggestionCard } from './SuggestionCard'
import { Input } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form'
import type { TaskSuggestion, TaskPriority } from '@/types'

interface TaskSuggestionCardProps {
  suggestion: TaskSuggestion
  onUpdate: (updates: Partial<TaskSuggestion>) => void
  onToggle: (selected: boolean) => void
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

export function TaskSuggestionCard({
  suggestion,
  onUpdate,
  onToggle,
}: TaskSuggestionCardProps) {
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
      type="task"
      confidence={suggestion.confidence}
      summary={suggestion.summary}
      selected={suggestion.selected}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Título da tarefa</label>
          <Input
            value={extractedData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Título da tarefa"
            className="h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Assignee */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <User size={12} />
              Responsável
            </label>
            <Input
              value={extractedData.assignee || ''}
              onChange={(e) => handleFieldChange('assignee', e.target.value)}
              placeholder="Nome"
              className="h-8 text-sm"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Calendar size={12} />
              Prazo
            </label>
            <Input
              value={extractedData.dueDate || ''}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              placeholder="ex: sexta"
              className="h-8 text-sm"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Flag size={12} />
              Prioridade
            </label>
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
      </div>
    </SuggestionCard>
  )
}
