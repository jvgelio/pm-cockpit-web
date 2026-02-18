# PRD: Inbox Inteligente & Processamento Assistido

## 1. Executive Summary

Estamos construindo uma **Inbox Inteligente com processamento assistido por IA** para Product Managers que precisam transformar rapidamente informações desestruturadas (notas de reunião, ideias soltas, updates verbais) em artefatos organizados (tasks, decisões, atualizações de status, novas iniciativas). A feature elimina o trabalho manual repetitivo de interpretar e distribuir informações entre diferentes seções do sistema, reduzindo sobrecarga cognitiva e garantindo que nenhuma informação importante se perca.

---

## 2. Problem Statement

### Quem tem esse problema?
Product Managers de todos os níveis (solo, em squad, leads) que lidam diariamente com alto volume de informações desestruturadas vindas de reuniões, conversas, Slack, emails e brainstorms.

### Qual é o problema?
PMs recebem muita informação ao longo do dia e não têm tempo para processá-la adequadamente. Notas de reunião ficam soltas, decisões não são documentadas, tasks não são criadas, e contexto importante se perde. O trabalho manual de interpretar cada nota e distribuir entre ferramentas/seções diferentes consome tempo e energia cognitiva.

### Por que é doloroso?
- **Perda de contexto:** Decisões tomadas em reuniões nunca são registradas formalmente
- **Tasks não criadas:** Action items mencionados verbalmente não viram tarefas rastreáveis
- **Sobrecarga cognitiva:** PM precisa interpretar, categorizar e distribuir cada pedaço de informação manualmente
- **Fragmentação:** Sem um ponto único de entrada, informações ficam espalhadas

### Evidência (Premissas)
- PMs gastam estimados **2-4 horas/semana** processando notas manualmente
- **~30% das decisões** tomadas em reuniões nunca são documentadas formalmente
- **~40% dos action items** mencionados verbalmente se perdem antes de virar tasks
- Feedback qualitativo: "Saio de reuniões com anotações, mas raramente tenho tempo de organizar tudo depois"

---

## 3. Target Users & Personas

### Persona Primária: PM Generalista

| Atributo | Descrição |
|----------|-----------|
| **Role** | Product Manager (qualquer nível) |
| **Contexto** | Ferramenta pessoal de gestão |
| **Volume** | 3-8 reuniões/dia, múltiplos projetos |
| **Tech savviness** | Médio-alto (confortável com ferramentas SaaS) |
| **Dor principal** | Sobrecarga de informação, falta de tempo para organizar |
| **Job-to-be-done** | "Quero capturar informações rapidamente e ter certeza que nada importante se perde" |

### Variações de Uso

| Perfil | Uso Principal |
|--------|---------------|
| **PM Solo** | Organização pessoal, não precisa compartilhar |
| **PM em Squad** | Documenta decisões para referência futura própria |
| **PM Lead** | Consolida informações de múltiplos projetos |

---

## 4. Strategic Context

### Business Goals
- Posicionar PM Cockpit como ferramenta **AI-first** para gestão de produto
- Diferenciar de competidores (Notion, Linear, Jira) com fluxo de captura inteligente
- Aumentar stickiness através de automação que economiza tempo real

### Por que agora?
1. **Maturidade de LLMs:** GPT-4, Claude 3.5 e modelos locais (Ollama) atingiram qualidade suficiente para parsing confiável de texto não-estruturado
2. **Tendência de mercado:** Ferramentas AI-first estão dominando; usuários esperam assistência inteligente
3. **Dogfooding:** O próprio criador precisa dessa feature para uso pessoal
4. **Baixo risco técnico:** Arquitetura de providers permite começar simples e expandir

### Landscape Competitivo
| Ferramenta | Abordagem |
|------------|-----------|
| Notion AI | Assistente genérico, não estrutura em artefatos específicos de PM |
| Linear | Foco em eng, não tem fluxo de captura para PMs |
| Craft | Bom para notas, mas sem parsing inteligente |
| **PM Cockpit** | Parsing específico para workflow de PM (tasks, decisions, initiatives) |

---

## 5. Solution Overview

