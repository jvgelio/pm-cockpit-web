import { create } from 'zustand'
import type {
  Team,
  Cycle,
  Initiative,
  FilterState,
  SortState,
  CycleMetrics,
  InitiativeStatus,
  InitiativePriority,
  InitiativeFieldKey,
  FieldConfig,
  CockpitAdvisorHistoryEntry,
} from '@/types'
import {
  parseTeam,
  parseCycle,
  parseInitiative,
  serializeInitiative,
  serializeCycle,
  generateInitiativeId,
  generateInitiativeFilename,
} from '@/lib/markdown'
import type { CycleStatus } from '@/types'
import { getCurrentSemester, isThisWeek, isOverdue } from '@/lib/cycle'
import { storage } from '@/lib/storage'

// ============================================
// App Store
// ============================================

interface AppState {
  // Data
  teams: Team[]
  cycles: Cycle[]
  initiatives: Initiative[]
  currentCycleId: string | null
  dataPath: string

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

  // Loading states
  isLoading: boolean
  error: string | null

  // Computed
  currentCycle: Cycle | null
  currentInitiatives: Initiative[]
  metrics: CycleMetrics | null

  // Settings
  settings: {
    jiraApiKey: string
    llmApiKey: string
    llmModel: string
    llmProvider: 'anthropic' | 'openrouter' | 'toqan'
    autoRunCockpit: boolean
    initiativeFields: Record<InitiativeFieldKey, FieldConfig>
  }

  // Cockpit Advisor History
  advisorHistory: CockpitAdvisorHistoryEntry[]
  currentBriefing: {
    content: string
    timestamp: Date
    teamId: string
  } | null

