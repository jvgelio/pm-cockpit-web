import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare,
  Plus,
  Calendar,
  Search,
  AlertTriangle,
  Circle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Trash2,
  RotateCcw,
  Link2,
  Filter,
} from 'lucide-react'
import { useTasksStore } from '@/stores/tasksStore'
import { useAppStore } from '@/stores/appStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/form'
import { Textarea } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/overlay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { getTaskPriorityLabel } from '@/types'

function TasksView() {
  const navigate = useNavigate()
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    searchTasks,
  } = useTasksStore()
  const { initiatives } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state for new task
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newInitiativeId, setNewInitiativeId] = useState('')
  const [newTags, setNewTags] = useState('')

  // Filter tasks
  let filteredTasks = searchQuery ? searchTasks(searchQuery) : tasks
  if (statusFilter !== 'all') {
    filteredTasks = filteredTasks.filter((t) => t.status === statusFilter)
  }

  // Group tasks by status
  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending')
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress')
  const doneTasks = filteredTasks.filter((t) => t.status === 'done')
  const cancelledTasks = filteredTasks.filter((t) => t.status === 'cancelled')

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return

    await createTask({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      priority: newPriority,
      dueDate: newDueDate ? new Date(newDueDate) : undefined,
      initiativeId: newInitiativeId || undefined,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })

    // Reset form
    setNewTitle('')
    setNewDescription('')
    setNewPriority('medium')
    setNewDueDate('')
    setNewInitiativeId('')
    setNewTags('')
    setIsCreateOpen(false)
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'done') {
      await completeTask(task.id)
    } else if (task.status === 'done') {
      // Task was done, now reopening to a different status
      await reopenTask(task.id)
      if (newStatus !== 'pending') {
        await updateTask(task.id, { status: newStatus })
      }
    } else {
      await updateTask(task.id, { status: newStatus })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId)
    }
  }

  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const overdueCount = tasks.filter((t) =>
    t.dueDate &&
    t.dueDate < new Date() &&
    t.status !== 'done' &&
    t.status !== 'cancelled'
  ).length

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Tarefas"
        subtitle={`${pendingCount} tarefa${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}${overdueCount > 0 ? ` (${overdueCount} atrasada${overdueCount !== 1 ? 's' : ''})` : ''}`}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Tarefa</DialogTitle>
                <DialogDescription>
                  Adicione uma nova tarefa para acompanhar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titulo *</label>
                  <Input
                    placeholder="O que precisa ser feito?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descricao</label>
                  <Textarea
                    placeholder="Detalhes adicionais..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Limite</label>
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Related Initiative */}
                {initiatives.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Iniciativa Relacionada</label>
                    <Select value={newInitiativeId} onValueChange={setNewInitiativeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma iniciativa (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {initiatives.map((init) => (
                          <SelectItem key={init.id} value={init.id}>
                            {init.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separe as tags por virgula</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTask} disabled={!newTitle.trim()}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search and filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="done">Concluidas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Task sections */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={searchQuery || statusFilter !== 'all' ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa criada'}
            description={searchQuery || statusFilter !== 'all' ? 'Tente uma busca ou filtro diferente.' : 'Crie tarefas para acompanhar o trabalho do dia a dia.'}
            action={!searchQuery && statusFilter === 'all' ? { label: 'Criar primeira tarefa', onClick: () => setIsCreateOpen(true) } : undefined}
          />
        ) : (
          <>
            {/* In Progress */}
            {inProgressTasks.length > 0 && (
              <TaskSection
                title="Em Progresso"
                icon={<PlayCircle className="h-5 w-5 text-status-planned" />}
                tasks={inProgressTasks}
                initiatives={initiatives}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                navigate={navigate}
              />
            )}

            {/* Pending */}
            {pendingTasks.length > 0 && (
              <TaskSection
                title="Pendentes"
                icon={<Circle className="h-5 w-5 text-gray-400" />}
                tasks={pendingTasks}
                initiatives={initiatives}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                navigate={navigate}
              />
            )}

            {/* Done */}
            {doneTasks.length > 0 && (
              <TaskSection
                title="Concluidas"
                icon={<CheckCircle2 className="h-5 w-5 text-status-done" />}
                tasks={doneTasks}
                initiatives={initiatives}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                navigate={navigate}
                collapsed
              />
            )}

            {/* Cancelled */}
            {cancelledTasks.length > 0 && (
              <TaskSection
                title="Canceladas"
                icon={<XCircle className="h-5 w-5 text-slate-400" />}
                tasks={cancelledTasks}
                initiatives={initiatives}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                navigate={navigate}
                collapsed
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface TaskSectionProps {
  title: string
  icon: React.ReactNode
  tasks: Task[]
  initiatives: Array<{ id: string; title: string }>
  onStatusChange: (task: Task, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  navigate: ReturnType<typeof useNavigate>
  collapsed?: boolean
}

function TaskSection({
  title,
  icon,
  tasks,
  initiatives,
  onStatusChange,
  onDelete,
  navigate,
  collapsed = false,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)

  return (
    <div>
      <button
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {icon}
        <span>{title}</span>
        <Badge variant="secondary" className="ml-1">
          {tasks.length}
        </Badge>
      </button>

      {!isCollapsed && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              initiatives={initiatives}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  initiatives: Array<{ id: string; title: string }>
  onStatusChange: (task: Task, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  navigate: ReturnType<typeof useNavigate>
}

function TaskCard({ task, initiatives, onStatusChange, onDelete, navigate }: TaskCardProps) {
  const relatedInitiative = initiatives.find((i) => i.id === task.initiativeId)
  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'done' && task.status !== 'cancelled'
  const isDone = task.status === 'done'

  const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-priority-low/10 text-priority-low',
    medium: 'bg-priority-medium/10 text-priority-medium',
    high: 'bg-priority-high/10 text-priority-high',
    urgent: 'bg-priority-critical/10 text-priority-critical',
  }

  return (
    <Card className={cn(
      "transition-all",
      isDone && "opacity-60",
      isOverdue && "border-status-blocked/30"
    )}>
      <CardBody className="flex items-start gap-3 py-3">
        {/* Status checkbox/button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "mt-0.5 shrink-0 rounded-full p-0.5 transition-colors",
                task.status === 'done'
                  ? "text-status-done hover:text-status-done/80"
                  : task.status === 'in_progress'
                  ? "text-status-planned hover:text-status-planned/80"
                  : task.status === 'cancelled'
                  ? "text-slate-400 hover:text-slate-500"
                  : "text-gray-300 hover:text-gray-400"
              )}
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : task.status === 'in_progress' ? (
                <PlayCircle className="h-5 w-5" />
              ) : task.status === 'cancelled' ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onStatusChange(task, 'pending')}>
              <Circle className="h-4 w-4 mr-2 text-gray-400" />
              Pendente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task, 'in_progress')}>
              <PlayCircle className="h-4 w-4 mr-2 text-status-planned" />
              Em Progresso
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task, 'done')}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-status-done" />
              Concluida
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task, 'cancelled')}>
              <XCircle className="h-4 w-4 mr-2 text-slate-400" />
              Cancelada
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                isDone && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>

              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* Priority */}
                <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>
                  {getTaskPriorityLabel(task.priority)}
                </Badge>

                {/* Due date */}
                {task.dueDate && (
                  <span className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-status-blocked font-medium" : "text-muted-foreground"
                  )}>
                    {isOverdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {task.dueDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                )}

                {/* Related initiative */}
                {relatedInitiative && (
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => navigate(`/initiative/${relatedInitiative.id}`)}
                  >
                    <Link2 className="h-3 w-3" />
                    {relatedInitiative.title}
                  </button>
                )}

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {task.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {task.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {task.status === 'done' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onStatusChange(task, 'pending')}
                  title="Reabrir tarefa"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(task.id)}
                title="Excluir tarefa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default TasksView