### Visão Geral

Sistema de captura rápida com processamento assistido por IA que transforma texto livre em artefatos estruturados do PM Cockpit.

### Fluxo Principal

```
[1] PM abre Inbox (Ctrl+I)
         ↓
[2] Digita/cola texto livre (notas de reunião, ideias, updates)
         ↓
[3] Clica "Processar com IA"
         ↓
[4] Modal de Revisão aparece com sugestões categorizadas
         ↓
[5] PM revisa, edita, marca/desmarca itens
         ↓
[6] Clica "Confirmar" → itens são criados/atualizados
```

### Componentes

#### A. Configuração (Settings > AI & Automation)
- **Provider:** OpenAI, Anthropic, Ollama/Local
- **API Key:** Campo seguro para chave pessoal
- **Modelo:** Seleção do modelo (gpt-4o, claude-3-5-sonnet, etc.)

#### B. Inbox (Captura Rápida)
- Atalho global: `Ctrl+I`
- Campo de texto livre para "brain dump"
- Botão "Processar com IA"

#### C. Modal de Revisão (Review Mode)
IA categoriza o texto em até 4 tipos de sugestões:

| Categoria | Detecta | Output |
|-----------|---------|--------|
| **Task** | Ordens diretas, prazos, responsáveis | Tarefa em todo-list.md ou kanban |
| **Decision** | Mudanças, "batemos o martelo", escolhas | Entry em Decision Log da iniciativa |
| **Status Update** | Estado do projeto, riscos, progresso | Atualização de frontmatter + log |
| **Nova Iniciativa** | Ideias novas, "vamos investigar" | Novo arquivo de iniciativa |

Cada sugestão tem:
- Checkbox para incluir/excluir
- Preview do conteúdo estruturado
- Botão "Editar" para ajustes
- Destino (qual arquivo/seção será afetado)

#### D. Exemplo Real

**Input:**
> "Reunião Checkout: O time de infra barrou o uso do DynamoDB por custo, então batemos o martelo que vamos usar Postgres mesmo, já avisa o time. O Pedro precisa refatorar a camada de dados até sexta que vem. O projeto do Checkout tá no prazo, mas com risco técnico agora. Ah, surgiu uma ideia de fazer um 'Checkout Lite' pra conexões 3G, vamos criar um card pra investigar isso depois."

**Output (4 sugestões):**

1. ✅ **Task:** "Refatorar camada de dados para Postgres" → Pedro, due 2026-02-23
2. ✅ **Decision:** "Mudança de DynamoDB para PostgreSQL" → Motivo: custos
3. ✅ **Status Update:** On Track + Risco "Migração Postgres"
4. ☐ **Nova Iniciativa:** "Checkout Lite (3G)" → Discovery, Low priority

---

## 6. Success Metrics

### Primary Metric
**Taxa de conversão Inbox → Artefatos**
- Definição: % de itens processados via Inbox que são confirmados e salvos
- Target: **≥70%** dos itens sugeridos são aceitos pelo usuário
- Indica: IA está gerando sugestões úteis e precisas

### Secondary Metrics

| Métrica | Definição | Target |
|---------|-----------|--------|
| Frequência de uso | Sessões de Inbox/semana | ≥5x/semana |
| Tempo de processamento | Tempo do input até confirmação | <60 segundos |
| Taxa de edição | % de sugestões que precisam edição manual | <30% |
| Cobertura | % de categorias detectadas corretamente | ≥85% accuracy |

### Guardrail Metrics
- **Falsos positivos:** Sugestões irrelevantes devem ser <10%
- **Performance:** Processamento deve completar em <5 segundos

---

## 7. User Stories & Requirements

### Epic Hypothesis

> Acreditamos que adicionar uma Inbox Inteligente com processamento por IA para PMs vai reduzir o tempo gasto organizando informações em 50% e aumentar a taxa de captura de decisões/tasks de 60% para 90%, porque atualmente PMs perdem informações por falta de tempo para processar notas manualmente.

### User Stories

#### Story 1: Configurar Provider de IA
**Como** PM, **quero** configurar meu provider de IA preferido **para que** o sistema use minha conta/chave.