  // Actions
  setDataPath: (path: string) => void
  setCurrentTeam: (teamId: string) => void
  setCurrentCycle: (cycleId: string) => void
  selectInitiative: (initiativeId: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  setSort: (sort: SortState) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  updateSettings: (settings: Partial<AppState['settings']>) => void
  setError: (error: string | null) => void

  // Data actions
  loadData: () => Promise<void>
  reloadInitiatives: () => Promise<void>
  updateInitiative: (id: string, updates: Partial<Initiative>) => Promise<void>
  createInitiative: (
    initiative: Omit<Initiative, 'id' | 'filePath'>
  ) => Promise<Initiative>
  deleteInitiative: (id: string) => Promise<void>
  moveToBacklog: (initiativeId: string) => Promise<void>
  moveToCycle: (initiativeId: string, cycleId: string) => Promise<void>
  createCycle: (data: {
    name: string
    start: Date
    end: Date
    status: CycleStatus
    goals?: string[]
    description?: string
  }) => Promise<Cycle>

  // Advisor History actions
  loadAdvisorHistory: () => Promise<void>
  saveAdvisorEntry: (entry: Omit<CockpitAdvisorHistoryEntry, 'id'>) => Promise<void>
  setCurrentBriefing: (briefing: { content: string; timestamp: Date; teamId: string } | null) => void
  getLastBriefingForTeam: (teamId: string) => CockpitAdvisorHistoryEntry | null
}

const defaultFilters: FilterState = {}
const defaultSort: SortState = { field: 'priority', direction: 'desc' }

const defaultFields: Record<InitiativeFieldKey, FieldConfig> = {
  owner: { visible: true },
  startDate: { visible: true },
  dueDate: { visible: true },
  progress: { visible: true },
  jiraEpic: { visible: true },
  tags: { visible: true },
  dependencies: { visible: true },
  product: { visible: true },
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  teams: [],
  cycles: [],
  initiatives: [],
  currentCycleId: null,
  dataPath: '',

  // Team-centric state
  currentTeamId: null,
  currentTeam: null,
  backlogInitiatives: [],

  selectedInitiativeId: null,
  filters: defaultFilters,
  sort: defaultSort,
  sidebarCollapsed: false,
  theme: (localStorage.getItem('pm-cockpit-theme') as 'light' | 'dark' | 'system') || 'system',
  settings: {
    jiraApiKey: localStorage.getItem('pm-cockpit-jira-key') || '',
    llmApiKey: localStorage.getItem('pm-cockpit-llm-key') || '',
    llmModel: localStorage.getItem('pm-cockpit-llm-model') || 'gpt-4o',
    llmProvider:
      (localStorage.getItem('pm-cockpit-llm-provider') as
        | 'anthropic'
        | 'openrouter'
        | 'toqan') || 'anthropic',
    autoRunCockpit: localStorage.getItem('pm-cockpit-auto-cockpit') === 'true',
    initiativeFields: {
      ...defaultFields,
      ...JSON.parse(localStorage.getItem('pm-cockpit-fields') || '{}'),
    },
  },

  isLoading: true,
  error: null,

  // Computed (will be calculated in getters)
  currentCycle: null,
  currentInitiatives: [],
  metrics: null,

  // Advisor History
  advisorHistory: [],
  currentBriefing: null,

  // Actions
  setDataPath: (path) => set({ dataPath: path }),

  setCurrentTeam: (teamId) => {
    const state = get()
    const team = state.teams.find((t) => t.id === teamId) || null

    // Cycles are global now
    const cycles = state.cycles

    const backlogInitiatives = state.initiatives.filter(
      (i) => i.cycleId === null && i.team === teamId
    )

    // Auto-select active cycle or first cycle
    const activeCycle = cycles.find((c) => c.status === 'active')
    const firstCycle = cycles[0]
    const selectedCycle = state.currentCycle || activeCycle || firstCycle || null

    const currentInitiatives = selectedCycle
      ? state.initiatives.filter((i) => i.cycleId === selectedCycle.id)
      : []

    set({
      currentTeamId: teamId,
      currentTeam: team,
      backlogInitiatives: applyFiltersAndSort(
        backlogInitiatives,
        state.filters,
        state.sort
      ),
      currentCycleId: selectedCycle?.id || null,
      currentCycle: selectedCycle,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
      selectedInitiativeId: null,
    })
  },

  setCurrentCycle: (cycleId) => {
    set({ currentCycleId: cycleId, selectedInitiativeId: null })
    // Recalculate derived state
    const state = get()
    const cycle = state.cycles.find((c) => c.id === cycleId) || null
    const initiatives = state.initiatives.filter((i) => i.cycleId === cycleId)
    set({
      currentCycle: cycle,
      currentInitiatives: applyFiltersAndSort(
        initiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(initiatives),
    })
  },

  selectInitiative: (initiativeId) =>
    set({ selectedInitiativeId: initiativeId }),

  setFilters: (filters) => {
    const state = get()
    const newFilters = { ...state.filters, ...filters }
    const initiatives = state.initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    set({
      filters: newFilters,
      currentInitiatives: applyFiltersAndSort(
        initiatives,
        newFilters,
        state.sort
      ),
    })
  },

  clearFilters: () => {
    const state = get()
    const initiatives = state.initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    set({
      filters: defaultFilters,
      currentInitiatives: applyFiltersAndSort(
        initiatives,
        defaultFilters,
        state.sort
      ),
    })
  },

  setSort: (sort) => {
    const state = get()
    const initiatives = state.initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    set({
      sort,
      currentInitiatives: applyFiltersAndSort(
        initiatives,
        state.filters,
        sort
      ),
    })
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTheme: (theme) => {
    localStorage.setItem('pm-cockpit-theme', theme)
    set({ theme })
  },

  updateSettings: (newSettings) => {
    const { settings } = get()
    const updated = { ...settings, ...newSettings }

    // Persist
    if (newSettings.jiraApiKey !== undefined) localStorage.setItem('pm-cockpit-jira-key', newSettings.jiraApiKey)
    if (newSettings.llmApiKey !== undefined) localStorage.setItem('pm-cockpit-llm-key', newSettings.llmApiKey)
    if (newSettings.llmModel !== undefined) localStorage.setItem('pm-cockpit-llm-model', newSettings.llmModel)
    if (newSettings.llmProvider !== undefined) localStorage.setItem('pm-cockpit-llm-provider', newSettings.llmProvider)
    if (newSettings.autoRunCockpit !== undefined) localStorage.setItem('pm-cockpit-auto-cockpit', String(newSettings.autoRunCockpit))
    if (newSettings.initiativeFields !== undefined) localStorage.setItem('pm-cockpit-fields', JSON.stringify(newSettings.initiativeFields))

    set({ settings: updated })
  },

  setError: (error) => set({ error }),

  // Data loading
  loadData: async () => {
    set({ isLoading: true, error: null })

    try {
      console.log('Loading data from storage...')
      const dataPath = storage.getBasePath()
      set({ dataPath })

      // Load teams
      const teams = await loadTeams()

      // Load cycles and their initiatives
      const { cycles, initiatives } = await loadCyclesAndInitiatives()

      // Load backlog initiatives
      const backlogInits = await loadBacklogInitiatives(teams)
      const allInitiatives = [...initiatives, ...backlogInits]

      // Auto-select first team
      const currentTeamId = teams[0]?.id || null
      const currentTeam = teams[0] || null

      // Get backlog for current team
      const backlogInitiatives = currentTeamId
        ? backlogInits.filter((i) => i.team === currentTeamId)
        : []

      // Determine current cycle (prefer active cycle)
      const currentSemester = getCurrentSemester()
      const activeCycle = cycles.find((c) => c.status === 'active')
      const semesterCycle = cycles.find((c) => c.id === currentSemester.id)
      const currentCycleId =
        activeCycle?.id ||
        semesterCycle?.id ||
        cycles[0]?.id ||
        null

      const currentCycle = cycles.find((c) => c.id === currentCycleId) || null
      const currentInitiatives = allInitiatives.filter(
        (i) => i.cycleId === currentCycleId
      )

      set({
        teams,
        cycles,
        initiatives: allInitiatives,
        currentTeamId,
        currentTeam,
        backlogInitiatives: applyFiltersAndSort(
          backlogInitiatives,
          defaultFilters,
          defaultSort
        ),
        currentCycleId,
        currentCycle,
        currentInitiatives: applyFiltersAndSort(
          currentInitiatives,
          defaultFilters,
          defaultSort
        ),
        metrics: calculateMetrics(currentInitiatives),
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false,
      })
    }
  },

  reloadInitiatives: async () => {
    const state = get()
    try {
      const { initiatives } = await loadCyclesAndInitiatives()

      const currentInitiatives = initiatives.filter(
        (i) => i.cycleId === state.currentCycleId
      )

      set({
        initiatives,
        currentInitiatives: applyFiltersAndSort(
          currentInitiatives,
          state.filters,
          state.sort
        ),
        metrics: calculateMetrics(currentInitiatives),
      })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to reload initiatives',
      })
    }
  },

  updateInitiative: async (id, updates) => {
    const state = get()
    const initiative = state.initiatives.find((i) => i.id === id)
    if (!initiative) return

    const updated = { ...initiative, ...updates }
    const content = serializeInitiative(updated)

    await storage.writeFile(initiative.filePath, content)

    // Update local state
    const initiatives = state.initiatives.map((i) =>
      i.id === id ? updated : i
    )
    const currentInitiatives = initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )

    set({
      initiatives,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
    })
  },

