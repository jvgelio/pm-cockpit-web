import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  CheckSquare,
  Scale,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskSuggestionCard } from './TaskSuggestionCard'
import { DecisionSuggestionCard } from './DecisionSuggestionCard'
import { InitiativeUpdateCard } from './InitiativeUpdateCard'
import { NewInitiativeCard } from './NewInitiativeCard'
import type {
  InboxSuggestion,
  TaskSuggestion,
  DecisionSuggestion,
  StatusUpdateSuggestion,
  NewInitiativeSuggestion,
} from '@/types'

interface InboxReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestions: InboxSuggestion[]
  onUpdateSuggestion: (id: string, updates: Partial<InboxSuggestion>) => void
  onConfirm: () => Promise<void>
  sourceContent?: string
}

type TabType = 'all' | 'task' | 'decision' | 'status_update' | 'new_initiative'

const tabConfig: Record<TabType, { icon: typeof CheckSquare; label: string }> = {
  all: { icon: CheckSquare, label: 'Todos' },
  task: { icon: CheckSquare, label: 'Tarefas' },
  decision: { icon: Scale, label: 'Decisões' },
  status_update: { icon: TrendingUp, label: 'Updates' },
  new_initiative: { icon: Lightbulb, label: 'Novas' },
}

export function InboxReviewModal({
  open,
  onOpenChange,
  suggestions,
  onUpdateSuggestion,
  onConfirm,
  sourceContent,
}: InboxReviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [isConfirming, setIsConfirming] = useState(false)

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, InboxSuggestion[]> = {
      task: [],
      decision: [],
      status_update: [],
      new_initiative: [],
    }

    suggestions.forEach((s) => {
      groups[s.type]?.push(s)
    })

    return groups
  }, [suggestions])

  // Count selected
  const selectedCount = suggestions.filter((s) => s.selected).length

  // Get suggestions for current tab
  const filteredSuggestions =
    activeTab === 'all' ? suggestions : groupedSuggestions[activeTab] || []

  const handleToggle = (id: string, selected: boolean) => {
    onUpdateSuggestion(id, { selected })
  }

  const handleUpdate = (id: string, updates: Partial<InboxSuggestion>) => {
    onUpdateSuggestion(id, updates)
  }

  const handleSelectAll = () => {
    filteredSuggestions.forEach((s) => {
      onUpdateSuggestion(s.id, { selected: true })
    })
  }

  const handleDeselectAll = () => {
    filteredSuggestions.forEach((s) => {
      onUpdateSuggestion(s.id, { selected: false })
    })
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsConfirming(false)
    }
  }

  const renderSuggestionCard = (suggestion: InboxSuggestion) => {
    switch (suggestion.type) {
      case 'task':
        return (
          <TaskSuggestionCard
            key={suggestion.id}
            suggestion={suggestion as TaskSuggestion}
            onUpdate={(updates) => handleUpdate(suggestion.id, updates)}
            onToggle={(selected) => handleToggle(suggestion.id, selected)}
          />
        )
      case 'decision':
        return (
          <DecisionSuggestionCard
            key={suggestion.id}
            suggestion={suggestion as DecisionSuggestion}
            onUpdate={(updates) => handleUpdate(suggestion.id, updates)}
            onToggle={(selected) => handleToggle(suggestion.id, selected)}
          />
        )
      case 'status_update':
        return (
          <InitiativeUpdateCard
            key={suggestion.id}
            suggestion={suggestion as StatusUpdateSuggestion}
            onUpdate={(updates) => handleUpdate(suggestion.id, updates)}
            onToggle={(selected) => handleToggle(suggestion.id, selected)}
          />
        )
      case 'new_initiative':
        return (
          <NewInitiativeCard
            key={suggestion.id}
            suggestion={suggestion as NewInitiativeSuggestion}
            onUpdate={(updates) => handleUpdate(suggestion.id, updates)}
            onToggle={(selected) => handleToggle(suggestion.id, selected)}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Revisar Sugestões
            <Badge variant="secondary" className="ml-2">
              {selectedCount} de {suggestions.length} selecionadas
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Revise e edite as sugestões extraídas. Marque as que deseja confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Source content preview */}
        {sourceContent && (
          <div className="px-4 py-2 bg-muted/50 rounded-md text-xs text-muted-foreground max-h-20 overflow-auto">
            <span className="font-medium">Texto original: </span>
            {sourceContent.slice(0, 200)}
            {sourceContent.length > 200 && '...'}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              {Object.entries(tabConfig).map(([key, { icon: Icon, label }]) => {
                const count =
                  key === 'all'
                    ? suggestions.length
                    : groupedSuggestions[key]?.length || 0
                if (key !== 'all' && count === 0) return null
                return (
                  <TabsTrigger key={key} value={key} className="gap-1.5">
                    <Icon size={14} />
                    {label}
                    <Badge variant="outline" className="ml-1 text-[10px] px-1">
                      {count}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                Selecionar todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs"
              >
                Desmarcar todos
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value={activeTab} className="mt-0 space-y-3">
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma sugestão nesta categoria.
                </div>
              ) : (
                filteredSuggestions.map((suggestion) =>
                  renderSuggestionCard(suggestion)
                )
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0 || isConfirming}
            className="gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar {selectedCount} {selectedCount === 1 ? 'item' : 'itens'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
