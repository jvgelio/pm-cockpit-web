import { create } from 'zustand'
import type {
  InboxItem,
  InboxItemSource,
  InboxItemStatus,
  InboxSuggestion,
  LegacyInboxSuggestion,
  TaskSuggestion,
  DecisionSuggestion,
  StatusUpdateSuggestion,
  NewInitiativeSuggestion,
  Initiative,
  InitiativeStatus,
  InboxAIHistoryEntry,
} from '@/types'
import {
  parseInboxItem,
  serializeInboxItem,
  generateInboxItemId,
  generateInboxFilename,
} from '@/lib/markdown'
import { aiService } from '@/lib/ai'
import { useTasksStore } from './tasksStore'
import { useDecisionStore } from './decisionStore'
import { useAppStore } from './appStore'

// ============================================
// Inbox Store
// ============================================

interface InboxState {
  // Data
  inboxItems: InboxItem[]
  aiHistory: InboxAIHistoryEntry[]
  processingItemId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  loadInboxItems: () => Promise<void>
  loadAIHistory: () => Promise<void>
  addAIHistoryEntry: (entry: Omit<InboxAIHistoryEntry, 'id' | 'timestamp'>) => Promise<string>
  updateAIHistoryEntry: (id: string, updates: Partial<InboxAIHistoryEntry>) => Promise<void>
  createInboxItem: (
    content: string,
    title: string,
    source?: InboxItemSource
  ) => Promise<InboxItem>
  updateInboxItem: (id: string, updates: Partial<InboxItem>) => Promise<void>
  deleteInboxItem: (id: string) => Promise<void>
  archiveInboxItem: (id: string) => Promise<void>

  // AI Processing
  setProcessingItem: (id: string | null) => void
  processWithAI: (itemId: string, initiatives: Initiative[]) => Promise<void>
  processContentWithAI: (content: string, initiatives: Initiative[]) => Promise<InboxSuggestion[]>
  addSuggestions: (itemId: string, suggestions: LegacyInboxSuggestion[]) => Promise<void>
  acceptSuggestion: (itemId: string, suggestionId: string) => Promise<void>
  dismissSuggestion: (
    itemId: string,
    suggestionId: string,
    reason?: string
  ) => Promise<void>

  // Confirm suggestions and create entities
  confirmSuggestions: (suggestions: InboxSuggestion[], sourceInboxItemId?: string) => Promise<{
    tasksCreated: number
    decisionsCreated: number
    initiativesUpdated: number
    initiativesCreated: number
  }>

  // Helpers
  getPendingItems: () => InboxItem[]
  getProcessedItems: () => InboxItem[]
}

