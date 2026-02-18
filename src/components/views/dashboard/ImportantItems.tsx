import { FileCheck, CheckSquare, AlertTriangle } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTasksStore } from '@/stores/tasksStore'
import { useDecisionStore } from '@/stores/decisionStore'

export function ImportantItems() {
    const navigate = useNavigate()
    const { getOverdueTasks, getTasksByStatus } = useTasksStore()
    const { getRecentDecisions } = useDecisionStore()

    const overdueTasks = getOverdueTasks().slice(0, 3)
    const urgentTasks = getTasksByStatus('pending')
        .filter(t => t.priority === 'urgent')
        .slice(0, 3)

    const importantTasks = [...overdueTasks, ...urgentTasks].slice(0, 5) // Combine and limit
    const recentDecisions = getRecentDecisions(3)

    return (
        <div className="space-y-6">
            {/* Important Tasks */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-status-planned" />
                        <h3 className="font-medium">Prioridades</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => navigate('/tasks')}
                    >
                        Ver todas
                    </Button>
                </CardHeader>
                <CardBody className="pt-0">
                    {importantTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhuma tarefa urgente pendente.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {importantTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="group flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => navigate('/tasks')} // Ideally scroll to task
                                >
                                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${task.dueDate && new Date(task.dueDate) < new Date()
                                            ? 'bg-destructive'
                                            : 'bg-status-planned'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {task.priority === 'urgent' && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive text-destructive">
                                                    Urgente
                                                </Badge>
                                            )}
                                            {task.dueDate && (
                                                <span className={`text-xs ${new Date(task.dueDate) < new Date() ? 'text-destructive' : 'text-muted-foreground'
                                                    }`}>
                                                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Recent Decisions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Decisões Recentes</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => navigate('/decisions')}
                    >
                        Ver todas
                    </Button>
                </CardHeader>
                <CardBody className="pt-0">
                    {recentDecisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhuma decisão registrada.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {recentDecisions.map(decision => (
                                <div
                                    key={decision.id}
                                    className="relative pl-4 border-l-2 border-primary/20 hover:border-primary transition-colors cursor-pointer"
                                    onClick={() => navigate('/decisions')}
                                >
                                    <p className="text-sm font-medium line-clamp-1">{decision.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {decision.chosenOption}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground block mt-1">
                                        {decision.date.toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Tip Card */}
            <div className="bg-muted/30 border border-border/10 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Dica Pro:</p>
                    <p>Use o Inbox Inteligente para processar notas de reunião rapidamente.</p>
                </div>
            </div>
        </div>
    )
}
