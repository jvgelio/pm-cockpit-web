// AI Service exports
export { aiService, AIService } from './aiService'
export type {
  AIProvider,
  AIServiceConfig,
  InboxAnalysisResult,
  DecisionDetectionResult,
} from './aiService'
export {
  INBOX_SYSTEM_PROMPT,
  DECISION_DETECTION_SYSTEM_PROMPT,
  generateInboxAnalysisPrompt,
  generateDecisionDetectionPrompt,
  safeParseJSON,
} from './prompts'
