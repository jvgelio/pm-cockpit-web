import { useState, useMemo, useEffect } from 'react'
import {
    LayoutList,
    Kanban as KanbanIcon,
    Calendar,
    Plus,
    Loader2,
    Search,
    Package,
    Inbox,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import ListView from './ListView'
import KanbanBoard from './KanbanBoard'
import Timeline from './Timeline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { Textarea } from '@/components/ui/form'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/overlay'
import { EmptyState } from '@/components/shared/EmptyState'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import type { InitiativeStatus, InitiativePriority, InitiativeType } from '@/types'

type ViewType = 'list' | 'kanban' | 'timeline'

type TypeFilter = 'all' | InitiativeType
type CycleFilter = 'all' | 'backlog' | 'current' | 'future' | string // string for a specific cycle ID

function InitiativesView() {
    const { initiatives, cycles, currentTeam, currentCycleId, createInitiative, settings } = useAppStore()
    const [currentView, setCurrentView] = useState<ViewType>('list')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [selectedCycleFilter, setSelectedCycleFilter] = useState<CycleFilter>('all')

    // Create initiative dialog state
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newType, setNewType] = useState<InitiativeType>('product')
    const [newStatus, setNewStatus] = useState<InitiativeStatus>('draft')
    const [newPriority, setNewPriority] = useState<InitiativePriority>('medium')
    const [newOwner, setNewOwner] = useState('')
    const [newProduct, setNewProduct] = useState('')
    const [newProblem, setNewProblem] = useState('')
    const [newCycleId, setNewCycleId] = useState<string | null>(null) // For create dialog


    const handleCreateInitiative = async () => {
        if (!newTitle.trim() || !currentTeam) return

        if (!newProblem.trim()) {
            alert('A descrição (problema) é obrigatória.')
            return
        }

        setIsCreating(true)
        try {
            const productId = newProduct || currentTeam.products[0]?.id || 'default'
            await createInitiative({
                title: newTitle.trim(),
                team: currentTeam.id,
                product: productId,
                type: newType,
                status: newStatus,
                priority: newPriority,
                owner: newOwner.trim() || 'TBD',
                progress: 0,
                tags: [],
                dependencies: [],
                cycleId: newCycleId, // Use newCycleId
                problem: newProblem.trim() || undefined,
            })

            // Reset form
            setNewTitle('')
            setNewType('product')
            setNewStatus('draft')
            setNewPriority('medium')
            setNewOwner('')
            setNewProduct('')
            setNewProblem('')
            setNewCycleId(null) // Reset newCycleId
            setIsCreateOpen(false)
        } catch (error) {
            console.error('Failed to create initiative:', error)
        } finally {
            setIsCreating(false)
        }
    }

    // No direct return if currentCycle is null anymore
    // The view will filter initiatives based on selectedCycleFilter,
    // and if 'current' is selected with no currentCycle, it will show an empty state.

    // Memoized list of cycles (global) for the filter dropdown
    const sortedCycles = useMemo(() => {
        return [...cycles].sort((a, b) => b.start.getTime() - a.start.getTime());
    }, [cycles]);

    // Filtered initiatives based on selectedCycleFilter and typeFilter
    const filteredInitiatives = useMemo(() => {
        if (!currentTeam) return [];

        let filtered = initiatives.filter(init => init.team === currentTeam.id);

        const now = new Date();

        switch (selectedCycleFilter) {
            case 'all':
                // No additional cycle filtering needed
                break;
            case 'backlog':
                filtered = filtered.filter(init => init.cycleId === null);
                break;
            case 'current':
                filtered = filtered.filter(init => init.cycleId === currentCycleId);
                break;
            case 'future':
                const futureCycles = sortedCycles.filter(cycle => cycle.start > now);
                const futureCycleIds = new Set(futureCycles.map(c => c.id));
                filtered = filtered.filter(init => init.cycleId && futureCycleIds.has(init.cycleId));
                break;
            default: // Specific cycle ID
                filtered = filtered.filter(init => init.cycleId === selectedCycleFilter);
                break;
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(init => init.type === typeFilter);
        }

        return filtered;
        return filtered;
    }, [initiatives, currentTeam, cycles, currentCycleId, selectedCycleFilter, typeFilter, sortedCycles]);

    // Find the currently selected cycle object for display in dialog
    const selectedCycleForDialog = useMemo(() => {
        if (newCycleId === null) return { name: 'Backlog', id: 'backlog' };
        return cycles.find(c => c.id === newCycleId);
    }, [cycles, newCycleId]);

    // Set initial newCycleId for create dialog to the currently selected filter if it's a specific cycle
    // or to currentCycleId if 'current' is selected, otherwise null for backlog.
    // This effect runs when the dialog opens
    useEffect(() => {
        if (isCreateOpen) {
            if (selectedCycleFilter === 'backlog') {
                setNewCycleId(null);
            } else if (selectedCycleFilter === 'current' && currentCycleId) {
                setNewCycleId(currentCycleId);
            } else if (sortedCycles.some(c => c.id === selectedCycleFilter)) {
                setNewCycleId(selectedCycleFilter as string);
            } else {
                setNewCycleId(null); // Default to backlog if no specific cycle or current selected
            }
        }
    }, [isCreateOpen, selectedCycleFilter, currentCycleId, sortedCycles]);


    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header with PageHeader and View Switcher */}
            <div className="max-w-7xl w-full mx-auto px-6">
                <PageHeader
                    title="Iniciativas"
                    subtitle="Gerenciamento de entregas e objetivos"
                    actions={
                        <div className="flex items-center gap-3">
                            {/* Cycle Filter */}
                            <Select
                                value={selectedCycleFilter}
                                onValueChange={(value: CycleFilter) => setSelectedCycleFilter(value)}
                            >
                                <SelectTrigger className="w-[180px] h-9 text-xs">
                                    <SelectValue placeholder="Selecionar Ciclo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Iniciativas</SelectItem>
                                    <SelectItem value="backlog">
                                        <div className="flex items-center gap-2">
                                            <Inbox size={14} className="text-muted-foreground" />
                                            Backlog
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="current">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-muted-foreground" />
                                            Ciclo Atual
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="future">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-muted-foreground" />
                                            Ciclos Futuros
                                        </div>
                                    </SelectItem>
                                    {sortedCycles.map((cycle) => (
                                        <SelectItem key={cycle.id} value={cycle.id}>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-muted-foreground" />
                                                {cycle.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Type Filter */}
                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/8">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 px-3 text-xs font-medium",
                                        typeFilter === 'all' && "bg-background shadow-sm"
                                    )}
                                    onClick={() => setTypeFilter('all')}
                                >
                                    Todas
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 px-3 text-xs font-medium gap-1.5",
                                        typeFilter === 'discovery' && "bg-background shadow-linear-sm text-status-in-progress"
                                    )}
                                    onClick={() => setTypeFilter('discovery')}
                                >
                                    <Search size={12} />
                                    Discovery
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 px-3 text-xs font-medium gap-1.5",
                                        typeFilter === 'product' && "bg-background shadow-linear-sm text-status-planned"
                                    )}
                                    onClick={() => setTypeFilter('product')}
                                >
                                    <Package size={12} />
                                    Produto
                                </Button>
                            </div>

                            {/* View Switcher */}
                            <Tabs
                                value={currentView}
                                onValueChange={(val) => setCurrentView(val as ViewType)}
                                className="bg-muted/30 p-1 rounded-lg border border-border/8"
                            >
                                <TabsList className="bg-transparent border-none">
                                    <TabsTrigger value="list" className="gap-2 font-medium text-xs data-[state=active]:shadow-sm">
                                        <LayoutList size={14} />
                                        Lista
                                    </TabsTrigger>
                                    <TabsTrigger value="kanban" className="gap-2 font-medium text-xs data-[state=active]:shadow-sm">
                                        <KanbanIcon size={14} />
                                        Kanban
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="gap-2 font-medium text-xs data-[state=active]:shadow-sm">
                                        <Calendar size={14} />
                                        Timeline
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Button
                                size="sm"
                                className="gap-2 font-medium"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus size={16} />
                                Nova Iniciativa
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden px-6 pb-6">
                <div className="h-full w-full max-w-7xl mx-auto">
                    {filteredInitiatives.length === 0 ? (
                        <EmptyState
                            icon={LayoutList}
                            title="Nenhuma iniciativa encontrada"
                            description="Nenhuma iniciativa encontrada para os filtros selecionados. Crie uma nova para começar."
                            action={{ label: 'Criar primeira iniciativa', onClick: () => setIsCreateOpen(true) }}
                        />
                    ) : (
                        <>
                            {currentView === 'list' && <ListView initiatives={filteredInitiatives} />}

                            {currentView === 'kanban' && (
                                <div className="h-full overflow-hidden animate-in slide-in-from-right-4 duration-500">
                                    <KanbanBoard minimalLayout initiatives={filteredInitiatives} />
                                </div>
                            )}

                            {currentView === 'timeline' && (
                                <div className="h-full rounded-xl border border-border/8 overflow-hidden bg-card shadow-linear-sm animate-in slide-in-from-right-4 duration-300">
                                    <Timeline minimalLayout initiatives={filteredInitiatives} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create Initiative Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nova Iniciativa</DialogTitle>
                        <DialogDescription>
                            Crie uma nova iniciativa para {selectedCycleForDialog?.name ? `o ciclo ${selectedCycleForDialog.name}` : 'o backlog'}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Cycle Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ciclo</label>
                            <Select
                                value={newCycleId === null ? 'backlog' : newCycleId}
                                onValueChange={(value) => setNewCycleId(value === 'backlog' ? null : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o Ciclo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="backlog">Backlog</SelectItem>
                                    {sortedCycles.map((cycle) => (
                                        <SelectItem key={cycle.id} value={cycle.id}>
                                            {cycle.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título *</label>
                            <Input
                                placeholder="Ex: Implementar autenticação OAuth"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>

                        {/* Type Selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={newType === 'discovery' ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        "flex-1 gap-2",
                                        newType === 'discovery' && "bg-status-in-progress hover:bg-status-in-progress/90"
                                    )}
                                    onClick={() => setNewType('discovery')}
                                >
                                    <Search size={14} />
                                    Discovery
                                </Button>
                                <Button
                                    type="button"
                                    variant={newType === 'product' ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        "flex-1 gap-2",
                                        newType === 'product' && "bg-status-planned hover:bg-status-planned/90"
                                    )}
                                    onClick={() => setNewType('product')}
                                >
                                    <Package size={14} />
                                    Produto
                                </Button>
                            </div>
                        </div>

                        {/* Status and Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                    value={newStatus}
                                    onValueChange={(v) => setNewStatus(v as InitiativeStatus)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Rascunho</SelectItem>
                                        <SelectItem value="planned">Planejada</SelectItem>
                                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                                        <SelectItem value="blocked">Bloqueada</SelectItem>
                                        <SelectItem value="done">Concluída</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prioridade</label>
                                <Select
                                    value={newPriority}
                                    onValueChange={(v) => setNewPriority(v as InitiativePriority)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="medium">Média</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Owner and Product */}
                        <div className="grid grid-cols-2 gap-4">
                            {settings.initiativeFields.owner.visible && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Responsável</label>
                                    <Input
                                        placeholder="Nome do responsável"
                                        value={newOwner}
                                        onChange={(e) => setNewOwner(e.target.value)}
                                    />
                                </div>
                            )}
                            {settings.initiativeFields.product.visible && currentTeam && currentTeam.products.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Produto</label>
                                    <Select
                                        value={newProduct || currentTeam.products[0]?.id}
                                        onValueChange={setNewProduct}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentTeam.products.map((product) => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Problem */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Problema a resolver *</label>
                            <Textarea
                                placeholder="Descreva brevemente o problema ou necessidade..."
                                value={newProblem}
                                onChange={(e) => setNewProblem(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateInitiative}
                            disabled={!newTitle.trim() || !newProblem.trim() || isCreating}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Iniciativa'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default InitiativesView
