import yaml from 'js-yaml'
import { marked } from 'marked'
import type {
  Team,
  Cycle,
  Initiative,
  TeamFrontmatter,
  CycleFrontmatter,
  InitiativeFrontmatter,
  ParsedMarkdown,
  InboxItem,
  InboxFrontmatter,
  DecisionRecord,
  DecisionFrontmatter,
  DecisionOption,
  Task,
  TaskFrontmatter,
} from '@/types'

// ============================================
// Markdown Parsing Utilities
// ============================================

/**
 * Parse frontmatter from markdown content
 * Compatible with browser (no fs module needed)
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { data: {}, content: content.trim() }
  }

  try {
    const data = yaml.load(match[1]) as Record<string, unknown>
    return { data: data || {}, content: match[2].trim() }
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error)
    return { data: {}, content: content.trim() }
  }
}

/**
 * Serialize data to frontmatter format
 */
function stringifyFrontmatter(data: Record<string, unknown>, content: string): string {
  const yamlStr = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  })
  return `---\n${yamlStr}---\n\n${content}`
}

/**
 * Parse a markdown file with frontmatter
 */
export function parseMarkdown<T>(
  content: string,
  filePath: string
): ParsedMarkdown<T> {
  const { data, content: body } = parseFrontmatter(content)
  return {
    frontmatter: data as T,
    content: body,
    filePath,
  }
}

/**
 * Serialize frontmatter and content back to markdown
 */
export function serializeMarkdown(
  frontmatter: object,
  content: string
): string {
  return stringifyFrontmatter(frontmatter as Record<string, unknown>, content)
}

/**
 * Convert markdown content to HTML
 */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string
}

// ============================================
// Entity Parsers
// ============================================

/**
 * Parse a team markdown file
 */
export function parseTeam(content: string, filePath: string): Team {
  const parsed = parseMarkdown<TeamFrontmatter>(content, filePath)
  const { frontmatter, content: description } = parsed

  return {
    id: frontmatter.id,
    name: frontmatter.name,
    products: (frontmatter.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status || 'active',
    })),
    description: description || undefined,
    filePath,
  }
}

/**
 * Parse a cycle metadata file (_cycle.md)
 */
export function parseCycle(
  content: string,
  filePath: string,
  folderPath: string
): Cycle {
  const parsed = parseMarkdown<CycleFrontmatter>(content, filePath)
  const { frontmatter, content: description } = parsed

  return {
    id: frontmatter.id,
    name: frontmatter.name,
    start: new Date(frontmatter.start),
    end: new Date(frontmatter.end),
    status: frontmatter.status || 'planning',
    goals: frontmatter.goals || [],
    description: description || undefined,
    filePath,
    folderPath,
  }
}

/**
 * Parse an initiative markdown file
 */
export function parseInitiative(
  content: string,
  filePath: string,
  cycleId: string | null
): Initiative {
  const parsed = parseMarkdown<InitiativeFrontmatter>(content, filePath)
  const { frontmatter, content: body } = parsed

  // Extract sections from content
  const sections = extractSections(body)

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    team: frontmatter.team,
    product: frontmatter.product,
    type: frontmatter.type || 'product',
    status: frontmatter.status || 'draft',
    priority: frontmatter.priority || 'medium',
    owner: frontmatter.owner || '',
    startDate: frontmatter.start_date
      ? new Date(frontmatter.start_date)
      : undefined,
    dueDate: frontmatter.due_date ? new Date(frontmatter.due_date) : undefined,
    progress: frontmatter.progress || 0,
    jiraEpic: frontmatter.jira_epic,
    tags: frontmatter.tags || [],
    dependencies: frontmatter.dependencies || [],
    problem: sections.problema || sections.problem,
    solution: sections['solução proposta'] || sections.solution,
    successCriteria: extractChecklist(
      sections['critérios de sucesso'] || sections['success criteria'] || ''
    ),
    notes: sections.notas || sections.notes,
    filePath,
    cycleId,
  }
}

// ============================================
// Serializers
// ============================================

/**
 * Serialize an initiative back to markdown
 */
export function serializeInitiative(initiative: Initiative): string {
  const frontmatter: InitiativeFrontmatter = {
    id: initiative.id,
    title: initiative.title,
    team: initiative.team,
    product: initiative.product,
    type: initiative.type,
    status: initiative.status,
    priority: initiative.priority,
    owner: initiative.owner,
    progress: initiative.progress,
    tags: initiative.tags,
    dependencies: initiative.dependencies,
  }

  // Add optional fields
  if (initiative.startDate) {
    frontmatter.start_date = initiative.startDate.toISOString().split('T')[0]
  }
  if (initiative.dueDate) {
    frontmatter.due_date = initiative.dueDate.toISOString().split('T')[0]
  }
  if (initiative.jiraEpic) {
    frontmatter.jira_epic = initiative.jiraEpic
  }

  // Build content
  const sections: string[] = []

  if (initiative.problem) {
    sections.push(`## Problema\n${initiative.problem}`)
  }

  if (initiative.solution) {
    sections.push(`## Solução Proposta\n${initiative.solution}`)
  }

  if (initiative.successCriteria && initiative.successCriteria.length > 0) {
    const criteria = initiative.successCriteria
      .map((c) => `- [ ] ${c}`)
      .join('\n')
    sections.push(`## Critérios de Sucesso\n${criteria}`)
  }

  if (initiative.notes) {
    sections.push(`## Notas\n${initiative.notes}`)
  }

  const content = sections.join('\n\n')
  return serializeMarkdown(frontmatter, content)
}