**Acceptance Criteria:**
- [ ] Existe aba "AI & Automation" em Settings
- [ ] Dropdown permite selecionar provider (OpenAI, Anthropic, Ollama)
- [ ] Campo de API Key com máscara de segurança (mostra só últimos 4 chars)
- [ ] Dropdown de modelo disponível baseado no provider selecionado
- [ ] Botão "Testar Conexão" valida a configuração
- [ ] Configuração persiste entre sessões

---

#### Story 2: Abrir Inbox via atalho
**Como** PM, **quero** abrir a Inbox rapidamente com um atalho **para que** eu possa capturar informações sem interromper meu fluxo.

**Acceptance Criteria:**
- [ ] `Ctrl+I` (ou `Cmd+I` no Mac) abre modal de Inbox
- [ ] Inbox abre com foco no campo de texto
- [ ] `Esc` fecha a Inbox sem salvar
- [ ] Inbox pode ser aberta de qualquer tela do app

---

#### Story 3: Processar texto com IA
**Como** PM, **quero** colar minhas notas e processá-las com IA **para que** o sistema sugira artefatos estruturados.

**Acceptance Criteria:**
- [ ] Campo de texto aceita múltiplas linhas (textarea)
- [ ] Botão "Processar com IA" envia texto para o provider configurado
- [ ] Loading state enquanto processa
- [ ] Erro amigável se API falhar ou não estiver configurada
- [ ] Suporte a texto em português

---

#### Story 4: Revisar sugestões de Tasks
**Como** PM, **quero** revisar tasks sugeridas pela IA **para que** eu confirme antes de criar.

**Acceptance Criteria:**
- [ ] Tasks detectadas aparecem com checkbox (marcado por default)
- [ ] Preview mostra: título, responsável (se detectado), due date (se detectado)
- [ ] Due dates relativos ("sexta que vem") são convertidos para data absoluta
- [ ] Botão "Editar" permite ajustar campos antes de confirmar
- [ ] Destino da task é mostrado (arquivo/projeto)

---

#### Story 5: Revisar sugestões de Decisions
**Como** PM, **quero** revisar decisões sugeridas pela IA **para que** eu documente no lugar correto.

**Acceptance Criteria:**
- [ ] Decisions detectadas aparecem com checkbox
- [ ] Preview mostra: título, contexto, motivo, status
- [ ] Destino mostra qual iniciativa receberá o Decision Log
- [ ] Se nenhuma iniciativa relacionada, sugere criar entry genérico

---

#### Story 6: Revisar sugestões de Status Updates
**Como** PM, **quero** revisar atualizações de status sugeridas **para que** eu mantenha iniciativas atualizadas.

**Acceptance Criteria:**
- [ ] Status updates detectados aparecem com checkbox
- [ ] Preview mostra: iniciativa afetada, novo status, riscos/updates
- [ ] Mostra diff do que será alterado (antes → depois)

---

#### Story 7: Revisar sugestões de Novas Iniciativas
**Como** PM, **quero** revisar ideias detectadas como novas iniciativas **para que** eu decida se vale criar.

**Acceptance Criteria:**
- [ ] Novas iniciativas aparecem com checkbox (desmarcado por default)
- [ ] Preview mostra: título sugerido, tipo (Discovery), prioridade sugerida
- [ ] Nome do arquivo a ser criado é mostrado

---

#### Story 8: Confirmar e salvar sugestões
**Como** PM, **quero** confirmar minhas seleções **para que** os artefatos sejam criados/atualizados.

**Acceptance Criteria:**
- [ ] Botão "Confirmar" processa todos os itens marcados
- [ ] Cada tipo de item é salvo no destino correto
- [ ] Feedback de sucesso mostra quantos itens foram criados
- [ ] Modal fecha após confirmação
- [ ] Itens desmarcados são descartados (não salvos)

---

### Constraints & Edge Cases

