import { create } from 'zustand'
import type { DecisionRecord, DecisionOption } from '@/types'
import {
  parseDecision,
  serializeDecision,
  generateDecisionId,
  generateDecisionFilename,
} from '@/lib/markdown'
import { aiService, type DecisionDetectionResult } from '@/lib/ai'

// ============================================
// Decision Store
// ============================================

interface DecisionState {
  // Data
  decisions: DecisionRecord[]
  isLoading: boolean
  error: string | null

  // Actions
  loadDecisions: () => Promise<void>
  createDecision: (data: {
    title: string
    date?: Date
    context: string
    optionsConsidered: DecisionOption[]
    chosenOption: string
    rationale: string
    impact: string
    relatedInitiativeIds?: string[]
    relatedDecisionIds?: string[]
    stakeholdersInformed?: string[]
    sourceInboxItemId?: string
    createdBy: string
  }) => Promise<DecisionRecord>

  // Note: Decisions are immutable - no update/delete
  // We can only add new decisions or link them

  // AI Features
  detectDecisionInText: (text: string) => Promise<DecisionDetectionResult>
  quickDecisionCheck: (text: string) => Promise<{ isLikelyDecision: boolean; confidence: number }>

  // Queries
  getDecisionById: (id: string) => DecisionRecord | undefined
  getDecisionsForInitiative: (initiativeId: string) => DecisionRecord[]
  getRelatedDecisions: (decisionId: string) => DecisionRecord[]
  getRecentDecisions: (limit?: number) => DecisionRecord[]
  searchDecisions: (query: string) => DecisionRecord[]
}

export const useDecisionStore = create<DecisionState>((set, get) => ({
  // Initial state
  decisions: [],
  isLoading: false,
  error: null,

  // Load decisions from filesystem
  loadDecisions: async () => {
    set({ isLoading: true, error: null })

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const api = window.electronAPI
      const decisions: DecisionRecord[] = []

      // Check if decisions folder exists
      const decisionsExists = await api.fs.exists('decisions')
      if (!decisionsExists) {
        await api.fs.createDirectory('decisions')
      }

      // Load decision files
      const entries = await api.fs.readDirectory('decisions')
      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          try {
            const content = await api.fs.readFile(entry.path)
            const decision = parseDecision(content, entry.path)
            decisions.push(decision)
          } catch {
            console.warn(`Failed to parse decision: ${entry.path}`)
          }
        }
      }

      // Sort by date (newest first)
      decisions.sort((a, b) => b.date.getTime() - a.date.getTime())

      set({ decisions, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load decisions',
        isLoading: false,
      })
    }
  },

  // Create new decision (decisions are immutable once created)
  createDecision: async (data) => {
    const state = get()
    const existingIds = state.decisions.map((d) => d.id)
    const newId = generateDecisionId(existingIds)
    const fileName = generateDecisionFilename(newId, data.title)
    const filePath = `decisions/${fileName}`

    const decision: DecisionRecord = {
      id: newId,
      title: data.title,
      date: data.date || new Date(),
      context: data.context,
      optionsConsidered: data.optionsConsidered,
      chosenOption: data.chosenOption,
      rationale: data.rationale,
      impact: data.impact,
      relatedInitiativeIds: data.relatedInitiativeIds || [],
      relatedDecisionIds: data.relatedDecisionIds || [],
      stakeholdersInformed: data.stakeholdersInformed || [],
      sourceInboxItemId: data.sourceInboxItemId,
      createdAt: new Date(),
      createdBy: data.createdBy,
      filePath,
    }

    const content = serializeDecision(decision)
    await window.electronAPI.fs.writeFile(filePath, content)

    // Add to state (newest first)
    set({ decisions: [decision, ...state.decisions] })

    return decision
  },

  // Detect decision in text using AI
  detectDecisionInText: async (text) => {
    if (!aiService.isConfigured()) {
      throw new Error('Serviço de IA não configurado. Adicione sua chave API nas Configurações.')
    }

    return await aiService.detectDecision(text)
  },

  // Quick decision check (uses heuristics + AI if available)
  quickDecisionCheck: async (text) => {
    return await aiService.quickDecisionCheck(text)
  },

  // Get decision by ID
  getDecisionById: (id) => {
    const state = get()
    return state.decisions.find((d) => d.id === id)
  },

  // Get all decisions related to an initiative
  getDecisionsForInitiative: (initiativeId) => {
    const state = get()
    return state.decisions.filter((d) =>
      d.relatedInitiativeIds.includes(initiativeId)
    )
  },

  // Get related decisions (by reference)
  getRelatedDecisions: (decisionId) => {
    const state = get()
    const decision = state.decisions.find((d) => d.id === decisionId)
    if (!decision) return []

    return state.decisions.filter((d) =>
      decision.relatedDecisionIds.includes(d.id)
    )
  },

  // Get recent decisions
  getRecentDecisions: (limit = 5) => {
    const state = get()
    return state.decisions.slice(0, limit)
  },

  // Search decisions by text
  searchDecisions: (query) => {
    const state = get()
    const lowerQuery = query.toLowerCase()

    return state.decisions.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.context.toLowerCase().includes(lowerQuery) ||
        d.rationale.toLowerCase().includes(lowerQuery) ||
        d.chosenOption.toLowerCase().includes(lowerQuery)
    )
  },
}))