/**
 * Serialize a team back to markdown
 */
export function serializeTeam(team: Team): string {
  const frontmatter: TeamFrontmatter = {
    id: team.id,
    name: team.name,
    products: team.products.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    })),
  }

  return serializeMarkdown(frontmatter, team.description || '')
}

/**
 * Serialize a cycle back to markdown
 */
export function serializeCycle(cycle: Cycle): string {
  const frontmatter: CycleFrontmatter = {
    id: cycle.id,
    name: cycle.name,
    start: cycle.start.toISOString().split('T')[0],
    end: cycle.end.toISOString().split('T')[0],
    status: cycle.status,
    goals: cycle.goals,
  }

  return serializeMarkdown(frontmatter, cycle.description || '')
}

// ============================================
// Content Extraction Helpers
// ============================================

/**
 * Extract sections from markdown content based on ## headings
 */
function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = content.split('\n')

  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join('\n').trim()
      }
      // Start new section
      currentSection = headingMatch[1]
      currentContent = []
    } else if (currentSection) {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection.toLowerCase()] = currentContent.join('\n').trim()
  }

  return sections
}

/**
 * Extract checklist items from markdown
 */
function extractChecklist(content: string): string[] {
  const items: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^-\s*\[[ x]\]\s*(.+)$/)
    if (match) {
      items.push(match[1].trim())
    }
  }

  return items
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a new initiative ID
 */
export function generateInitiativeId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = id.match(/^ini-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `ini-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generate a filename from initiative title
 */
export function generateInitiativeFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  return `${id}-${slug}.md`
}

// ============================================
// Inbox Item Parsers & Serializers
// ============================================

/**
 * Parse an inbox item markdown file
 */
export function parseInboxItem(content: string, filePath: string): InboxItem {
  const parsed = parseMarkdown<InboxFrontmatter>(content, filePath)
  const { frontmatter, content: rawContent } = parsed

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    rawContent: rawContent,
    source: frontmatter.source || 'manual',
    createdAt: new Date(frontmatter.created_at),
    status: frontmatter.status || 'pending',
    suggestions: frontmatter.suggestions || [],
    filePath,
  }
}

/**
 * Serialize an inbox item back to markdown
 */
export function serializeInboxItem(item: InboxItem): string {
  const frontmatter: InboxFrontmatter = {
    id: item.id,
    title: item.title,
    source: item.source,
    created_at: item.createdAt.toISOString(),
    status: item.status,
  }

  // Add suggestions if present
  if (item.suggestions && item.suggestions.length > 0) {
    frontmatter.suggestions = item.suggestions
  }

  return serializeMarkdown(frontmatter, item.rawContent)
}

/**
 * Generate a new inbox item ID
 */
export function generateInboxItemId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = id.match(/^ibx-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `ibx-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generate a filename for inbox item
 */
export function generateInboxFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  return `${id}-${slug}.md`
}

// ============================================
// Decision Record Parsers & Serializers
// ============================================

/**
 * Parse a decision record markdown file
 */
export function parseDecision(content: string, filePath: string): DecisionRecord {
  const parsed = parseMarkdown<DecisionFrontmatter>(content, filePath)
  const { frontmatter, content: body } = parsed

  // Extract sections from body
  const sections = extractSections(body)

  // Parse options from the "Options Considered" section
  const optionsConsidered = extractDecisionOptions(sections['options considered'] || sections['opções consideradas'] || '')

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    date: new Date(frontmatter.date),
    context: sections['context'] || sections['contexto'] || '',
    optionsConsidered,
    chosenOption: frontmatter.chosen_option,
    rationale: sections['rationale'] || sections['justificativa'] || '',
    impact: sections['impact'] || sections['impacto'] || '',
    relatedInitiativeIds: frontmatter.related_initiatives || [],
    relatedDecisionIds: frontmatter.related_decisions || [],
    stakeholdersInformed: frontmatter.stakeholders_informed || [],
    sourceInboxItemId: frontmatter.source_inbox_item,
    createdAt: new Date(frontmatter.created_at),
    createdBy: frontmatter.created_by,
    filePath,
  }
}

