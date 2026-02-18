// ============================================
// PM Cockpit - Core Types
// ============================================

// ---------- Enums ----------

export type CycleStatus = 'planning' | 'active' | 'closed'

export type InitiativeStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'blocked'

export type InitiativePriority = 'low' | 'medium' | 'high' | 'critical'

export type InitiativeType = 'discovery' | 'product'

export type ProductStatus = 'active' | 'maintenance' | 'deprecated'

// ---------- Core Entities ----------

export interface Product {
  id: string
  name: string
  status: ProductStatus
}

export interface Team {
  id: string
  name: string
  products: Product[]
  // Content from markdown body
  description?: string
  // File metadata
  filePath: string
}

export interface Cycle {
  id: string
  name: string
  start: Date
  end: Date
  status: CycleStatus
  goals: string[]
  // Content from markdown body
  description?: string
  // Computed
  initiatives?: Initiative[]
  // File metadata
  filePath: string
  folderPath: string
}

export interface Initiative {
  id: string
  title: string
  team: string // Team ID
  product: string // Product ID
  type: InitiativeType // discovery or product
  status: InitiativeStatus
  priority: InitiativePriority
  owner: string
  startDate?: Date
  dueDate?: Date
  progress: number // 0-100
  jiraEpic?: string
  tags: string[]
  dependencies: string[] // Initiative IDs
  // Content sections
  problem?: string
  solution?: string
  successCriteria?: string[]
  notes?: string
  // File metadata
  filePath: string
  cycleId: string | null // null = backlog item
}

// ---------- Config ----------

export interface AppConfig {
  dataPath: string
  theme: 'light' | 'dark' | 'system'
  anthropicApiKey?: string
  jiraConfig?: {
    baseUrl: string
    email: string
    apiToken: string
  }
}

// ---------- UI State ----------

export interface CycleMetrics {
  total: number
  byStatus: Record<InitiativeStatus, number>
  byPriority: Record<InitiativePriority, number>
  averageProgress: number
  blocked: number
  dueThisWeek: number
  overdue: number
}

export interface FilterState {
  team?: string
  product?: string
  type?: InitiativeType
  status?: InitiativeStatus[]
  priority?: InitiativePriority[]
  owner?: string
  tags?: string[]
  search?: string
}

export interface SortState {
  field: keyof Initiative
  direction: 'asc' | 'desc'
}

export type InitiativeFieldKey =
  | 'owner'
  | 'startDate'
  | 'dueDate'
  | 'progress'
  | 'jiraEpic'
  | 'tags'
  | 'dependencies'
  | 'product'

export interface FieldConfig {
  visible: boolean
}

// ---------- Markdown Parsing ----------

export interface ParsedMarkdown<T> {
  frontmatter: T
  content: string
  filePath: string
}

export interface TeamFrontmatter {
  id: string
  name: string
  products: {
    id: string
    name: string
    status: ProductStatus
  }[]
}

export interface CycleFrontmatter {
  id: string
  name: string
  start: string // ISO date string
  end: string // ISO date string
  status: CycleStatus
  goals: string[]
}

export interface InitiativeFrontmatter {
  id: string
  title: string
  team: string
  product: string
  type: InitiativeType
  status: InitiativeStatus
  priority: InitiativePriority
  owner: string
  start_date?: string // ISO date string
  due_date?: string // ISO date string
  progress: number
  jira_epic?: string
  tags: string[]
  dependencies: string[]
}

// ---------- Store Types ----------

export interface AppState {
  // Data
  teams: Team[]
  cycles: Cycle[]
  initiatives: Initiative[]
  currentCycleId: string | null

  // Team-centric state
  currentTeamId: string | null
  currentTeam: Team | null
  backlogInitiatives: Initiative[] // Initiatives with cycleId === null for current team

