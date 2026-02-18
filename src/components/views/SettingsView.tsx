import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/form'
import { Input } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Key, Bot, Database, Save, CheckCircle2, Layout, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import type { AIProvider } from '@/lib/ai'
import type { InitiativeFieldKey } from '@/types'

const PROVIDERS = [
    { id: 'anthropic' as AIProvider, label: 'Anthropic (Direto)' },
    { id: 'openrouter' as AIProvider, label: 'OpenRouter' },
    { id: 'toqan' as AIProvider, label: 'Toqan Intelligence' },
]

const MODELS_BY_PROVIDER: Record<AIProvider, Array<{ id: string; label: string; description?: string }>> = {
    anthropic: [
        { id: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    openrouter: [
        { id: 'openrouter/auto', label: 'Auto (Recomendado)', description: 'Seleciona automaticamente o melhor modelo para cada prompt' },
        { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6' },
        { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
        { id: 'openai/gpt-5.2', label: 'GPT 5.2' },
        { id: 'openai/o4-mini', label: 'GPT o4-mini' },
        { id: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro' },
        { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash' },
        { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
    ],
    toqan: [
        { id: 'toqan-agent', label: 'Toqan Agent', description: 'Agente configurado no seu espaço Toqan' },
    ],
}

const FIELD_LABELS: Record<InitiativeFieldKey, string> = {
    owner: 'Responsável',
    startDate: 'Data de Início',
    dueDate: 'Data de Entrega',
    progress: 'Progresso (%)',
    jiraEpic: 'Jira Epic',
    tags: 'Tags',
    dependencies: 'Dependências',
    product: 'Produto',
}

export default function SettingsView() {
    const { settings, updateSettings } = useAppStore()

    const [jiraKey, setJiraKey] = useState(settings.jiraApiKey)
    const [llmKey, setLlmKey] = useState(settings.llmApiKey)
    const [llmModel, setLlmModel] = useState(settings.llmModel)
    const [llmProvider, setLlmProvider] = useState<AIProvider>(settings.llmProvider)
    const [initiativeFields, setInitiativeFields] = useState(settings.initiativeFields)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    const handleProviderChange = (provider: AIProvider) => {
        setLlmProvider(provider)
        // Auto-select default model for the new provider
        const defaultModel = provider === 'openrouter' ? 'openrouter/auto' : MODELS_BY_PROVIDER[provider][0]?.id
        if (defaultModel) {
            setLlmModel(defaultModel)
        }
    }

    const handleSave = () => {
        setIsSaving(true)
        updateSettings({
            llmApiKey: llmKey,
            llmModel: llmModel,
            llmProvider: llmProvider,
            initiativeFields: initiativeFields,
        })

        // Simulate a small delay for better UX
        setTimeout(() => {
            setIsSaving(false)
            setLastSaved(new Date())
            toast({
                title: "Configurações salvas",
                description: "Suas chaves de API e preferências foram atualizadas.",
            })
        }, 600)
    }

    const hasChanges = jiraKey !== settings.jiraApiKey ||
        llmKey !== settings.llmApiKey ||
        llmModel !== settings.llmModel ||
        llmProvider !== settings.llmProvider ||
        JSON.stringify(initiativeFields) !== JSON.stringify(settings.initiativeFields)

    const currentModels = MODELS_BY_PROVIDER[llmProvider]

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie suas conexões e chaves de API para integrações.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Jira Settings */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-500" />
                            <CardTitle>Integração Jira</CardTitle>
                        </div>
                        <CardDescription>
                            Configure sua chave de API para sincronizar iniciativas diretamente do Jira.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="jira-api-key">Jira API Token</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="jira-api-key"
                                    type="password"
                                    placeholder="pst_..."
                                    className="pl-10"
                                    value={jiraKey}
                                    onChange={(e) => setJiraKey(e.target.value)}
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Recomendamos usar um Personal Access Token com permissões de leitura.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* LLM Settings */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-amber-500" />
                            <CardTitle>Inteligência Artificial (LLM)</CardTitle>
                        </div>
                        <CardDescription>
                            Configure o provedor e modelo de linguagem para o Inbox Inteligente e análise de iniciativas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="llm-provider">Provedor</Label>
                                <Select value={llmProvider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
                                    <SelectTrigger id="llm-provider">
                                        <SelectValue placeholder="Selecione o provedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDERS.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="llm-model">Modelo</Label>
                                <Select value={llmModel} onValueChange={setLlmModel}>
                                    <SelectTrigger id="llm-model">
                                        <SelectValue placeholder="Selecione um modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentModels.map(model => (
                                            <SelectItem key={model.id} value={model.id}>
                                                <span>{model.label}</span>
                                                {model.description && (
                                                    <span className="block text-[10px] text-muted-foreground font-normal">
                                                        {model.description}
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="llm-api-key">API Key</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="llm-api-key"
                                        type="password"
                                        placeholder={
                                            llmProvider === 'openrouter' ? 'sk-or-...' :
                                                llmProvider === 'toqan' ? 'sk-...' : 'sk-ant-...'
                                        }
                                        className="pl-10"
                                        value={llmKey}
                                        onChange={(e) => setLlmKey(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {llmProvider === 'openrouter' && (
                            <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
                                <strong>OpenRouter</strong> permite usar vários modelos com uma única API key.
                                Crie sua chave em{' '}
                                <span className="font-medium text-primary">openrouter.ai/keys</span>.
                            </p>
                        )}

                        {llmProvider === 'toqan' && (
                            <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
                                <strong>Toqan</strong> usa Agentes configurados. Certifique-se de usar a
                                <strong> chave de API do Agente</strong> que possui o Prompt de Sistema configurado.
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-border/40">
                            <strong>Nota:</strong> Sua chave de API é armazenada localmente e nunca sai deste computador,
                            exceto para as requisições diretas aos provedores de LLM.
                        </p>
                    </CardContent>
                </Card>

                {/* Initiative Fields Settings */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Layout className="h-5 w-5 text-blue-500" />
                            <CardTitle>Campos da Iniciativa</CardTitle>
                        </div>
                        <CardDescription>
                            Configure quais campos opcionais devem estar visíveis no formulário e detalhes da iniciativa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            {(Object.keys(FIELD_LABELS) as InitiativeFieldKey[]).map((fieldKey) => (
                                <div key={fieldKey} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="space-y-0.5">
                                        <Label htmlFor={`field-${fieldKey}`} className="text-sm font-medium cursor-pointer">
                                            {FIELD_LABELS[fieldKey]}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {initiativeFields[fieldKey].visible ? (
                                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                                        ) : (
                                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                        <Switch
                                            id={`field-${fieldKey}`}
                                            checked={initiativeFields[fieldKey].visible}
                                            onCheckedChange={(checked) => {
                                                setInitiativeFields({
                                                    ...initiativeFields,
                                                    [fieldKey]: { ...initiativeFields[fieldKey], visible: checked }
                                                })
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator className="my-4" />

                        <div className="bg-muted/50 p-4 rounded-lg border border-border/40">
                            <h4 className="text-sm font-semibold mb-2">Campos Obrigatórios Fixos</h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-background text-muted-foreground">Título</Badge>
                                <Badge variant="outline" className="bg-background text-muted-foreground">Descrição (Markdown)</Badge>
                                <Badge variant="outline" className="bg-background text-muted-foreground">Status</Badge>
                                <Badge variant="outline" className="bg-background text-muted-foreground">Prioridade</Badge>
                                <Badge variant="outline" className="bg-background text-muted-foreground">Tipo</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-3">
                                Estes campos são fundamentais para o funcionamento do sistema e não podem ser desativados.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer / Save Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    {lastSaved && (
                        <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Última alteração salva em {lastSaved.toLocaleTimeString()}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setJiraKey(settings.jiraApiKey)
                            setLlmKey(settings.llmApiKey)
                            setLlmModel(settings.llmModel)
                            setLlmProvider(settings.llmProvider)
                            setInitiativeFields(settings.initiativeFields)
                        }}
                        disabled={!hasChanges}
                    >
                        Descartar
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 min-w-[120px] gap-2"
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        ) : (
                            <Save size={16} />
                        )}
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </div>
    )
}
