import { useState } from 'react'
import {
  MessageSquarePlus,
  Sparkles,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Users,
  ListTodo,
  Loader2,
  History,
  Check,
  X,
} from 'lucide-react'
import { useInboxStore } from '@/stores/inboxStore'
import { useAppStore } from '@/stores/appStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/hooks/use-toast'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form'
import { Input } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { InboxItem, InboxItemSource, LegacySuggestionType } from '@/types'
import { getInboxSourceLabel } from '@/types'

// Legacy helpers for file-based inbox view
function getLegacySuggestionTypeLabel(type: LegacySuggestionType): string {
  const labels: Record<LegacySuggestionType, string> = {
    risk_update: 'Atualizar Riscos',
    todo_item: 'Criar Tarefa',
    decision_record: 'Registrar Decisão',
    stakeholder_update: 'Atualizar Stakeholder',
    initiative_update: 'Atualizar Iniciativa',
  }
  return labels[type]
}

function getLegacySuggestionTypeColorClass(type: LegacySuggestionType): string {
  const colors: Record<LegacySuggestionType, string> = {
    risk_update: 'bg-status-blocked/10 text-status-blocked',
    todo_item: 'bg-status-planned/10 text-status-planned',
    decision_record: 'bg-primary/10 text-primary',
    stakeholder_update: 'bg-status-in-progress/10 text-status-in-progress',
    initiative_update: 'bg-status-done/10 text-status-done',
  }
  return colors[type]
}