  createInitiative: async (data) => {
    const state = get()
    const existingIds = state.initiatives.map((i) => i.id)
    const newId = generateInitiativeId(existingIds)
    const fileName = generateInitiativeFilename(newId, data.title)

    // Determine file path based on whether it's backlog or cycle
    const filePath = data.cycleId
      ? `cycles/${data.cycleId}/${fileName}`
      : `backlog/${data.team}/${fileName}`

    const initiative: Initiative = {
      ...data,
      id: newId,
      filePath,
    }

    const content = serializeInitiative(initiative)
    await storage.writeFile(filePath, content)

    // Update local state
    const initiatives = [...state.initiatives, initiative]
    const currentInitiatives = initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    const backlogInitiatives = initiatives.filter(
      (i) => i.cycleId === null && i.team === state.currentTeamId
    )

    set({
      initiatives,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      backlogInitiatives: applyFiltersAndSort(
        backlogInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
    })

    return initiative
  },

  deleteInitiative: async (id) => {
    const state = get()
    const initiative = state.initiatives.find((i) => i.id === id)
    if (!initiative) return

    await storage.deleteFile(initiative.filePath)

    // Update local state
    const initiatives = state.initiatives.filter((i) => i.id !== id)
    const currentInitiatives = initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    const backlogInitiatives = initiatives.filter(
      (i) => i.cycleId === null && i.team === state.currentTeamId
    )

    set({
      initiatives,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      backlogInitiatives: applyFiltersAndSort(
        backlogInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
      selectedInitiativeId:
        state.selectedInitiativeId === id ? null : state.selectedInitiativeId,
    })
  },

  moveToBacklog: async (initiativeId) => {
    const state = get()
    const initiative = state.initiatives.find((i) => i.id === initiativeId)
    if (!initiative || initiative.cycleId === null) return

    // Generate new file path in backlog folder
    const fileName = generateInitiativeFilename(initiative.id, initiative.title)
    const newFilePath = `backlog/${initiative.team}/${fileName}`

    // Update the initiative
    const updated: Initiative = {
      ...initiative,
      cycleId: null,
      filePath: newFilePath,
    }

    // Write to new location and delete old file
    const content = serializeInitiative(updated)
    await storage.writeFile(newFilePath, content)
    await storage.deleteFile(initiative.filePath)

    // Update local state
    const initiatives = state.initiatives.map((i) =>
      i.id === initiativeId ? updated : i
    )
    const currentInitiatives = initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    const backlogInitiatives = initiatives.filter(
      (i) => i.cycleId === null && i.team === state.currentTeamId
    )

    set({
      initiatives,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      backlogInitiatives: applyFiltersAndSort(
        backlogInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
    })
  },

  moveToCycle: async (initiativeId, cycleId) => {
    const state = get()
    const initiative = state.initiatives.find((i) => i.id === initiativeId)
    if (!initiative) return

    // Generate new file path in cycle folder
    const fileName = generateInitiativeFilename(initiative.id, initiative.title)
    const newFilePath = `cycles/${cycleId}/${fileName}`

    // Update the initiative
    const updated: Initiative = {
      ...initiative,
      cycleId,
      filePath: newFilePath,
    }

    // Write to new location and delete old file
    const content = serializeInitiative(updated)
    await storage.writeFile(newFilePath, content)
    await storage.deleteFile(initiative.filePath)

    // Update local state
    const initiatives = state.initiatives.map((i) =>
      i.id === initiativeId ? updated : i
    )
    const currentInitiatives = initiatives.filter(
      (i) => i.cycleId === state.currentCycleId
    )
    const backlogInitiatives = initiatives.filter(
      (i) => i.cycleId === null && i.team === state.currentTeamId
    )

    set({
      initiatives,
      currentInitiatives: applyFiltersAndSort(
        currentInitiatives,
        state.filters,
        state.sort
      ),
      backlogInitiatives: applyFiltersAndSort(
        backlogInitiatives,
        state.filters,
        state.sort
      ),
      metrics: calculateMetrics(currentInitiatives),
    })
  },

  createCycle: async (data) => {
    const state = get()

    // Generate a unique ID for the cycle (e.g., 2025-Q1 or custom)
    const existingIds = state.cycles.map((c) => c.id)
    let cycleId = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    let counter = 1
    while (existingIds.includes(cycleId)) {
      cycleId = `${data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${counter}`
      counter++
    }

    const folderPath = `cycles/${cycleId}`
    const metaFilePath = `${folderPath}/_cycle.md`

    const cycle: Cycle = {
      id: cycleId,
      name: data.name,
      start: data.start,
      end: data.end,
      status: data.status,
      goals: data.goals || [],
      description: data.description,
      filePath: metaFilePath,
      folderPath,
    }

    // Create folder and metadata file
    await storage.createDirectory(folderPath)
    const content = serializeCycle(cycle)
    await storage.writeFile(metaFilePath, content)

    // Update local state
    const newCycles = [...state.cycles, cycle]

    set({
      cycles: newCycles,
    })

    return cycle
  },

  // Advisor History actions
  loadAdvisorHistory: async () => {
    try {
      const historyPath = 'cockpit/advisor-history.json'
      const exists = await storage.exists(historyPath)

      if (exists) {
        const content = await storage.readFile(historyPath)
        if (content) {
          const history = JSON.parse(content) as CockpitAdvisorHistoryEntry[]
          // Convert date strings back to Date objects
          const parsedHistory = history.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }))
          set({ advisorHistory: parsedHistory })
        }
      }
    } catch (error) {
      console.warn('Failed to load advisor history:', error)
    }
  },