| Caso | Comportamento |
|------|---------------|
| API Key não configurada | Mostra mensagem pedindo configuração, link para Settings |
| Texto vazio | Botão "Processar" desabilitado |
| Nenhuma sugestão detectada | Mostra "Nenhum item detectado. Tente adicionar mais contexto." |
| Iniciativa mencionada não existe | Oferece criar nova ou selecionar existente |
| Múltiplas pessoas mencionadas | Cada uma vira responsável de task separada |
| Texto muito longo (>10k chars) | Aviso de truncamento ou split em batches |

---

## 8. Out of Scope

**Não incluído nesta versão:**

| Item | Motivo |
|------|--------|
| Integração direta com Slack/Email | Complexidade; começar com input manual |
| Voz-para-texto | Requer infra adicional; usuário pode usar ferramentas externas |
| Processamento automático (sem review) | Risco de criar artefatos incorretos; review é essencial |
| Múltiplos idiomas além de PT/EN | Foco inicial em português |
| Histórico de processamentos | Nice-to-have para v2 |
| Sugestões de linking entre iniciativas | Complexidade; v2 |

**Consideração futura:**
- Integração com Obsidian (se PM Cockpit rodar standalone)
- Templates de prompt customizáveis
- Fine-tuning de modelo para domínio PM

---

## 9. Dependencies & Risks

### Dependencies

| Tipo | Descrição | Owner | Status |
|------|-----------|-------|--------|
| **Técnica** | Componente de Settings precisa existir | Dev | A verificar |
| **Técnica** | Estrutura de arquivos markdown definida | Dev | Existente |
| **Externa** | API keys dos providers (usuário fornece) | Usuário | N/A |

### Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| IA gera sugestões incorretas | Média | Alto | Modal de review obrigatório; nunca salva sem confirmação |
| Custo de API para usuário | Média | Médio | Suporte a Ollama/local; mostrar estimativa de tokens |
| Latência alta (>5s) | Baixa | Médio | Loading state; otimizar prompt; cache de contexto |
| Parsing falha em textos complexos | Média | Médio | Fallback para "não detectado"; permitir categorização manual |

---

## 10. Open Questions

| # | Questão | Status | Decisão |
|---|---------|--------|---------|
| 1 | Deve haver limite de caracteres no input? | Aberto | Sugestão: 10k chars |
| 2 | Sugestões devem ter confidence score visível? | Aberto | Sugestão: Não na v1 (simplificar UI) |
| 3 | Permitir reprocessar mesmo texto com prompt diferente? | Aberto | - |
| 4 | Salvar rascunhos de Inbox entre sessões? | Aberto | Sugestão: Não na v1 |
| 5 | Integrar com atalho do sistema (global hotkey)? | Aberto | Depende se é app Electron ou web |

---

## Appendix: Prompt Engineering (Technical Notes)

### Estrutura do Prompt (Exemplo)

```
Você é um assistente de Product Management. Analise o texto abaixo e extraia:

1. TASKS: Ações com responsável e/ou prazo
2. DECISIONS: Escolhas feitas, mudanças definidas
3. STATUS_UPDATES: Estado de projetos, riscos, progresso
4. NEW_INITIATIVES: Ideias novas para investigar

Responda em JSON estruturado.

Texto:
"""
{user_input}
"""
```

### Output Esperado (JSON)

```json
{
  "tasks": [
    {
      "title": "Refatorar camada de dados para Postgres",
      "assignee": "Pedro",
      "due_date": "2026-02-23",
      "source_initiative": "checkout"
    }
  ],
  "decisions": [
    {
      "title": "Mudança de DynamoDB para PostgreSQL",
      "context": "Time de infra barrou DynamoDB",
      "rationale": "Redução de custos",
      "status": "decided"
    }
  ],
  "status_updates": [
    {
      "initiative": "checkout",
      "status": "on_track",
      "risks": ["Migração para Postgres introduz risco técnico"],
      "notes": "Reunião de alinhamento: banco alterado para Postgres"
    }
  ],
  "new_initiatives": [
    {
      "title": "Checkout Lite (3G)",
      "type": "discovery",
      "priority": "low",
      "description": "Investigar versão lite para conexões lentas"
    }
  ]
}
```

---

*Documento gerado com assistência de IA. Última atualização: 2026-02-16*