export const useInboxStore = create<InboxState>((set, get) => ({
  // Initial state
  inboxItems: [],
  aiHistory: [],
  processingItemId: null,
  isLoading: false,
  error: null,

  // Load inbox items from filesystem
  loadInboxItems: async () => {
    set({ isLoading: true, error: null })

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const api = window.electronAPI
      const items: InboxItem[] = []

      // Check if inbox folder exists
      const inboxExists = await api.fs.exists('inbox')
      if (!inboxExists) {
        // Create inbox folder structure
        await api.fs.createDirectory('inbox')
        await api.fs.createDirectory('inbox/_inbox-items')
        await api.fs.createDirectory('inbox/_processed')
      }

      // Load AI History
      await get().loadAIHistory()

      // Load pending items
      const pendingPath = 'inbox/_inbox-items'
      const pendingExists = await api.fs.exists(pendingPath)
      if (pendingExists) {
        const entries = await api.fs.readDirectory(pendingPath)
        for (const entry of entries) {
          if (entry.isFile && entry.name.endsWith('.md')) {
            try {
              const content = await api.fs.readFile(entry.path)
              const item = parseInboxItem(content, entry.path)
              items.push(item)
            } catch {
              console.warn(`Failed to parse inbox item: ${entry.path}`)
            }
          }
        }
      }

      // Sort by creation date (newest first)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      set({ inboxItems: items, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load inbox',
        isLoading: false,
      })
    }
  },

  // Load AI history from filesystem
  loadAIHistory: async () => {
    try {
      const api = window.electronAPI
      const historyPath = 'inbox/ai-history.json'
      const historyExists = await api.fs.exists(historyPath)

      if (historyExists) {
        const content = await api.fs.readFile(historyPath)
        const history = JSON.parse(content) as InboxAIHistoryEntry[]
        // Convert ISO strings back to Date objects
        const parsedHistory = history.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
        set({ aiHistory: parsedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) })
      }
    } catch (error) {
      console.error('Failed to load AI history:', error)
    }
  },

  // Save AI history to filesystem
  addAIHistoryEntry: async (entryData) => {
    const state = get()
    const newEntry: InboxAIHistoryEntry = {
      ...entryData,
      id: `hist-${Date.now()}`,
      timestamp: new Date(),
    }

    const updatedHistory = [newEntry, ...state.aiHistory]
    set({ aiHistory: updatedHistory })

    try {
      const historyPath = 'inbox/ai-history.json'
      await window.electronAPI.fs.writeFile(historyPath, JSON.stringify(updatedHistory, null, 2))
    } catch (error) {
      console.error('Failed to save AI history:', error)
    }

    return newEntry.id
  },

  updateAIHistoryEntry: async (id, updates) => {
    const state = get()
    const updatedHistory = state.aiHistory.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )

    set({ aiHistory: updatedHistory })

    try {
      const historyPath = 'inbox/ai-history.json'
      await window.electronAPI.fs.writeFile(historyPath, JSON.stringify(updatedHistory, null, 2))
    } catch (error) {
      console.error('Failed to save AI history:', error)
    }
  },

  // Create new inbox item
  createInboxItem: async (content, title, source = 'manual') => {
    const state = get()
    const existingIds = state.inboxItems.map((i) => i.id)
    const newId = generateInboxItemId(existingIds)
    const fileName = generateInboxFilename(newId, title)
    const filePath = `inbox/_inbox-items/${fileName}`

    const item: InboxItem = {
      id: newId,
      title,
      rawContent: content,
      source,
      createdAt: new Date(),
      status: 'pending',
      suggestions: [],
      filePath,
    }

    const fileContent = serializeInboxItem(item)
    await window.electronAPI.fs.writeFile(filePath, fileContent)

    set({ inboxItems: [item, ...state.inboxItems] })
    return item
  },

  // Update inbox item
  updateInboxItem: async (id, updates) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === id)
    if (!item) return

    const updated = { ...item, ...updates }
    const content = serializeInboxItem(updated)
    await window.electronAPI.fs.writeFile(item.filePath, content)

    set({
      inboxItems: state.inboxItems.map((i) => (i.id === id ? updated : i)),
    })
  },

  // Delete inbox item
  deleteInboxItem: async (id) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === id)
    if (!item) return

    await window.electronAPI.fs.deleteFile(item.filePath)
    set({ inboxItems: state.inboxItems.filter((i) => i.id !== id) })
  },

  // Archive inbox item (move to processed folder)
  archiveInboxItem: async (id) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === id)
    if (!item) return

    const fileName = item.filePath.split('/').pop()
    const newPath = `inbox/_processed/${fileName}`

    const updated: InboxItem = {
      ...item,
      status: 'triaged',
      filePath: newPath,
    }

    const content = serializeInboxItem(updated)
    await window.electronAPI.fs.writeFile(newPath, content)
    await window.electronAPI.fs.deleteFile(item.filePath)

    set({ inboxItems: state.inboxItems.filter((i) => i.id !== id) })
  },

  // Set processing state
  setProcessingItem: (id) => {
    set({ processingItemId: id })
    if (id) {
      const state = get()
      const item = state.inboxItems.find((i) => i.id === id)
      if (item) {
        get().updateInboxItem(id, { status: 'processing' })
      }
    }
  },

  // Process inbox item with AI
  processWithAI: async (itemId, initiatives) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === itemId)
    if (!item) return

    // Set processing state
    set({ processingItemId: itemId })
    await get().updateInboxItem(itemId, { status: 'processing' })

    try {
      // Check if AI service is configured
      if (!aiService.isConfigured()) {
        throw new Error('Serviço de IA não configurado. Adicione sua chave API nas Configurações.')
      }

      // Get settings for history logging
      const appSettings = useAppStore.getState().settings

      // Call AI service
      const result = await aiService.analyzeInboxContent(item.rawContent, initiatives)

      // Log success
      await get().addAIHistoryEntry({
        status: 'success',
        contentPreview: item.rawContent.substring(0, 200),
        provider: appSettings.llmProvider,
        model: appSettings.llmModel,
        suggestionsCount: result.suggestions?.length || 0,
      })

      // Add suggestions to the item (convert to legacy format)
      if (result.suggestions && result.suggestions.length > 0) {
        const legacySuggestions: LegacyInboxSuggestion[] = result.suggestions.map((s) => ({
          id: s.id || `sug-${Date.now()}`,
          type: 'todo_item' as const, // Default legacy type
          confidence: s.confidence || 0.5,
          summary: s.summary || '',
          extractedData: s.extractedData || {},
        }))
        await get().addSuggestions(itemId, legacySuggestions)
      } else {
        // No suggestions found, mark as processed
        await get().updateInboxItem(itemId, { status: 'pending' })
        set({ processingItemId: null })
      }
    } catch (error) {
      console.error('AI processing error:', error)

      // Log error
      const appSettings = useAppStore.getState().settings
      await get().addAIHistoryEntry({
        status: 'error',
        contentPreview: item.rawContent.substring(0, 200),
        provider: appSettings.llmProvider,
        model: appSettings.llmModel,
        suggestionsCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      })

      // Reset status on error
      await get().updateInboxItem(itemId, { status: 'pending' })
      set({
        processingItemId: null,
        error: error instanceof Error ? error.message : 'Erro ao processar com IA'
      })
      throw error
    }
  },

  // Process content directly with AI (without creating inbox item)
  processContentWithAI: async (content, initiatives) => {
    // Check if AI service is configured
    if (!aiService.isConfigured()) {
      throw new Error('Serviço de IA não configurado. Adicione sua chave API nas Configurações.')
    }

    try {
      const result = await aiService.analyzeInboxContent(content, initiatives)

      // Log success
      const appSettings = useAppStore.getState().settings
      await get().addAIHistoryEntry({
        status: 'success',
        contentPreview: content.substring(0, 200),
        provider: appSettings.llmProvider,
        model: appSettings.llmModel,
        suggestionsCount: result.suggestions?.length || 0,
      })

      return (result.suggestions || []) as InboxSuggestion[]
    } catch (error) {
      console.error('AI processing error:', error)

      // Log error
      const appSettings = useAppStore.getState().settings
      await get().addAIHistoryEntry({
        status: 'error',
        contentPreview: content.substring(0, 200),
        provider: appSettings.llmProvider,
        model: appSettings.llmModel,
        suggestionsCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      })

      throw error
    }
  },

  // Add AI suggestions to item
  addSuggestions: async (itemId, suggestions) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === itemId)
    if (!item) return

    const updated: InboxItem = {
      ...item,
      suggestions: [...(item.suggestions || []), ...suggestions],
      status: 'pending',
    }

    const content = serializeInboxItem(updated)
    await window.electronAPI.fs.writeFile(item.filePath, content)

    set({
      inboxItems: state.inboxItems.map((i) => (i.id === itemId ? updated : i)),
      processingItemId: null,
    })
  },

  // Accept a suggestion
  acceptSuggestion: async (itemId, suggestionId) => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === itemId)
    if (!item) return

    const suggestions = item.suggestions?.map((s) =>
      s.id === suggestionId ? { ...s, accepted: true } : s
    )

    const allHandled = suggestions?.every((s) => s.accepted || s.rejectedReason)
    const newStatus: InboxItemStatus = allHandled ? 'triaged' : item.status

    await get().updateInboxItem(itemId, { suggestions, status: newStatus })

    // If all suggestions handled, archive the item
    if (allHandled) {
      await get().archiveInboxItem(itemId)
    }
  },

  // Dismiss a suggestion
  dismissSuggestion: async (itemId, suggestionId, reason = '') => {
    const state = get()
    const item = state.inboxItems.find((i) => i.id === itemId)
    if (!item) return

    const suggestions = item.suggestions?.map((s) =>
      s.id === suggestionId ? { ...s, rejectedReason: reason || 'dismissed' } : s
    )

    const allHandled = suggestions?.every((s) => s.accepted || s.rejectedReason)
    const newStatus: InboxItemStatus = allHandled ? 'triaged' : item.status

    await get().updateInboxItem(itemId, { suggestions, status: newStatus })

    // If all suggestions handled, archive the item
    if (allHandled) {
      await get().archiveInboxItem(itemId)
    }
  },

  // Confirm suggestions and create entities
  confirmSuggestions: async (suggestions, sourceInboxItemId) => {
    const results = {
      tasksCreated: 0,
      decisionsCreated: 0,
      initiativesUpdated: 0,
      initiativesCreated: 0,
    }

    // Get stores
    const tasksStore = useTasksStore.getState()
    const decisionStore = useDecisionStore.getState()
    const appStore = useAppStore.getState()

    // Filter only selected suggestions
    const selectedSuggestions = suggestions.filter((s) => s.selected)

    for (const suggestion of selectedSuggestions) {
      try {
        switch (suggestion.type) {
          case 'task': {
            const taskSuggestion = suggestion as TaskSuggestion
            const data = taskSuggestion.extractedData

            // Parse due date if provided
            let dueDate: Date | undefined
            if (data.dueDate) {
              dueDate = parseFuzzyDate(data.dueDate)
            }

            await tasksStore.createTask({
              title: data.title,
              description: taskSuggestion.summary,
              priority: data.priority || 'medium',
              dueDate,
              initiativeId: data.initiativeId,
              tags: ['inbox'],
            })
            results.tasksCreated++
            break
          }

          case 'decision': {
            const decisionSuggestion = suggestion as DecisionSuggestion
            const data = decisionSuggestion.extractedData

            await decisionStore.createDecision({
              title: data.title,
              context: data.context || decisionSuggestion.summary,
              optionsConsidered: [
                { name: data.from, description: 'Opção anterior', pros: [], cons: [] },
                { name: data.to, description: 'Opção escolhida', pros: [], cons: [] },
              ],
              chosenOption: data.to,
              rationale: data.rationale,
              impact: '',
              relatedInitiativeIds: data.initiativeId ? [data.initiativeId] : [],
              sourceInboxItemId,
              createdBy: 'Inbox Inteligente',
            })
            results.decisionsCreated++
            break
          }

          case 'status_update': {
            const updateSuggestion = suggestion as StatusUpdateSuggestion
            const data = updateSuggestion.extractedData

            if (data.initiativeId) {
              // Prepare update object
              const updates: Partial<Initiative> = {}

              if (data.status) {
                updates.status = data.status as InitiativeStatus
              }
              if (typeof data.progress === 'number') {
                updates.progress = data.progress
              }
              if (data.notes) {
                // Append notes
                const existingInitiative = appStore.initiatives.find(
                  (i) => i.id === data.initiativeId
                )
                const existingNotes = existingInitiative?.notes || ''
                const timestamp = new Date().toLocaleDateString('pt-BR')
                updates.notes = existingNotes
                  ? `${existingNotes}\n\n---\n**${timestamp}**: ${data.notes}`
                  : `**${timestamp}**: ${data.notes}`
              }

              await appStore.updateInitiative(data.initiativeId, updates)
              results.initiativesUpdated++
            }
            break
          }

          case 'new_initiative': {
            const newInitSuggestion = suggestion as NewInitiativeSuggestion
            const data = newInitSuggestion.extractedData

            // Create in backlog (cycleId = null)
            const currentTeam = appStore.currentTeam
            if (currentTeam && currentTeam.products.length > 0) {
              await appStore.createInitiative({
                title: data.title,
                team: currentTeam.id,
                product: currentTeam.products[0].id,
                type: data.type || 'product',
                status: 'draft',
                priority: data.priority || 'medium',
                owner: '',
                progress: 0,
                tags: ['inbox', 'sugestão-ia'],
                dependencies: [],
                problem: data.problem,
                solution: data.solution,
                successCriteria: data.successCriteria || [],
                cycleId: null, // Backlog
              })
              results.initiativesCreated++
            }
            break
          }
        }
      } catch (error) {
        console.error(`Failed to process suggestion ${suggestion.id}:`, error)
      }
    }

    // If this came from a fresh analysis, we could update the last history entry
    // But since confirmSuggestions might be called much later, we'll just check if there's a recent successful entry
    const history = get().aiHistory
    if (history.length > 0 && results.tasksCreated + results.decisionsCreated + results.initiativesUpdated + results.initiativesCreated > 0) {
      // Update the most recent entry if it's within the last 5 minutes (likely the same flow)
      const mostRecent = history[0]
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

      if (mostRecent.status === 'success' && mostRecent.timestamp > fiveMinutesAgo) {
        await get().updateAIHistoryEntry(mostRecent.id, {
          entitiesCreated: {
            tasks: (mostRecent.entitiesCreated?.tasks || 0) + results.tasksCreated,
            decisions: (mostRecent.entitiesCreated?.decisions || 0) + results.decisionsCreated,
            initiativesUpdated: (mostRecent.entitiesCreated?.initiativesUpdated || 0) + results.initiativesUpdated,
            initiativesCreated: (mostRecent.entitiesCreated?.initiativesCreated || 0) + results.initiativesCreated,
          }
        })
      }
    }

    return results
  },

  // Get pending items
  getPendingItems: () => {
    const state = get()
    return state.inboxItems.filter(
      (i) => i.status === 'pending' || i.status === 'processing'
    )
  },

  // Get processed items
  getProcessedItems: () => {
    const state = get()
    return state.inboxItems.filter((i) => i.status === 'triaged')
  },
}))

