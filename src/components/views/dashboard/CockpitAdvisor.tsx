import { useState, useEffect, useMemo } from 'react'
import { Sparkles, RefreshCw, Settings2, PlayCircle, ChevronDown, ChevronUp, History, Clock } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/ui/button'
import { aiService } from '@/lib/ai'
import { useAppStore } from '@/stores/appStore'
import { useTasksStore } from '@/stores/tasksStore'
import { useDecisionStore } from '@/stores/decisionStore'
import { useInboxStore } from '@/stores/inboxStore'
import { getCycleProgress, getDaysRemaining } from '@/lib/cycle'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { CockpitBriefingContext } from '@/lib/ai/prompts'

function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays === 1) return 'Ontem'
    return `Há ${diffDays} dias`
}

export function CockpitAdvisor() {
    const [briefing, setBriefing] = useState<string | null>(null)
    const [briefingTimestamp, setBriefingTimestamp] = useState<Date | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showHistory, setShowHistory] = useState(false)

    const {
        initiatives,
        currentTeam,
        currentCycle,
        settings,
        updateSettings,
        advisorHistory,
        loadAdvisorHistory,
        saveAdvisorEntry,
        getLastBriefingForTeam,
    } = useAppStore()
    const { tasks } = useTasksStore()
    const { decisions } = useDecisionStore()
    const { inboxItems } = useInboxStore()

    // Load history on mount
    useEffect(() => {
        loadAdvisorHistory()
    }, [loadAdvisorHistory])

    // Load last briefing for current team
    useEffect(() => {
        if (currentTeam) {
            const lastBriefing = getLastBriefingForTeam(currentTeam.id)
            if (lastBriefing) {
                setBriefing(lastBriefing.briefingContent)
                setBriefingTimestamp(lastBriefing.timestamp)
            }
        }
    }, [currentTeam, advisorHistory, getLastBriefingForTeam])

    // Team initiatives
    const teamInitiatives = useMemo(() => {
        if (!currentTeam) return []
        return initiatives.filter(i => i.team === currentTeam.id)
    }, [initiatives, currentTeam])

    // Build the enhanced context
    const buildContext = (): CockpitBriefingContext => {
        const cycleProgress = currentCycle ? getCycleProgress(currentCycle) : 0
        const daysRemaining = currentCycle ? getDaysRemaining(currentCycle) : 0

        // Count by status
        const byStatus = {
            draft: 0,
            planned: 0,
            in_progress: 0,
            done: 0,
            blocked: 0,
        }
        for (const init of teamInitiatives) {
            byStatus[init.status]++
        }

        const averageProgress = teamInitiatives.length > 0
            ? Math.round(teamInitiatives.reduce((sum, i) => sum + i.progress, 0) / teamInitiatives.length)
            : 0

        const overdueTasks = tasks.filter(t =>
            t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
        )
        const urgentTasks = tasks.filter(t =>
            t.priority === 'urgent' && t.status !== 'done'
        )
        const blockedInitiatives = teamInitiatives.filter(i => i.status === 'blocked')
        const recentDecisions = decisions.slice(0, 3)
        const pendingInboxItems = inboxItems.filter(i => i.status === 'pending').length

        // Get last briefing date if exists
        const lastBriefing = currentTeam ? getLastBriefingForTeam(currentTeam.id) : null
        const previousBriefingDate = lastBriefing
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(lastBriefing.timestamp)
            : undefined

        return {
            teamName: currentTeam?.name || 'Time',
            cycleName: currentCycle?.name,
            cycleProgress,
            daysRemaining,
            totalInitiatives: teamInitiatives.length,
            byStatus,
            averageProgress,
            overdueTasks: overdueTasks.map(t => ({ title: t.title, dueDate: t.dueDate })),
            urgentTasks: urgentTasks.map(t => ({ title: t.title })),
            blockedInitiatives: blockedInitiatives.map(i => ({ title: i.title })),
            recentDecisions: recentDecisions.map(d => ({ title: d.title, chosenOption: d.chosenOption })),
            pendingInboxItems,
            previousBriefingDate,
        }
    }

    const generateBriefing = async () => {
        setIsLoading(true)
        try {
            const context = buildContext()
            const result = await aiService.generateCockpitBriefing(context)
            const timestamp = new Date()

            setBriefing(result)
            setBriefingTimestamp(timestamp)
            setIsCollapsed(false)

            // Save to history
            if (currentTeam) {
                await saveAdvisorEntry({
                    timestamp,
                    teamId: currentTeam.id,
                    teamName: currentTeam.name,
                    cycleId: currentCycle?.id || null,
                    briefingContent: result,
                    contextSnapshot: {
                        totalInitiatives: teamInitiatives.length,
                        blockedCount: teamInitiatives.filter(i => i.status === 'blocked').length,
                        overdueTasksCount: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
                        pendingInboxCount: inboxItems.filter(i => i.status === 'pending').length,
                        cycleProgress: currentCycle ? getCycleProgress(currentCycle) : 0,
                    },
                    provider: settings.llmProvider,
                    model: settings.llmModel,
                })
            }
        } catch (error) {
            console.error('Failed to generate briefing:', error)
            setBriefing('Não foi possível gerar o briefing no momento. Tente novamente mais tarde.')
            setBriefingTimestamp(new Date())
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (aiService.isConfigured() && !briefing && settings.autoRunCockpit && currentTeam) {
            // Only auto-run if no recent briefing exists (within last hour)
            const lastBriefing = getLastBriefingForTeam(currentTeam.id)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
            if (!lastBriefing || lastBriefing.timestamp < oneHourAgo) {
                generateBriefing()
            }
        }
    }, [currentTeam?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!aiService.isConfigured()) {
        return null
    }

    const hasBriefing = !!briefing
    const showCompact = !hasBriefing && !isLoading

    // Team history entries
    const teamHistory = currentTeam
        ? advisorHistory.filter(entry => entry.teamId === currentTeam.id).slice(0, 10)
        : []

    return (
        <>
            <Card className={cn(
                "border-primary/20 bg-primary/5 transition-all duration-300",
                showCompact ? "py-2" : ""
            )}>
                <CardHeader className={cn(
                    "flex flex-row items-center justify-between border-primary/10",
                    showCompact ? "border-b-0 py-1" : "pb-2"
                )}>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className={cn(
                            "font-semibold text-primary",
                            showCompact ? "text-sm" : "text-lg"
                        )}>
                            Cockpit Advisor
                        </h3>
                        {briefingTimestamp && hasBriefing && !isCollapsed && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(briefingTimestamp)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {showCompact && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={generateBriefing}
                                disabled={isLoading}
                                className="h-7 text-xs px-3"
                            >
                                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                                Gerar Briefing
                            </Button>
                        )}

                        {hasBriefing && !showCompact && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="h-7 w-7 text-primary/60 hover:text-primary"
                                title={isCollapsed ? "Expandir" : "Minimizar"}
                            >
                                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        )}

                        {!showCompact && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={generateBriefing}
                                disabled={isLoading}
                                className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                                Atualizar
                            </Button>
                        )}

                        {teamHistory.length > 0 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHistory(true)}
                                className="h-7 w-7 text-primary/60 hover:text-primary"
                                title="Histórico"
                            >
                                <History className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        <div className="relative ml-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="h-7 w-7 text-primary/60 hover:text-primary"
                            >
                                <Settings2 className="h-3.5 w-3.5" />
                            </Button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card border border-border rounded-md shadow-lg p-3 animate-in fade-in slide-in-from-top-1">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-xs font-medium">Execução Automática</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.autoRunCockpit}
                                            onChange={(e) => {
                                                updateSettings({ autoRunCockpit: e.target.checked })
                                                setIsMenuOpen(false)
                                            }}
                                            className="h-3 w-3 rounded border-primary text-primary focus:ring-primary"
                                        />
                                    </label>
                                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                                        Analisa o contexto assim que o Dashboard é aberto (a cada hora).
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                {!showCompact && !isCollapsed && (
                    <CardBody className="py-3">
                        {isLoading && !briefing ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-primary/10 rounded w-3/4"></div>
                                <div className="h-4 bg-primary/10 rounded w-1/2"></div>
                                <div className="h-4 bg-primary/10 rounded w-5/6"></div>
                                <div className="h-4 bg-primary/10 rounded w-2/3"></div>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-foreground/90
                                prose-p:leading-relaxed prose-p:my-2
                                prose-headings:text-foreground prose-headings:font-semibold
                                prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
                                prose-h3:text-sm prose-h3:mt-3
                                prose-strong:text-foreground prose-strong:font-medium
                                prose-ul:my-2 prose-li:my-0.5
                                [&>*:first-child]:mt-0">
                                <ReactMarkdown>{briefing || 'Nenhum insight disponível.'}</ReactMarkdown>
                            </div>
                        )}
                    </CardBody>
                )}

                {isCollapsed && hasBriefing && (
                    <CardBody className="py-2">
                        <p className="text-sm text-muted-foreground truncate">
                            {briefing?.split('\n')[0]?.replace(/^#+\s*/, '').substring(0, 80)}...
                        </p>
                    </CardBody>
                )}
            </Card>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHistory(false)}>
                    <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Histórico de Briefings
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                                Fechar
                            </Button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
                            {teamHistory.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer"
                                    onClick={() => {
                                        setBriefing(entry.briefingContent)
                                        setBriefingTimestamp(entry.timestamp)
                                        setShowHistory(false)
                                        setIsCollapsed(false)
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground">
                                            {new Intl.DateTimeFormat('pt-BR', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            }).format(entry.timestamp)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {entry.contextSnapshot.totalInitiatives} iniciativas
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80 line-clamp-2">
                                        {entry.briefingContent.split('\n')[0]?.replace(/^#+\s*/, '')}
                                    </p>
                                </div>
                            ))}
                            {teamHistory.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum histórico disponível.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