function InboxView() {
  const {
    inboxItems,
    processingItemId,
    createInboxItem,
    deleteInboxItem,
    acceptSuggestion,
    dismissSuggestion,
    processWithAI,
    aiHistory,
  } = useInboxStore()

  const { initiatives, settings } = useAppStore()
  const { toast } = useToast()

  const [newContent, setNewContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newSource, setNewSource] = useState<InboxItemSource>('manual')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!newContent.trim()) return

    setIsCreating(true)
    const title = newTitle.trim() || `Nota ${new Date().toLocaleDateString('pt-BR')}`
    await createInboxItem(newContent, title, newSource)
    setNewContent('')
    setNewTitle('')
    setNewSource('manual')
    setIsCreating(false)
  }

  const handleProcessWithAI = async (itemId: string) => {
    if (!settings.llmApiKey) {
      toast({
        title: 'API Key não configurada',
        description: 'Configure sua chave API nas Configurações para usar o processamento com IA.',
        variant: 'destructive',
      })
      return
    }

    try {
      await processWithAI(itemId, initiatives)
      toast({
        title: 'Análise concluída',
        description: 'O item foi analisado e as sugestões foram adicionadas.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao processar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }

  const getSuggestionIcon = (type: LegacySuggestionType) => {
    switch (type) {
      case 'risk_update':
        return AlertTriangle
      case 'todo_item':
        return ListTodo
      case 'decision_record':
        return FileText
      case 'stakeholder_update':
        return Users
      case 'initiative_update':
        return CheckCircle2
      default:
        return FileText
    }
  }

  const pendingItems = inboxItems.filter(
    (i) => i.status === 'pending' || i.status === 'processing'
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Inbox Inteligente"
        subtitle="Despeje informações desorganizadas e deixe a IA organizar para você"
      />

      {/* Input Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Nova Entrada</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Título (opcional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={newSource}
              onValueChange={(v) => setNewSource(v as InboxItemSource)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="meeting_notes">Notas de Reunião</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Cole aqui suas notas de reunião, mensagens do Slack, pensamentos rápidos, feedbacks... A IA vai analisar e sugerir ações."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={6}
            className="resize-none"
          />

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleCreate}
              disabled={!newContent.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4 mr-2" />
              )}
              Adicionar ao Inbox
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tabs for Pending vs History */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-5 flex items-center justify-center">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingItems.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="Inbox limpo!"
              description="Nenhum item pendente no inbox. Adicione novas notas acima para começar."
            />
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <InboxItemCard
                  key={item.id}
                  item={item}
                  isProcessing={processingItemId === item.id}
                  onProcess={() => handleProcessWithAI(item.id)}
                  onDelete={() => deleteInboxItem(item.id)}
                  onAcceptSuggestion={(suggestionId) =>
                    acceptSuggestion(item.id, suggestionId)
                  }
                  onDismissSuggestion={(suggestionId) =>
                    dismissSuggestion(item.id, suggestionId)
                  }
                  getSuggestionIcon={getSuggestionIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {aiHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhum histórico"
              description="As chamadas ao Inbox Inteligente aparecerão aqui."
            />
          ) : (
            <div className="space-y-4">
              {aiHistory.map((entry) => (
                <HistoryEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HistoryEntryCard({ entry }: { entry: any }) {
  const isSuccess = entry.status === 'success'

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4",
        isSuccess ? "border-l-status-done" : "border-l-status-blocked"
      )}
    >
      <CardBody className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isSuccess ? (
                <Check className="h-4 w-4 text-status-done" />
              ) : (
                <X className="h-4 w-4 text-status-blocked" />
              )}
              <span className="font-medium">
                {isSuccess ? 'Chamada bem-sucedida' : 'Falha na chamada'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {entry.provider} · {entry.model}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {entry.timestamp.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>

            <div className="bg-muted/30 rounded p-2 text-xs text-muted-foreground italic line-clamp-1 mb-2">
              "{entry.contentPreview}..."
            </div>

            {isSuccess ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {entry.suggestionsCount} sugestões encontradas
                </Badge>

                {entry.entitiesCreated && (
                  <>
                    {(entry.entitiesCreated.tasks || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-status-planned border-status-planned/20">
                        {entry.entitiesCreated.tasks} tarefas criadas
                      </Badge>
                    )}
                    {(entry.entitiesCreated.decisions || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
                        {entry.entitiesCreated.decisions} decisões registradas
                      </Badge>
                    )}
                    {(entry.entitiesCreated.initiativesUpdated || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-status-done border-status-done/20">
                        {entry.entitiesCreated.initiativesUpdated} iniciativas atualizadas
                      </Badge>
                    )}
                    {(entry.entitiesCreated.initiativesCreated || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-status-done border-status-done/20">
                        {entry.entitiesCreated.initiativesCreated} iniciativas criadas
                      </Badge>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-status-blocked font-medium">
                Erro: {entry.errorMessage}
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

interface InboxItemCardProps {
  item: InboxItem
  isProcessing: boolean
  onProcess: () => void
  onDelete: () => void
  onAcceptSuggestion: (suggestionId: string) => void
  onDismissSuggestion: (suggestionId: string) => void
  getSuggestionIcon: (type: LegacySuggestionType) => React.ElementType
}

function InboxItemCard({
  item,
  isProcessing,
  onProcess,
  onDelete,
  onAcceptSuggestion,
  onDismissSuggestion,
  getSuggestionIcon,
}: InboxItemCardProps) {
  const sourceLabel = getInboxSourceLabel(item.source)
  const hasSuggestions = item.suggestions && item.suggestions.length > 0
  const pendingSuggestions = item.suggestions?.filter(
    (s) => !s.accepted && !s.rejectedReason
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{item.title}</h4>
            <Badge variant="outline" className="text-xs shrink-0">
              {sourceLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.createdAt.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onProcess}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Processando...' : 'Processar com IA'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Raw content preview */}
        <div className="bg-muted/50 rounded-md p-3 text-sm max-h-32 overflow-auto">
          <pre className="whitespace-pre-wrap font-sans">{item.rawContent}</pre>
        </div>

        {/* Suggestions */}
        {hasSuggestions && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugestões da IA ({pendingSuggestions?.length || 0} pendentes)
            </h5>
            <div className="space-y-2">
              {item.suggestions?.map((suggestion) => {
                const Icon = getSuggestionIcon(suggestion.type)
                const colorClass = getLegacySuggestionTypeColorClass(suggestion.type)
                const isHandled = suggestion.accepted || suggestion.rejectedReason

                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-md border",
                      isHandled ? "opacity-50 bg-muted/30" : "bg-background"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-md",
                        colorClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {getLegacySuggestionTypeLabel(suggestion.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}% confiança
                        </span>
                      </div>
                      <p className="text-sm">{suggestion.summary}</p>
                    </div>

                    {!isHandled && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-status-done hover:text-status-done hover:bg-status-done/10"
                          onClick={() => onAcceptSuggestion(suggestion.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-status-blocked hover:text-status-blocked hover:bg-status-blocked/10"
                          onClick={() => onDismissSuggestion(suggestion.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {suggestion.accepted && (
                      <Badge variant="outline" className="text-status-done border-status-done/20">
                        Aceito
                      </Badge>
                    )}
                    {suggestion.rejectedReason && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Descartado
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default InboxView
