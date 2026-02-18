import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import {
  Save,
  Trash2,
  User,
  Link as LinkIcon,
  ChevronLeft,
  History,
  MoreVertical,
  Inbox,
  ArrowRight,
  FileCheck,
  Calendar,
  Scale,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useDecisionStore } from '@/stores/decisionStore'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import {
  StatusBadge,
  PriorityBadge,
  ProgressBar,
} from '@/components/shared/StatusBadge'
import { FormGroup } from '@/components/shared/FormGroup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import type { Initiative, InitiativeStatus, InitiativePriority } from '@/types'

function InitiativeEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    initiatives,
    updateInitiative,
    deleteInitiative,
    moveToBacklog,
    moveToCycle,
    cycles,
    settings,
    theme,
  } = useAppStore()

  const { getDecisionsForInitiative } = useDecisionStore()

  const initiative = initiatives.find((i) => i.id === id)
  const relatedDecisions = id ? getDecisionsForInitiative(id) : []

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedData, setEditedData] = useState<Partial<Initiative>>({})
  const [content, setContent] = useState('')

  useEffect(() => {
    if (initiative) {
      setEditedData({
        title: initiative.title,
        status: initiative.status,
        priority: initiative.priority,
        owner: initiative.owner,
        progress: initiative.progress,
        startDate: initiative.startDate,
        dueDate: initiative.dueDate,
        tags: initiative.tags,
        jiraEpic: initiative.jiraEpic,
        product: initiative.product,
        type: initiative.type,
      })

      const sections: string[] = []
      if (initiative.problem) sections.push(`## Problema\n\n${initiative.problem}`)
      if (initiative.solution) sections.push(`## Solução Proposta\n\n${initiative.solution}`)
      if (initiative.successCriteria && initiative.successCriteria.length > 0) {
        const criteria = initiative.successCriteria.map((c) => `- [ ] ${c}`).join('\n')
        sections.push(`## Critérios de Sucesso\n\n${criteria}`)
      }
      if (initiative.notes) sections.push(`## Notas\n\n${initiative.notes}`)
      setContent(sections.length > 0 ? sections.join('\n\n') : '')
    }
  }, [initiative])

  if (!initiative) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-12 text-center animate-in fade-in zoom-in-95">
        <div className="bg-muted p-6 rounded-full mb-4">
          <History size={48} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Iniciativa não encontrada</h2>
        <p className="text-muted-foreground mt-2 mb-6">O item que você está procurando pode ter sido removido ou movido.</p>
        <Button onClick={() => navigate('/dashboard')} variant="default">
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    // Validation
    if (!editedData.title?.trim()) {
      alert('O título é obrigatório.')
      return
    }

    const sections = parseContentSections(content)
    if (!sections.problem?.trim() && !sections.solution?.trim()) {
      alert('Uma descrição mínima (Problema ou Solução) é obrigatória.')
      return
    }

    setIsSaving(true)
    try {
      await updateInitiative(initiative.id, {
        ...editedData,
        problem: sections.problem,
        solution: sections.solution,
        successCriteria: sections.successCriteria,
        notes: sections.notes,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta iniciativa?')) {
      await deleteInitiative(initiative.id)
      navigate('/dashboard')
    }
  }

  const handleMoveToBacklog = async () => {
    if (initiative.cycleId === null) return
    await moveToBacklog(initiative.id)
    navigate('/backlog')
  }

  const handleMoveToCycle = async (cycleId: string) => {
    await moveToCycle(initiative.id, cycleId)
    navigate('/initiatives')
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500" data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
      {/* Top Breadcrumb Actions */}
      <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ChevronLeft size={20} />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 px-1.5 rounded">
                #{initiative.id}
              </span>
              {!isEditing && (
                <>
                  <StatusBadge status={initiative.status} size="sm" />
                  <PriorityBadge priority={initiative.priority} size="sm" />
                </>
              )}
            </div>
            {isEditing ? (
              <Input
                value={editedData.title || ''}
                onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                className="text-2xl font-bold h-10 px-0 bg-transparent border-none focus-visible:ring-0 shadow-none -ml-px"
                placeholder="Título da Iniciativa"
              />
            ) : (
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {initiative.title}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="font-semibold">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2 font-semibold shadow-md shadow-primary/20">
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Move to Backlog (only if in a cycle) */}
                  {initiative.cycleId !== null && (
                    <DropdownMenuItem
                      onClick={handleMoveToBacklog}
                      className="gap-2 cursor-pointer"
                    >
                      <Inbox size={14} />
                      Mover para Backlog
                    </DropdownMenuItem>
                  )}

                  {/* Move to Cycle submenu */}
                  {cycles.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <ArrowRight size={14} />
                        Mover para Ciclo
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {cycles.map((cycle) => (
                          <DropdownMenuItem
                            key={cycle.id}
                            onClick={() => handleMoveToCycle(cycle.id)}
                            className="cursor-pointer"
                            disabled={cycle.id === initiative.cycleId}
                          >
                            {cycle.name}
                            {cycle.id === initiative.cycleId && (
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                (atual)
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Excluir Iniciativa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsEditing(true)} size="sm" variant="outline" className="font-semibold">
                Editar Detalhes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Main Editor Section */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/40 shadow-none">
            <CardBody className="p-0">
              {isEditing ? (
                <div className="p-2">
                  <MDEditor
                    value={content}
                    onChange={(value) => setContent(value || '')}
                    height={600}
                    preview="edit"
                    className="border-none shadow-none"
                    style={{ background: 'transparent' }}
                  />
                </div>
              ) : (
                <div className="p-8 pb-12 max-w-none prose prose-slate dark:prose-invert">
                  <MDEditor.Markdown
                    source={content || '*Sem conteúdo formal ainda.*'}
                    className="font-medium leading-relaxed"
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar Context */}
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <Card className="border-border/60">
            <CardHeader className="py-4 border-b border-border/40">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Estado Atual
              </h3>
            </CardHeader>
            <CardBody className="grid gap-6">
              {/* Progress Slider or Display */}
              {settings.initiativeFields.progress.visible && (
                <FormGroup label="Progresso">
                  {isEditing ? (
                    <div className="pt-2">
                      <Slider
                        value={[editedData.progress || 0]}
                        onValueChange={(vals) => setEditedData({ ...editedData, progress: vals[0] })}
                        max={100}
                        step={5}
                        className="mb-2"
                      />
                      <div className="text-right text-xs font-bold text-primary">
                        {editedData.progress}%
                      </div>
                    </div>
                  ) : (
                    <ProgressBar value={initiative.progress} showLabel />
                  )}
                </FormGroup>
              )}

              {/* Status Select */}
              <FormGroup label="Status">
                {isEditing ? (
                  <Select
                    value={editedData.status}
                    onValueChange={(val) => setEditedData({ ...editedData, status: val as InitiativeStatus })}
                  >
                    <SelectTrigger className="w-full bg-muted/50 border-transparent focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="planned">Planejado</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex">
                    <StatusBadge status={initiative.status} />
                  </div>
                )}
              </FormGroup>

              {/* Priority Select */}
              <FormGroup label="Prioridade">
                {isEditing ? (
                  <Select
                    value={editedData.priority}
                    onValueChange={(val) => setEditedData({ ...editedData, priority: val as InitiativePriority })}
                  >
                    <SelectTrigger className="w-full bg-muted/50 border-transparent focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex">
                    <PriorityBadge priority={initiative.priority} />
                  </div>
                )}
              </FormGroup>
            </CardBody>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="py-4 border-b border-border/40">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Logística & Cronograma
              </h3>
            </CardHeader>
            <CardBody className="grid gap-6">
              {settings.initiativeFields.owner.visible && (
                <FormGroup label="Responsável">
                  <div className="flex items-center gap-2 mt-1">
                    <User size={14} className="text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedData.owner || ''}
                        onChange={(e) => setEditedData({ ...editedData, owner: e.target.value })}
                        className="h-8 text-sm bg-muted/50 border-transparent"
                      />
                    ) : (
                      <span className="text-sm font-semibold">{initiative.owner || 'Sem dono'}</span>
                    )}
                  </div>
                </FormGroup>
              )}

              <div className="grid grid-cols-1 gap-4">
                {(settings.initiativeFields.startDate.visible || settings.initiativeFields.dueDate.visible) && (
                  <FormGroup label="Prazos">
                    <div className="flex flex-col gap-3 mt-1">
                      {settings.initiativeFields.startDate.visible && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Início</span>
                          {isEditing ? (
                            <input type="date" value={formatDate(editedData.startDate)} className="bg-muted p-1 rounded border-none text-[10px]" onChange={(e) => setEditedData({ ...editedData, startDate: e.target.value ? new Date(e.target.value) : undefined })} />
                          ) : (
                            <span className="font-bold">{initiative.startDate?.toLocaleDateString('pt-BR') || '-'}</span>
                          )}
                        </div>
                      )}
                      {settings.initiativeFields.dueDate.visible && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Vencimento</span>
                          {isEditing ? (
                            <input type="date" value={formatDate(editedData.dueDate)} className="bg-muted p-1 rounded border-none text-[10px]" onChange={(e) => setEditedData({ ...editedData, dueDate: e.target.value ? new Date(e.target.value) : undefined })} />
                          ) : (
                            <span className="font-bold">{initiative.dueDate?.toLocaleDateString('pt-BR') || '-'}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </FormGroup>
                )}
              </div>

              {settings.initiativeFields.jiraEpic.visible && (initiative.jiraEpic || isEditing) && (
                <FormGroup label="Jira Epic">
                  <div className="flex items-center gap-2 mt-1">
                    <LinkIcon size={14} className="text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedData.jiraEpic || ''}
                        onChange={(e) => setEditedData({ ...editedData, jiraEpic: e.target.value })}
                        className="h-8 text-sm bg-muted/50 border-transparent"
                        placeholder="EX: CORE-123"
                      />
                    ) : (
                      <a href="#" className="text-xs font-bold text-primary hover:underline">{initiative.jiraEpic}</a>
                    )}
                  </div>
                </FormGroup>
              )}

              {settings.initiativeFields.tags.visible && (
                <FormGroup label="Tags">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {initiative.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] h-5 bg-muted/50 text-muted-foreground border-transparent">
                        {tag}
                      </Badge>
                    ))}
                    {!isEditing && initiative.tags.length === 0 && <span className="text-[10px] text-muted-foreground italic">Nenhuma tag</span>}
                  </div>
                </FormGroup>
              )}

              {settings.initiativeFields.product.visible && (
                <FormGroup label="Produto">
                  {isEditing ? (
                    <Input
                      value={editedData.product || ''}
                      onChange={(e) => setEditedData({ ...editedData, product: e.target.value })}
                      className="h-8 text-sm bg-muted/50 border-transparent"
                    />
                  ) : (
                    <span className="text-sm font-semibold">{initiative.product || 'Sem produto'}</span>
                  )}
                </FormGroup>
              )}

              <FormGroup label="Tipo">
                {isEditing ? (
                  <Select
                    value={editedData.type}
                    onValueChange={(val) => setEditedData({ ...editedData, type: val as 'discovery' | 'product' })}
                  >
                    <SelectTrigger className="w-full bg-muted/50 border-transparent focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="product">Delivery / Produto</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">
                    {initiative.type === 'discovery' ? 'Discovery' : 'Produto'}
                  </Badge>
                )}
              </FormGroup>
            </CardBody>
          </Card>

          {/* Related Decisions */}
          <Card className="border-border/60">
            <CardHeader className="py-4 border-b border-border/40">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileCheck size={14} />
                Decisões Relacionadas
              </h3>
            </CardHeader>
            <CardBody>
              {relatedDecisions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nenhuma decisão relacionada a esta iniciativa.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatedDecisions.slice(0, 5).map((decision) => (
                    <div
                      key={decision.id}
                      className="group cursor-pointer p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                      onClick={() => navigate('/decisions')}
                    >
                      <div className="flex items-start gap-2">
                        <Scale size={12} className="text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                            {decision.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar size={10} />
                              {decision.date.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                              {decision.chosenOption}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {relatedDecisions.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{relatedDecisions.length - 5} mais decisões
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  )
}

function parseContentSections(content: string) {
  const sections: {
    problem?: string
    solution?: string
    successCriteria?: string[]
    notes?: string
  } = {}

  const lines = content.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  const saveCurrent = () => {
    if (currentSection && currentContent.length > 0) {
      const sectionContent = currentContent.join('\n').trim()
      const slug = currentSection.toLowerCase().replace(/\s+/g, '_')
      if (slug.includes('problema')) sections.problem = sectionContent
      else if (slug.includes('solução') || slug.includes('solucao')) sections.solution = sectionContent
      else if (slug.includes('critério') || slug.includes('criterio')) {
        sections.successCriteria = sectionContent
          .split('\n')
          .filter((l) => l.match(/^-\s*\[[ x]\]/))
          .map((l) => l.replace(/^-\s*\[[ x]\]\s*/, '').trim())
      }
      else if (slug.includes('nota')) sections.notes = sectionContent
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      saveCurrent()
      currentSection = headingMatch[1]
      currentContent = []
    } else if (currentSection) {
      currentContent.push(line)
    }
  }
  saveCurrent()
  return sections
}

export default InitiativeEditor