  saveAdvisorEntry: async (entry) => {
    const state = get()
    const newEntry: CockpitAdvisorHistoryEntry = {
      ...entry,
      id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    // Keep only last 30 entries
    const newHistory = [newEntry, ...state.advisorHistory].slice(0, 30)

    try {
      // Ensure cockpit folder exists
      const folderExists = await storage.exists('cockpit')
      if (!folderExists) {
        await storage.createDirectory('cockpit')
      }

      // Save to file
      const historyPath = 'cockpit/advisor-history.json'
      await storage.writeFile(historyPath, JSON.stringify(newHistory, null, 2))

      set({
        advisorHistory: newHistory,
        currentBriefing: {
          content: entry.briefingContent,
          timestamp: entry.timestamp,
          teamId: entry.teamId,
        },
      })
    } catch (error) {
      console.error('Failed to save advisor entry:', error)
    }
  },

  setCurrentBriefing: (briefing) => set({ currentBriefing: briefing }),

  getLastBriefingForTeam: (teamId) => {
    const state = get()
    return state.advisorHistory.find(entry => entry.teamId === teamId) || null
  },
}))

// ============================================
// Helper Functions
// ============================================

async function loadTeams(): Promise<Team[]> {
  const teams: Team[] = []

  // Use new bulk reading API
  const entries = await storage.readDirectoryWithContent('teams', ['.md'])

  for (const entry of entries) {
    if (entry.content) {
      try {
        const team = parseTeam(entry.content, entry.path)
        teams.push(team)
      } catch {
        console.warn(`Failed to parse team file: ${entry.path}`)
      }
    }
  }

  return teams
}

