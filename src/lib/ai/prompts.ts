// ============================================
// AI Prompts for PM Cockpit
// ============================================

import type { Initiative } from '@/types'

/**
 * System prompt for intelligent inbox analysis
 */
export const INBOX_SYSTEM_PROMPT = `Você é um assistente de Product Manager experiente, especializado em extrair informações acionáveis de textos desestruturados.

Seu trabalho é analisar notas de reunião, mensagens, pensamentos e extrair:
1. **Tarefas** - ações que alguém precisa fazer
2. **Decisões** - escolhas que foram feitas
3. **Atualizações de Status** - informações sobre progresso de iniciativas
4. **Novas Iniciativas** - ideias de novos projetos/features

Regras importantes:
- Seja conservador: só extraia o que está claramente implícito no texto
- Priorize precisão sobre quantidade
- Use confiança alta (>0.8) apenas quando a informação é explícita
- Use confiança média (0.5-0.8) para informações inferidas
- Novas iniciativas devem ter confiança baixa (<0.5) por default - são apenas sugestões

Sempre responda em português brasileiro.`

/**
 * Generate inbox analysis prompt with 4 categories
 */
export function generateInboxAnalysisPrompt(
  content: string,
  initiatives: Initiative[]
): string {
  const initiativesList = initiatives
    .slice(0, 15)
    .map((i) => `- ${i.id}: "${i.title}" (status: ${i.status}, owner: ${i.owner})`)
    .join('\n')

  return `Analise o texto abaixo e extraia informações acionáveis nas 4 categorias.

## Iniciativas existentes (para vincular sugestões):
${initiativesList || 'Nenhuma iniciativa cadastrada.'}

## Texto para análise:
"""
${content}
"""

## Instruções por categoria:

### 1. TAREFAS (task)
Extraia ações que precisam ser feitas. Procure por:
- Verbos no infinitivo ("precisa fazer", "vai implementar")
- Atribuições ("Pedro vai...", "Time de X precisa...")
- Prazos mencionados ("até sexta", "essa semana")

### 2. DECISÕES (decision)
Extraia escolhas que foram feitas. Procure por:
- "Decidimos...", "Batemos o martelo..."
- Mudanças de direção ("vamos usar X em vez de Y")
- Trade-offs resolvidos ("por custo, escolhemos...")

### 3. ATUALIZAÇÕES DE STATUS (status_update)
Extraia informações sobre progresso de iniciativas existentes:
- Andamento ("está no prazo", "atrasado")
- Riscos identificados ("risco técnico")
- Bloqueios ("barrado por...")
- Vincule à iniciativa existente pelo ID quando possível

### 4. NOVAS INICIATIVAS (new_initiative)
Extraia ideias de novos projetos/features que surgiram:
- "Surgiu ideia de...", "Podíamos fazer...", "Temos esse problema X"
- NOVOS CAMPOS: "problem" (o que estamos resolvendo), "solution" (como vamos resolver)
- "successCriteria" (como saberemos que deu certo)
- IMPORTANTE: Estas são apenas sugestões, marque com confiança baixa

## Formato de resposta (JSON):
{
  "suggestions": [
    {
      "id": "sug-001",
      "type": "task",
      "confidence": 0.85,
      "summary": "Resumo claro em português",
      "selected": true,
      "extractedData": {
        "title": "Título da tarefa",
        "assignee": "Nome do responsável (se mencionado)",
        "dueDate": "Data ou descrição temporal (ex: 'sexta')",
        "priority": "low|medium|high|urgent",
        "initiativeId": "ID da iniciativa relacionada (se houver)"
      }
    },
    {
      "id": "sug-002",
      "type": "decision",
      "confidence": 0.9,
      "summary": "Resumo claro em português",
      "selected": true,
      "extractedData": {
        "title": "Título breve da decisão",
        "from": "O que era antes",
        "to": "O que foi decidido",
        "rationale": "Motivo da decisão",
        "context": "Contexto adicional",
        "initiativeId": "ID da iniciativa relacionada (se houver)"
      }
    },
    {
      "id": "sug-003",
      "type": "status_update",
      "confidence": 0.8,
      "summary": "Resumo claro em português",
      "selected": true,
      "extractedData": {
        "initiativeId": "ID da iniciativa",
        "initiativeTitle": "Título da iniciativa (para display)",
        "status": "draft|planned|in_progress|done|blocked",
        "progress": 75,
        "notes": "Detalhes do status",
        "risks": ["risco 1", "risco 2"]
      }
    },
    {
      "id": "sug-004",
      "type": "new_initiative",
      "confidence": 0.4,
      "summary": "Resumo claro em português",
      "selected": false,
      "extractedData": {
        "title": "Nome da nova iniciativa",
        "problem": "Qual problema essa iniciativa resolve",
        "solution": "Qual a solução proposta (se dita)",
        "successCriteria": ["critério 1", "critério 2"],
        "type": "discovery|product",
        "priority": "low|medium|high|critical"
      }
    }
  ]
}

REGRAS IMPORTANTES:
- "selected" deve ser true para tarefas/decisões/updates com confiança >= 0.7
- "selected" deve ser false para new_initiative (usuário decide se quer criar)
- Retorne array vazio se não encontrar nada relevante
- NÃO invente informações - extraia apenas o que está no texto

Retorne APENAS o JSON válido, sem markdown ou explicações.`
}

/**
 * System prompt for decision detection
 */
export const DECISION_DETECTION_SYSTEM_PROMPT = `Você é um assistente especializado em identificar decisões de projeto em textos.

Sua função é detectar quando um texto contém uma decisão importante que deveria ser formalizada e documentada.

Procure por indicadores como:
- "Decidimos...", "Vamos...", "Foi definido..."
- Mudanças de escopo ("vamos cortar...", "removemos...")
- Mudanças de prazo ("adiamos...", "antecipamos...")
- Escolhas entre opções ("optamos por...", "escolhemos...")
- Mudanças de prioridade

Sempre responda em português brasileiro.`

