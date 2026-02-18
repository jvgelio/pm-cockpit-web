// ============================================
// AI Service for PM Cockpit
// ============================================

import Anthropic from '@anthropic-ai/sdk'
import type {
  Initiative,
  InboxSuggestion,
} from '@/types'
import {
  INBOX_SYSTEM_PROMPT,
  DECISION_DETECTION_SYSTEM_PROMPT,
  COCKPIT_BRIEFING_SYSTEM_PROMPT,
  generateInboxAnalysisPrompt,
  generateDecisionDetectionPrompt,
  generateCockpitBriefingPrompt,
  safeParseJSON,
  type CockpitBriefingContext,
} from './prompts'

// ============================================
// Types
// ============================================

export type AIProvider = 'anthropic' | 'openrouter' | 'toqan'

export interface AIServiceConfig {
  apiKey: string
  model?: string
  provider?: AIProvider
}

export interface InboxAnalysisResult {
  suggestions: InboxSuggestion[]
}

export interface DecisionDetectionResult {
  isDecision: boolean
  confidence: number
  indicators: string[]
  extractedData: {
    title: string
    context: string
    options: Array<{ name: string; description: string }>
    chosenOption: string
    rationale: string
    impact: string
  } | null
}


// ============================================
// AI Service Class
// ============================================

class AIService {
  private client: Anthropic | null = null
  private apiKey: string = ''
  private model: string = 'claude-3-haiku-20240307'
  private provider: AIProvider = 'anthropic'