// Helper to parse fuzzy dates like "sexta", "próxima semana", etc.
function parseFuzzyDate(input: string): Date | undefined {
  const now = new Date()
  const lowered = input.toLowerCase().trim()

  // ISO date format
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    return new Date(input)
  }

  // PT-BR date format (dd/mm/yyyy)
  const brDate = lowered.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (brDate) {
    const day = parseInt(brDate[1])
    const month = parseInt(brDate[2]) - 1
    const year = brDate[3] ? parseInt(brDate[3]) : now.getFullYear()
    return new Date(year, month, day)
  }

  // Day of week
  const daysOfWeek: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    terça: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    sábado: 6,
  }

  for (const [dayName, dayNum] of Object.entries(daysOfWeek)) {
    if (lowered.includes(dayName)) {
      const currentDay = now.getDay()
      let daysUntil = dayNum - currentDay
      if (daysUntil <= 0) daysUntil += 7
      const result = new Date(now)
      result.setDate(result.getDate() + daysUntil)
      return result
    }
  }

  // Relative
  if (lowered.includes('hoje')) {
    return now
  }
  if (lowered.includes('amanhã') || lowered.includes('amanha')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }
  if (lowered.includes('próxima semana') || lowered.includes('proxima semana')) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  }

  return undefined
}