async function loadCyclesAndInitiatives(): Promise<{ cycles: Cycle[]; initiatives: Initiative[] }> {
  const cycles: Cycle[] = []
  const initiatives: Initiative[] = []

  const cycleEntries = await storage.readDirectory('cycles')

  for (const cycleEntry of cycleEntries) {
    if (!cycleEntry.isDirectory) continue

    // Load cycle metadata
    const cycleMetaPath = `${cycleEntry.path}/_cycle.md`
    const cycleExists = await storage.exists(cycleMetaPath)

    if (cycleExists) {
      try {
        const cycleContent = await storage.readFile(cycleMetaPath)
        if (cycleContent) {
          const cycle = parseCycle(cycleContent, cycleMetaPath, cycleEntry.path)
          cycles.push(cycle)

          // Load initiatives in this cycle using bulk API
          const initiativeEntries = await storage.readDirectoryWithContent(cycleEntry.path, ['.md'])

          for (const initEntry of initiativeEntries) {
            if (
              initEntry.content &&
              !initEntry.name.startsWith('_')
            ) {
              try {
                const initiative = parseInitiative(
                  initEntry.content,
                  initEntry.path,
                  cycle.id
                )
                initiatives.push(initiative)
              } catch {
                console.warn(`Failed to parse initiative: ${initEntry.path}`)
              }
            }
          }
        }
      } catch {
        console.warn(`Failed to parse cycle: ${cycleEntry.path}`)
      }
    }
  }

  // Sort cycles by start date (newest first)
  cycles.sort((a, b) => b.start.getTime() - a.start.getTime())

  return { cycles, initiatives }
}