  // UI State
  selectedInitiativeId: string | null
  filters: FilterState
  sort: SortState
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  settings: {
    jiraApiKey: string
    llmApiKey: string
    llmModel: string
    llmProvider: 'anthropic' | 'openrouter' | 'toqan'
    initiativeFields: Record<InitiativeFieldKey, FieldConfig>
  }

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentTeam: (teamId: string) => void
  setCurrentCycle: (cycleId: string) => void
  selectInitiative: (initiativeId: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  updateSettings: (settings: Partial<AppState['settings']>) => void

  // Data actions
  loadData: () => Promise<void>
  updateInitiative: (id: string, updates: Partial<Initiative>) => Promise<void>
  createInitiative: (initiative: Omit<Initiative, 'id' | 'filePath'>) => Promise<void>
  deleteInitiative: (id: string) => Promise<void>
  moveToBacklog: (initiativeId: string) => Promise<void>
  moveToCycle: (initiativeId: string, cycleId: string) => Promise<void>
}

// ============================================
// Inbox Inteligente Types
// ============================================

export type InboxItemStatus = 'pending' | 'processing' | 'triaged' | 'dismissed'

export type InboxItemSource = 'manual' | 'slack' | 'email' | 'meeting_notes'

export type SuggestionType =
  | 'task'
  | 'decision'
  | 'status_update'
  | 'new_initiative'

// Base interface for all suggestions
export interface BaseSuggestion {
  id: string
  type: SuggestionType
  confidence: number // 0-1
  summary: string
  selected: boolean // Whether user selected this for confirmation
}

// Task suggestion from AI
export interface TaskSuggestion extends BaseSuggestion {
  type: 'task'
  extractedData: {
    title: string
    assignee?: string
    dueDate?: string // ISO date or natural language like "sexta"
    priority?: TaskPriority
    initiativeId?: string
  }
}

// Decision suggestion from AI
export interface DecisionSuggestion extends BaseSuggestion {
  type: 'decision'
  extractedData: {
    title: string
    from: string // What was before
    to: string // What was decided
    rationale: string
    context?: string
    initiativeId?: string
  }
}

// Status update suggestion from AI
export interface StatusUpdateSuggestion extends BaseSuggestion {
  type: 'status_update'
  extractedData: {
    initiativeId: string
    initiativeTitle: string
    status?: InitiativeStatus
    progress?: number
    notes: string
    risks?: string[]
  }
}

// New initiative suggestion from AI
export interface NewInitiativeSuggestion extends BaseSuggestion {
  type: 'new_initiative'
  extractedData: {
    title: string
    problem?: string
    solution?: string
    successCriteria?: string[]
    type?: InitiativeType
    priority?: InitiativePriority
  }
}

// Union type for all suggestions
export type InboxSuggestion =
  | TaskSuggestion
  | DecisionSuggestion
  | StatusUpdateSuggestion
  | NewInitiativeSuggestion

// Legacy suggestion types for backward compatibility with InboxView
export type LegacySuggestionType =
  | 'risk_update'
  | 'todo_item'
  | 'decision_record'
  | 'stakeholder_update'
  | 'initiative_update'

export interface LegacyInboxSuggestion {
  id: string
  type: LegacySuggestionType
  confidence: number
  summary: string
  extractedData: Record<string, unknown>
  targetInitiativeId?: string
  accepted?: boolean
  rejectedReason?: string
}

export interface InboxAIHistoryEntry {
  id: string
  timestamp: Date
  status: 'success' | 'error'
  contentPreview: string
  provider: string
  model: string
  suggestionsCount: number
  entitiesCreated?: {
    tasks?: number
    decisions?: number
    initiativesUpdated?: number
    initiativesCreated?: number
  }
  errorMessage?: string
}

export interface CockpitAdvisorHistoryEntry {
  id: string
  timestamp: Date
  teamId: string
  teamName: string
  cycleId: string | null
  briefingContent: string
  contextSnapshot: {
    totalInitiatives: number
    blockedCount: number
    overdueTasksCount: number
    pendingInboxCount: number
    cycleProgress: number
  }
  provider: string
  model: string
}

// Inbox item uses legacy suggestions for file-based storage
export interface InboxItem {
  id: string
  title: string
  rawContent: string
  source: InboxItemSource
  createdAt: Date
  status: InboxItemStatus
  suggestions?: LegacyInboxSuggestion[]
  filePath: string
}

export interface InboxFrontmatter {
  id: string
  title: string
  source: InboxItemSource
  created_at: string
  status: InboxItemStatus
  suggestions?: LegacyInboxSuggestion[]
}

// ============================================
// Decision Log Types
// ============================================

export interface DecisionOption {
  name: string
  description: string
  pros: string[]
  cons: string[]
}

export interface DecisionRecord {
  id: string
  title: string
  date: Date
  context: string
  optionsConsidered: DecisionOption[]
  chosenOption: string
  rationale: string
  impact: string
  relatedInitiativeIds: string[]
  relatedDecisionIds: string[]
  stakeholdersInformed: string[]
  sourceInboxItemId?: string
  createdAt: Date
  createdBy: string
  filePath: string
}

export interface DecisionFrontmatter {
  id: string
  title: string
  date: string
  chosen_option: string
  related_initiatives: string[]
  related_decisions: string[]
  stakeholders_informed: string[]
  source_inbox_item?: string
  created_at: string
  created_by: string
}

// ============================================
// Task Types
// ============================================

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date
  initiativeId?: string
  tags: string[]
  createdAt: Date
  completedAt?: Date
  filePath: string
}

