import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck,
  Plus,
  Calendar,
  User,
  Link2,
  ChevronDown,
  ChevronRight,
  Search,
  ThumbsUp,
  ThumbsDown,
  Scale,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { useDecisionStore } from '@/stores/decisionStore'
import { useAppStore } from '@/stores/appStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea, Checkbox } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/overlay'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { DecisionRecord, DecisionOption } from '@/types'

function DecisionLogView() {
  const navigate = useNavigate()
  const { decisions, createDecision, searchDecisions } = useDecisionStore()
  const { initiatives } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state for new decision
  const [newTitle, setNewTitle] = useState('')
  const [newContext, setNewContext] = useState('')
  const [newOptions, setNewOptions] = useState<DecisionOption[]>([
    { name: '', description: '', pros: [], cons: [] },
  ])
  const [newChosenOption, setNewChosenOption] = useState('')
  const [newRationale, setNewRationale] = useState('')
  const [newImpact, setNewImpact] = useState('')
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>([])

  const filteredDecisions = searchQuery
    ? searchDecisions(searchQuery)
    : decisions

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedDecisions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedDecisions(newExpanded)
  }

  const handleAddOption = () => {
    setNewOptions([...newOptions, { name: '', description: '', pros: [], cons: [] }])
  }

  const handleUpdateOption = (index: number, field: keyof DecisionOption, value: string | string[]) => {
    const updated = [...newOptions]
    updated[index] = { ...updated[index], [field]: value }
    setNewOptions(updated)
  }

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 1) {
      setNewOptions(newOptions.filter((_, i) => i !== index))
    }
  }

  const handleToggleInitiative = (initiativeId: string) => {
    setSelectedInitiatives((prev) =>
      prev.includes(initiativeId)
        ? prev.filter((id) => id !== initiativeId)
        : [...prev, initiativeId]
    )
  }

  const handleCreateDecision = async () => {
    if (!newTitle.trim() || !newContext.trim() || !newChosenOption.trim() || !newRationale.trim()) {
      return
    }

    await createDecision({
      title: newTitle.trim(),
      context: newContext.trim(),
      optionsConsidered: newOptions.filter((o) => o.name.trim()),
      chosenOption: newChosenOption.trim(),
      rationale: newRationale.trim(),
      impact: newImpact.trim(),
      relatedInitiativeIds: selectedInitiatives,
      createdBy: 'PM User', // TODO: Get from auth
    })

    // Reset form
    setNewTitle('')
    setNewContext('')
    setNewOptions([{ name: '', description: '', pros: [], cons: [] }])
    setNewChosenOption('')
    setNewRationale('')
    setNewImpact('')
    setSelectedInitiatives([])
    setIsCreateOpen(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Log de Decisões"
        subtitle="Histórico imutável do 'porquê' das decisões do projeto"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Decisão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Decisão</DialogTitle>
                <DialogDescription>
                  Documente uma decisão importante do projeto. Uma vez criada, não pode ser alterada.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título da Decisão *</label>
                  <Input
                    placeholder="Ex: Cortar feature de relatórios do V1"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                {/* Context */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contexto *</label>
                  <Textarea
                    placeholder="O que levou a essa decisão? Qual era o problema ou situação?"
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Opções Consideradas</label>
                    <Button variant="outline" size="sm" onClick={handleAddOption}>
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Opção
                    </Button>
                  </div>

                  {newOptions.map((option, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Opção {index + 1}</span>
                        {newOptions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                            className="text-destructive h-6 px-2"
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Nome da opção"
                        value={option.name}
                        onChange={(e) => handleUpdateOption(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Descrição breve"
                        value={option.description}
                        onChange={(e) => handleUpdateOption(index, 'description', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Vantagens (uma por linha)</label>
                          <Textarea
                            placeholder="- Vantagem 1&#10;- Vantagem 2"
                            rows={2}
                            value={option.pros.join('\n')}
                            onChange={(e) => handleUpdateOption(index, 'pros', e.target.value.split('\n').filter(Boolean))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Desvantagens (uma por linha)</label>
                          <Textarea
                            placeholder="- Desvantagem 1&#10;- Desvantagem 2"
                            rows={2}
                            value={option.cons.join('\n')}
                            onChange={(e) => handleUpdateOption(index, 'cons', e.target.value.split('\n').filter(Boolean))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chosen Option */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opção Escolhida *</label>
                  <Input
                    placeholder="Qual opção foi escolhida?"
                    value={newChosenOption}
                    onChange={(e) => setNewChosenOption(e.target.value)}
                  />
                </div>

                {/* Rationale */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Justificativa *</label>
                  <Textarea
                    placeholder="Por que essa opção foi escolhida? Quais fatores foram decisivos?"
                    value={newRationale}
                    onChange={(e) => setNewRationale(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Impact */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Impacto</label>
                  <Textarea
                    placeholder="Quais são as consequências dessa decisão? O que muda?"
                    value={newImpact}
                    onChange={(e) => setNewImpact(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Related Initiatives */}
                {initiatives.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Iniciativas Relacionadas</label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {initiatives.map((initiative) => (
                        <div
                          key={initiative.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`initiative-${initiative.id}`}
                            checked={selectedInitiatives.includes(initiative.id)}
                            onCheckedChange={() => handleToggleInitiative(initiative.id)}
                          />
                          <label
                            htmlFor={`initiative-${initiative.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            <span className="text-muted-foreground mr-1">#{initiative.id}</span>
                            {initiative.title}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedInitiatives.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedInitiatives.length} iniciativa{selectedInitiatives.length !== 1 ? 's' : ''} selecionada{selectedInitiatives.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateDecision}
                  disabled={!newTitle.trim() || !newContext.trim() || !newChosenOption.trim() || !newRationale.trim()}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Registrar Decisão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar decisões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredDecisions.length} decisão{filteredDecisions.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredDecisions.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title={searchQuery ? 'Nenhuma decisão encontrada' : 'Nenhuma decisão registrada'}
            description={searchQuery ? 'Tente uma busca ou filtro diferente.' : 'Registre decisões importantes do projeto para referência futura.'}
            action={!searchQuery ? { label: 'Registrar primeira decisão', onClick: () => setIsCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

            {filteredDecisions.map((decision, index) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                isExpanded={expandedDecisions.has(decision.id)}
                onToggleExpand={() => toggleExpanded(decision.id)}
                isFirst={index === 0}
                initiatives={initiatives}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface DecisionCardProps {
  decision: DecisionRecord
  isExpanded: boolean
  onToggleExpand: () => void
  isFirst: boolean
  initiatives: Array<{ id: string; title: string }>
  navigate: ReturnType<typeof useNavigate>
}

function DecisionCard({
  decision,
  isExpanded,
  onToggleExpand,
  isFirst,
  initiatives,
  navigate,
}: DecisionCardProps) {
  const relatedInitiatives = initiatives.filter((i) =>
    decision.relatedInitiativeIds.includes(i.id)
  )

  return (
    <div className="relative pl-14 pb-6">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-4 w-5 h-5 rounded-full border-2 bg-background",
          isFirst
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30"
        )}
      >
        <div
          className={cn(
            "absolute inset-1 rounded-full",
            isFirst && "bg-primary"
          )}
        />
      </div>

      <Card className="overflow-hidden">
        <div
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onToggleExpand}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{decision.title}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {decision.date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {decision.createdBy}
                </span>
                {relatedInitiatives.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {relatedInitiatives.length} iniciativa{relatedInitiatives.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Scale className="h-3 w-3 mr-1" />
                {decision.chosenOption}
              </Badge>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
          </CardHeader>
        </div>

        {isExpanded && (
          <CardBody className="border-t space-y-6 animate-in slide-in-from-top-2 duration-200">
            {/* Context */}
            <div>
              <h5 className="text-sm font-medium mb-2 text-muted-foreground">Contexto</h5>
              <p className="text-sm">{decision.context}</p>
            </div>

            {/* Options Considered */}
            {decision.optionsConsidered.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-3 text-muted-foreground">Opções Consideradas</h5>
                <div className="grid gap-3">
                  {decision.optionsConsidered.map((option, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg p-3",
                        option.name === decision.chosenOption && "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{option.name}</span>
                        {option.name === decision.chosenOption && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            Escolhida
                          </Badge>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {option.pros.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Vantagens
                            </span>
                            <ul className="space-y-0.5 text-muted-foreground">
                              {option.pros.map((pro, i) => (
                                <li key={i}>• {pro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {option.cons.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" /> Desvantagens
                            </span>
                            <ul className="space-y-0.5 text-muted-foreground">
                              {option.cons.map((con, i) => (
                                <li key={i}>• {con}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rationale */}
            <div>
              <h5 className="text-sm font-medium mb-2 text-muted-foreground">Justificativa</h5>
              <p className="text-sm">{decision.rationale}</p>
            </div>

            {/* Impact */}
            {decision.impact && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-muted-foreground">Impacto</h5>
                <p className="text-sm">{decision.impact}</p>
              </div>
            )}

            {/* Related Initiatives */}
            {relatedInitiatives.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2 text-muted-foreground">Iniciativas Relacionadas</h5>
                <div className="flex flex-wrap gap-2">
                  {relatedInitiatives.map((initiative) => (
                    <Badge
                      key={initiative.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/initiative/${initiative.id}`)
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {initiative.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata footer */}
            <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Criado em {decision.createdAt.toLocaleDateString('pt-BR')} às{' '}
                {decision.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {decision.sourceInboxItemId && (
                <Badge variant="outline" className="text-xs">
                  Origem: Inbox
                </Badge>
              )}
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  )
}

export default DecisionLogView