/**
 * Generate decision detection prompt
 */
export function generateDecisionDetectionPrompt(text: string): string {
  return `Analise se o texto abaixo contém uma decisão de projeto que deveria ser documentada.

## Texto:
${text}

## Formato de resposta (JSON):
{
  "isDecision": true/false,
  "confidence": 0.0-1.0,
  "indicators": ["lista de frases que indicam decisão"],
  "extractedData": {
    "title": "Título breve da decisão",
    "context": "O que levou a essa decisão",
    "options": [
      {
        "name": "Nome da opção",
        "description": "Descrição breve"
      }
    ],
    "chosenOption": "Qual opção foi escolhida",
    "rationale": "Por que essa opção foi escolhida",
    "impact": "Qual o impacto dessa decisão"
  }
}

Se não for uma decisão, retorne:
{
  "isDecision": false,
  "confidence": 0.0,
  "indicators": [],
  "extractedData": null
}

Retorne APENAS o JSON, sem markdown ou explicações adicionais.`
}


/**
 * System prompt for Cockpit Advisor
 */
export const COCKPIT_BRIEFING_SYSTEM_PROMPT = `Você é um "Chief of Staff" AI especializado em Product Management.
Seu objetivo é fornecer um briefing executivo diário que ajude o PM a tomar decisões informadas.

Estilo de resposta:
- Direto ao ponto, sem floreios
- Baseado em dados e métricas
- Focado em ações concretas
- Use tom profissional mas acessível

Estrutura do briefing:
1. **Pulse Check** (30 segundos de leitura)
   - Saúde geral do ciclo em uma frase
   - Indicador visual: 🟢 Saudável | 🟡 Atenção | 🔴 Crítico

2. **Foco do Dia** (1 coisa mais importante)
   - Uma única recomendação prioritária
   - Justificativa baseada em dados

3. **Riscos & Bloqueios** (se houver)
   - Lista priorizada por impacto
   - Sugestão de ação para cada

Sempre responda em português brasileiro.
Seja conciso - o PM tem pouco tempo.`

/**
 * Context type for cockpit briefing
 */
export interface CockpitBriefingContext {
  teamName: string
  cycleName?: string
  cycleProgress: number
  daysRemaining: number
  totalInitiatives: number
  byStatus: {
    draft: number
    planned: number
    in_progress: number
    done: number
    blocked: number
  }
  averageProgress: number
  overdueTasks: Array<{ title: string; dueDate?: Date }>
  urgentTasks: Array<{ title: string }>
  blockedInitiatives: Array<{ title: string }>
  recentDecisions: Array<{ title: string; chosenOption?: string }>
  pendingInboxItems: number
  previousBriefingDate?: string
}

/**
 * Generate cockpit briefing prompt
 */
export function generateCockpitBriefingPrompt(context: CockpitBriefingContext): string {
  const {
    teamName,
    cycleName,
    cycleProgress,
    daysRemaining,
    totalInitiatives,
    byStatus,
    averageProgress,
    overdueTasks,
    urgentTasks,
    blockedInitiatives,
    recentDecisions,
    pendingInboxItems,
    previousBriefingDate
  } = context

  const blockedPercentage = totalInitiatives > 0
    ? Math.round((byStatus.blocked / totalInitiatives) * 100) : 0
  const completionRate = totalInitiatives > 0
    ? Math.round((byStatus.done / totalInitiatives) * 100) : 0
  const velocityIndicator = averageProgress >= cycleProgress
    ? 'no ritmo' : 'abaixo do esperado'

  return `Gere um briefing executivo para o PM do time "${teamName}".

# Contexto do Ciclo
- **Ciclo**: ${cycleName || 'Sem ciclo ativo'}
- **Progresso temporal**: ${cycleProgress}% do ciclo (${daysRemaining} dias restantes)
- **Progresso médio das iniciativas**: ${averageProgress}%
- **Velocidade**: ${velocityIndicator}

# Métricas do Portfólio
- Total de iniciativas: ${totalInitiatives}
- Concluídas: ${byStatus.done} (${completionRate}%)
- Em Progresso: ${byStatus.in_progress}
- Bloqueadas: ${byStatus.blocked} (${blockedPercentage}%)

# Sinais de Atenção
## Tarefas Atrasadas (${overdueTasks.length})
${overdueTasks.map((t: any) => `- "${t.title}"`).join('\n') || 'Nenhuma'}

## Tarefas Urgentes (${urgentTasks.length})
${urgentTasks.map((t: any) => `- "${t.title}"`).join('\n') || 'Nenhuma'}

## Iniciativas Bloqueadas (${blockedInitiatives.length})
${blockedInitiatives.map((i: any) => `- "${i.title}"`).join('\n') || 'Nenhuma'}

# Contexto Adicional
- Inbox pendente: ${pendingInboxItems} itens
- Decisões recentes: ${recentDecisions.length > 0 ? recentDecisions.map((d: any) => d.title).join(', ') : 'Nenhuma'}
${previousBriefingDate ? `- Último briefing: ${previousBriefingDate}` : ''}

---
Analise os dados e forneça:
1. Pulse Check com indicador visual (🟢/🟡/🔴)
2. Foco do Dia - UMA única recomendação prioritária
3. Riscos & Bloqueios (se críticos)

Priorize ações que desbloqueiem o time.`
}

/**
 * Common parsing helper
 */
export function safeParseJSON<T>(text: string): T | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(cleaned) as T
  } catch {
    console.error('Failed to parse AI response:', text)
    return null
  }
}