export interface TaskFrontmatter {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  initiative_id?: string
  tags: string[]
  created_at: string
  completed_at?: string
}

// ============================================
// Extended Store Types for New Features
// ============================================

export interface InboxState {
  inboxItems: InboxItem[]
  processingItemId: string | null
}

export interface DecisionState {
  decisions: DecisionRecord[]
}

export interface TaskState {
  tasks: Task[]
}

// ---------- Helpers ----------

export function getStatusColor(status: InitiativeStatus): string {
  const colors: Record<InitiativeStatus, string> = {
    draft: 'gray',
    planned: 'blue',
    in_progress: 'amber',
    done: 'green',
    blocked: 'red',
  }
  return colors[status]
}

export function getStatusLabel(status: InitiativeStatus): string {
  const labels: Record<InitiativeStatus, string> = {
    draft: 'Rascunho',
    planned: 'Planejado',
    in_progress: 'Em Progresso',
    done: 'Concluído',
    blocked: 'Bloqueado',
  }
  return labels[status]
}

export function getPriorityLabel(priority: InitiativePriority): string {
  const labels: Record<InitiativePriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  }
  return labels[priority]
}

export function getCycleStatusLabel(status: CycleStatus): string {
  const labels: Record<CycleStatus, string> = {
    planning: 'Planejamento',
    active: 'Ativo',
    closed: 'Encerrado',
  }
  return labels[status]
}

// ---------- Inbox Helpers ----------

export function getInboxStatusLabel(status: InboxItemStatus): string {
  const labels: Record<InboxItemStatus, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    triaged: 'Triado',
    dismissed: 'Descartado',
  }
  return labels[status]
}

export function getInboxStatusColor(status: InboxItemStatus): string {
  const colors: Record<InboxItemStatus, string> = {
    pending: 'amber',
    processing: 'blue',
    triaged: 'green',
    dismissed: 'gray',
  }
  return colors[status]
}

export function getInboxSourceLabel(source: InboxItemSource): string {
  const labels: Record<InboxItemSource, string> = {
    manual: 'Manual',
    slack: 'Slack',
    email: 'E-mail',
    meeting_notes: 'Notas de Reunião',
  }
  return labels[source]
}

export function getSuggestionTypeLabel(type: SuggestionType): string {
  const labels: Record<SuggestionType, string> = {
    task: 'Tarefa',
    decision: 'Decisão',
    status_update: 'Atualização',
    new_initiative: 'Nova Iniciativa',
  }
  return labels[type]
}

export function getSuggestionTypeColor(type: SuggestionType): string {
  const colors: Record<SuggestionType, string> = {
    task: 'blue',
    decision: 'purple',
    status_update: 'green',
    new_initiative: 'amber',
  }
  return colors[type]
}

export function getSuggestionTypeIcon(type: SuggestionType): string {
  const icons: Record<SuggestionType, string> = {
    task: 'CheckSquare',
    decision: 'Scale',
    status_update: 'TrendingUp',
    new_initiative: 'Lightbulb',
  }
  return icons[type]
}

// ---------- Task Helpers ----------

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Progresso',
    done: 'Concluída',
    cancelled: 'Cancelada',
  }
  return labels[status]
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'gray',
    in_progress: 'blue',
    done: 'green',
    cancelled: 'slate',
  }
  return colors[status]
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  }
  return labels[priority]
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: 'gray',
    medium: 'blue',
    high: 'amber',
    urgent: 'red',
  }
  return colors[priority]
}

