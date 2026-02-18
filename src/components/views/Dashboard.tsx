import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { ProgressBar, StatusBadge } from '@/components/shared/StatusBadge'
import { InitiativeRow } from '@/components/shared/InitiativeRow'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Initiative, CycleMetrics, InitiativeStatus, InitiativePriority } from '@/types'
import { isThisWeek, isOverdue } from '@/lib/cycle'
import { CockpitAdvisor } from './dashboard/CockpitAdvisor'
import { ImportantItems } from './dashboard/ImportantItems'

function calculateTeamMetrics(initiatives: Initiative[]): CycleMetrics {
  const byStatus: Record<InitiativeStatus, number> = {
    draft: 0, planned: 0, in_progress: 0, done: 0, blocked: 0,
  }
  const byPriority: Record<InitiativePriority, number> = {
    low: 0, medium: 0, high: 0, critical: 0,
  }
  let totalProgress = 0, dueThisWeek = 0, overdue = 0

  for (const init of initiatives) {
    byStatus[init.status]++
    byPriority[init.priority]++
    totalProgress += init.progress
    if (init.dueDate) {
      if (isThisWeek(init.dueDate) && init.status !== 'done') dueThisWeek++
      if (isOverdue(init.dueDate) && init.status !== 'done') overdue++
    }
  }

  return {
    total: initiatives.length,
    byStatus,
    byPriority,
    averageProgress: initiatives.length > 0 ? Math.round(totalProgress / initiatives.length) : 0,
    blocked: byStatus.blocked,
    dueThisWeek,
    overdue,
  }
}


function Dashboard() {
  const { initiatives, currentTeam, selectInitiative } = useAppStore()
  const navigate = useNavigate()

  const teamInitiatives = useMemo(() => {
    if (!currentTeam) return []
    return initiatives.filter(i => i.team === currentTeam.id)
  }, [initiatives, currentTeam])

  const metrics = useMemo(() => calculateTeamMetrics(teamInitiatives), [teamInitiatives])

  // Filter initiatives that need attention
  const attentionInitiatives = useMemo(() => {
    return teamInitiatives.filter(i =>
      ['blocked', 'in_progress'].includes(i.status) ||
      (i.status === 'planned' && i.priority === 'critical')
    ).sort((a, b) => {
      // Sort: Blocked first, then Critical, then In Progress
      if (a.status === 'blocked' && b.status !== 'blocked') return -1
      if (a.status !== 'blocked' && b.status === 'blocked') return 1
      return b.priority.localeCompare(a.priority) // Simplified priority sort
    }).slice(0, 5)
  }, [teamInitiatives])

  const handleInitiativeClick = (initiative: Initiative) => {
    selectInitiative(initiative.id)
    navigate(`/initiative/${initiative.id}`)
  }

  if (!currentTeam) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-foreground">
            Nenhum time selecionado
          </h2>
          <p className="mt-2 text-muted-foreground">
            Selecione um time no menu superior para começar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Page header */}
      <PageHeader
        title="Cockpit de Produto"
        subtitle={`Visão geral de ${currentTeam.name}`}
      />

      {/* Main Grid: Initiatives (Left) + Important Items (Right) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Initiatives needing attention */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/8">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-medium text-lg text-foreground">
                  Em Foco
                </h2>
              </div>
            </CardHeader>
            <div className="divide-y divide-border/8">
              {attentionInitiatives.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhuma iniciativa requer atenção imediata.</p>
                </div>
              ) : (
                attentionInitiatives.map((initiative) => (
                  <InitiativeRow
                    key={initiative.id}
                    initiative={initiative}
                    onClick={() => handleInitiativeClick(initiative)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Metrics Row (Moved from top) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total"
              value={metrics.total}
              icon={Target}
              color="blue"
            />
            <MetricCard
              title="Em Progresso"
              value={metrics.byStatus.in_progress}
              icon={TrendingUp}
              color="amber"
            />
            <MetricCard
              title="Bloqueadas"
              value={metrics.blocked}
              icon={AlertTriangle}
              color="red"
              alert={metrics.blocked > 0}
              description={metrics.blocked > 0 ? "Requer atenção" : undefined}
            />
            <MetricCard
              title="Concluídas"
              value={metrics.byStatus.done}
              icon={CheckCircle}
              color="green"
            />
          </div>

          {/* Simple Progress Bar */}
          <Card>
            <CardBody className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Conclusão do Ciclo</span>
                <span className="text-sm font-medium">{metrics.averageProgress}%</span>
              </div>
              <ProgressBar value={metrics.averageProgress} className="h-2" />
              {/* Status breakdown */}
              <div className="grid gap-2 grid-cols-5 mt-4">
                {(['draft', 'planned', 'in_progress', 'done', 'blocked'] as const).map((status) => {
                  const count = metrics.byStatus[status]
                  return (
                    <div key={status} className="flex flex-col items-center">
                      <StatusBadge status={status} size="sm" showDot={true} className="mb-1" />
                      <span className="text-xs font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* AI Advisor */}
          <CockpitAdvisor />
        </div>

        {/* Right Column: Important Items (Tasks, Decisions) */}
        <div className="space-y-6">
          <ImportantItems />

          {/* Alerts section (Condensed) */}
          <div className="space-y-3">
            {metrics.overdue > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">{metrics.overdue} Atrasadas</p>
                  <p className="text-xs text-destructive/80">Iniciativas fora do prazo</p>
                </div>
              </div>
            )}
            {metrics.dueThisWeek > 0 && (
              <div className="bg-status-in-progress/10 border border-status-in-progress/20 rounded-md p-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-status-in-progress shrink-0" />
                <div>
                  <p className="text-sm font-medium text-status-in-progress">{metrics.dueThisWeek} Vencendo</p>
                  <p className="text-xs text-status-in-progress/80">Nos próximos 7 dias</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