/**
 * Extract decision options from markdown section
 */
function extractDecisionOptions(content: string): DecisionOption[] {
  const options: DecisionOption[] = []
  const optionBlocks = content.split(/^### /gm).slice(1)

  for (const block of optionBlocks) {
    const lines = block.trim().split('\n')
    const name = lines[0]?.replace(/^Option \d+:\s*/i, '').replace(/^Opção \d+:\s*/i, '').trim() || ''

    let description = ''
    const pros: string[] = []
    const cons: string[] = []
    let currentList: 'pros' | 'cons' | null = null

    for (const line of lines.slice(1)) {
      const trimmedLine = line.trim()

      if (trimmedLine.match(/^\*\*Pros?:\*\*/i) || trimmedLine.match(/^\*\*Vantagens?:\*\*/i)) {
        currentList = 'pros'
        continue
      }
      if (trimmedLine.match(/^\*\*Cons?:\*\*/i) || trimmedLine.match(/^\*\*Desvantagens?:\*\*/i)) {
        currentList = 'cons'
        continue
      }

      if (trimmedLine.startsWith('-')) {
        const item = trimmedLine.slice(1).trim()
        if (currentList === 'pros') {
          pros.push(item)
        } else if (currentList === 'cons') {
          cons.push(item)
        }
      } else if (!currentList && trimmedLine) {
        description += (description ? ' ' : '') + trimmedLine
      }
    }

    options.push({ name, description, pros, cons })
  }

  return options
}

/**
 * Serialize a decision record back to markdown
 */
export function serializeDecision(decision: DecisionRecord): string {
  const frontmatter: DecisionFrontmatter = {
    id: decision.id,
    title: decision.title,
    date: decision.date.toISOString().split('T')[0],
    chosen_option: decision.chosenOption,
    related_initiatives: decision.relatedInitiativeIds,
    related_decisions: decision.relatedDecisionIds,
    stakeholders_informed: decision.stakeholdersInformed,
    created_at: decision.createdAt.toISOString(),
    created_by: decision.createdBy,
  }

  if (decision.sourceInboxItemId) {
    frontmatter.source_inbox_item = decision.sourceInboxItemId
  }

  // Build content
  const sections: string[] = []

  sections.push(`## Contexto\n\n${decision.context}`)

  if (decision.optionsConsidered.length > 0) {
    sections.push('## Opções Consideradas\n')
    decision.optionsConsidered.forEach((opt, i) => {
      sections.push(`### Opção ${i + 1}: ${opt.name}`)
      if (opt.description) {
        sections.push(opt.description)
      }
      if (opt.pros.length > 0) {
        sections.push('**Vantagens:**')
        opt.pros.forEach((p) => sections.push(`- ${p}`))
      }
      if (opt.cons.length > 0) {
        sections.push('**Desvantagens:**')
        opt.cons.forEach((c) => sections.push(`- ${c}`))
      }
      sections.push('')
    })
  }

  sections.push(`## Justificativa\n\n${decision.rationale}`)
  sections.push(`## Impacto\n\n${decision.impact}`)

  return serializeMarkdown(frontmatter, sections.join('\n'))
}

/**
 * Generate a new decision ID
 */
export function generateDecisionId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = id.match(/^dec-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `dec-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generate a filename for decision record
 */
export function generateDecisionFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  return `${id}-${slug}.md`
}

// ============================================
// Task Parsers & Serializers
// ============================================

/**
 * Parse a task markdown file
 */
export function parseTask(content: string, filePath: string): Task {
  const parsed = parseMarkdown<TaskFrontmatter>(content, filePath)
  const { frontmatter, content: description } = parsed

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    description: description || undefined,
    status: frontmatter.status || 'pending',
    priority: frontmatter.priority || 'medium',
    dueDate: frontmatter.due_date ? new Date(frontmatter.due_date) : undefined,
    initiativeId: frontmatter.initiative_id,
    tags: frontmatter.tags || [],
    createdAt: new Date(frontmatter.created_at),
    completedAt: frontmatter.completed_at ? new Date(frontmatter.completed_at) : undefined,
    filePath,
  }
}

/**
 * Serialize a task back to markdown
 */
export function serializeTask(task: Task): string {
  const frontmatter: TaskFrontmatter = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    created_at: task.createdAt.toISOString(),
  }

  if (task.dueDate) {
    frontmatter.due_date = task.dueDate.toISOString().split('T')[0]
  }
  if (task.initiativeId) {
    frontmatter.initiative_id = task.initiativeId
  }
  if (task.completedAt) {
    frontmatter.completed_at = task.completedAt.toISOString()
  }

  return serializeMarkdown(frontmatter, task.description || '')
}

/**
 * Generate a new task ID
 */
export function generateTaskId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = id.match(/^task-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `task-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Generate a filename for task
 */
export function generateTaskFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  return `${id}-${slug}.md`
}