  /**
   * Configure the AI service with API key and provider
   */
  configure(config: AIServiceConfig): void {
    if (!config.apiKey) {
      console.warn('AI Service: No API key provided')
      return
    }

    this.apiKey = config.apiKey
    this.provider = config.provider || 'anthropic'

    if (config.model) {
      this.model = config.model
    }

    if (this.provider === 'anthropic') {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true, // Required for Electron renderer
      })
    } else {
      // For OpenRouter we use fetch directly, no Anthropic client needed
      this.client = null
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== ''
  }

  /**
   * Send a chat completion request via OpenRouter (OpenAI-compatible API)
   */
  private async openRouterChat(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pm-cockpit.app',
        'X-Title': 'PM Cockpit',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('Invalid response from OpenRouter')
    }
    return text
  }

  /**
   * Toqan API Implementation
   */
  private async createToqanConversation(
    userMessage: string
  ): Promise<{ conversation_id: string; request_id: string }> {
    const response = await fetch('https://api.toqan.ai/api/create_conversation', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        user_message: userMessage,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Toqan API error (${response.status}): ${errorBody}`)
    }

    return await response.json()
  }

  private async pollToqanAnswer(
    conversationId: string,
    requestId: string
  ): Promise<string> {
    const maxAttempts = 60 // 1 minute timeout (1s interval)
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(
        `https://api.toqan.ai/api/get_answer?conversation_id=${conversationId}&request_id=${requestId}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': '*/*',
          },
        }
      )

      if (!response.ok) {
        // If 404, it might be processing still, but usually it returns status 'processing'
        // Let's assume non-200 is bad unless 429
        if (response.status !== 429) {
          const errorBody = await response.text()
          throw new Error(`Toqan polling error (${response.status}): ${errorBody}`)
        }
      } else {
        const data = await response.json()
        if (data.status === 'finished') {
          return data.answer
        }
        // If failed or other terminal state
        if (data.status === 'failed' || data.status === 'error') {
          throw new Error(`Toqan request failed: ${data.error || 'Unknown error'}`)
        }
      }

      // Wait 1s
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }

    throw new Error('Toqan request timed out')
  }

  private async toqanChat(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    // Combine system prompt and user message because Toqan is agent-based
    // and we need to override/augment the agent's behavior for this specific task
    const combinedMessage = `${systemPrompt}\n\n---\n\n${userMessage}`

    const { conversation_id, request_id } = await this.createToqanConversation(combinedMessage)

    // In a real app we might want to store conversation_id to continue context,
    // but for this extraction task we treat it as one-off
    const answer = await this.pollToqanAnswer(conversation_id, request_id)

    // Toqan sometimes wraps answer in <think> tags, we should strip them or keep them depending on usage
    // For raw JSON extraction, we definitely need to clean it up, but safeParseJSON handles that globally
    // We'll leave it as is for now as safeParseJSON is robust
    return answer
  }

  /**
   * Send a message using the configured provider and return the text response
   */
  private async sendMessage(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number
  ): Promise<string> {
    if (this.provider === 'openrouter') {
      return this.openRouterChat(systemPrompt, userMessage, maxTokens)
    }

    if (this.provider === 'toqan') {
      return this.toqanChat(systemPrompt, userMessage)
    }

    // Anthropic provider
    if (!this.client) {
      throw new Error('AI Service not configured. Please add your API key in Settings.')
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Invalid response from AI')
    }
    return textContent.text
  }

  /**
   * Analyze inbox content and generate suggestions
   */
  async analyzeInboxContent(
    content: string,
    initiatives: Initiative[]
  ): Promise<InboxAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Service not configured. Please add your API key in Settings.')
    }

    const prompt = generateInboxAnalysisPrompt(content, initiatives)

    try {
      const text = await this.sendMessage(INBOX_SYSTEM_PROMPT, prompt, 2048)

      const result = safeParseJSON<InboxAnalysisResult>(text)
      if (!result) {
        throw new Error('Failed to parse AI response')
      }

      // Generate IDs for suggestions if not present
      result.suggestions = result.suggestions.map((s, i) => ({
        ...s,
        id: s.id || `sug-${Date.now()}-${i}`,
      }))

      return result
    } catch (error) {
      console.error('AI analysis error:', error)
      throw error
    }
  }

  /**
   * Detect if text contains a decision that should be documented
   */
  async detectDecision(text: string): Promise<DecisionDetectionResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Service not configured. Please add your API key in Settings.')
    }

    const prompt = generateDecisionDetectionPrompt(text)

    try {
      const responseText = await this.sendMessage(DECISION_DETECTION_SYSTEM_PROMPT, prompt, 1024)

      const result = safeParseJSON<DecisionDetectionResult>(responseText)
      if (!result) {
        return {
          isDecision: false,
          confidence: 0,
          indicators: [],
          extractedData: null,
        }
      }

      return result
    } catch (error) {
      console.error('Decision detection error:', error)
      throw error
    }
  }

  /**
   * Generate a cockpit briefing based on current context
   */
  async generateCockpitBriefing(context: CockpitBriefingContext): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI Service not configured.')
    }

    const prompt = generateCockpitBriefingPrompt(context)

    try {
      return await this.sendMessage(COCKPIT_BRIEFING_SYSTEM_PROMPT, prompt, 1024)
    } catch (error) {
      console.error('Briefing generation error:', error)
      throw error
    }
  }


  /**
   * Quick decision detection (without full extraction)
   * Useful for real-time detection while typing
   */
  async quickDecisionCheck(text: string): Promise<{
    isLikelyDecision: boolean
    confidence: number
  }> {
    // Simple heuristic check first
    const decisionIndicators = [
      /decid(imos|iu|i)/i,
      /vamos (cortar|remover|adiar|mudar|alterar)/i,
      /foi (definido|acordado|decidido)/i,
      /optamos por/i,
      /escolhemos/i,
      /a decisão (é|foi)/i,
      /resolvemos/i,
      /ficou decidido/i,
    ]

    const hasIndicator = decisionIndicators.some((regex) => regex.test(text))

    if (!hasIndicator) {
      return { isLikelyDecision: false, confidence: 0 }
    }

    // If we have an indicator, use AI for confirmation if available
    if (this.isConfigured() && text.length > 50) {
      try {
        const result = await this.detectDecision(text)
        return {
          isLikelyDecision: result.isDecision,
          confidence: result.confidence,
        }
      } catch {
        // Fall back to heuristic
        return { isLikelyDecision: true, confidence: 0.5 }
      }
    }

    return { isLikelyDecision: true, confidence: 0.6 }
  }
}

// Export singleton instance
export const aiService = new AIService()

// Export class for testing
export { AIService }