async function loadBacklogInitiatives(teams: Team[]): Promise<Initiative[]> {
  const initiatives: Initiative[] = []

  // Check if backlog folder exists
  const backlogExists = await storage.exists('backlog')
  if (!backlogExists) return initiatives

  // Load initiatives from each team's backlog folder
  for (const team of teams) {
    const teamBacklogPath = `backlog/${team.id}`
    const teamBacklogExists = await storage.exists(teamBacklogPath)

    if (teamBacklogExists) {
      try {
        // Use bulk API
        const entries = await storage.readDirectoryWithContent(teamBacklogPath, ['.md'])

        for (const entry of entries) {
          if (entry.content) {
            try {
              const initiative = parseInitiative(entry.content, entry.path, null)
              initiatives.push(initiative)
            } catch {
              console.warn(`Failed to parse backlog initiative: ${entry.path}`)
            }
          }
        }
      } catch {
        console.warn(`Failed to read backlog folder: ${teamBacklogPath}`)
      }
    }
  }

  return initiatives
}

function applyFiltersAndSort(
  initiatives: Initiative[],
  filters: FilterState,
  sort: SortState
): Initiative[] {
  let result = [...initiatives]

  // Apply filters
  if (filters.team) {
    result = result.filter((i) => i.team === filters.team)
  }
  if (filters.product) {
    result = result.filter((i) => i.product === filters.product)
  }
  if (filters.type) {
    result = result.filter((i) => i.type === filters.type)
  }
  if (filters.status && filters.status.length > 0) {
    result = result.filter((i) => filters.status!.includes(i.status))
  }
  if (filters.priority && filters.priority.length > 0) {
    result = result.filter((i) => filters.priority!.includes(i.priority))
  }
  if (filters.owner) {
    result = result.filter((i) => i.owner === filters.owner)
  }
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter((i) =>
      filters.tags!.some((tag) => i.tags.includes(tag))
    )
  }
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(searchLower) ||
        i.id.toLowerCase().includes(searchLower)
    )
  }

  // Apply sort
  const priorityOrder: Record<InitiativePriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  }
  const statusOrder: Record<InitiativeStatus, number> = {
    blocked: 5,
    in_progress: 4,
    planned: 3,
    draft: 2,
    done: 1,
  }

  result.sort((a, b) => {
    let comparison = 0
    const field = sort.field

    switch (field) {
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
        break
      case 'status':
        comparison = statusOrder[a.status] - statusOrder[b.status]
        break
      case 'dueDate':
        comparison =
          (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)
        break
      case 'progress':
        comparison = a.progress - b.progress
        break
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      default:
        comparison = 0
    }

    return sort.direction === 'desc' ? -comparison : comparison
  })

  return result
}

function calculateMetrics(initiatives: Initiative[]): CycleMetrics {
  const byStatus: Record<InitiativeStatus, number> = {
    draft: 0,
    planned: 0,
    in_progress: 0,
    done: 0,
    blocked: 0,
  }

  const byPriority: Record<InitiativePriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  let totalProgress = 0
  let dueThisWeek = 0
  let overdue = 0

  for (const init of initiatives) {
    byStatus[init.status]++
    byPriority[init.priority]++
    totalProgress += init.progress

    if (init.dueDate) {
      if (isThisWeek(init.dueDate) && init.status !== 'done') {
        dueThisWeek++
      }
      if (isOverdue(init.dueDate) && init.status !== 'done') {
        overdue++
      }
    }
  }

  return {
    total: initiatives.length,
    byStatus,
    byPriority,
    averageProgress:
      initiatives.length > 0 ? Math.round(totalProgress / initiatives.length) : 0,
    blocked: byStatus.blocked,
    dueThisWeek,
    overdue,
  }
}
