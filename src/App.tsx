import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useInboxStore } from '@/stores/inboxStore'
import { useDecisionStore } from '@/stores/decisionStore'
import { useTasksStore } from '@/stores/tasksStore'
import { aiService } from '@/lib/ai'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import Dashboard from '@/components/views/Dashboard'
import InitiativeEditor from '@/components/views/InitiativeEditor'
import InitiativesView from '@/components/views/InitiativesView'
import SettingsView from '@/components/views/SettingsView'
import InboxView from '@/components/views/InboxView'
import DecisionLogView from '@/components/views/DecisionLogView'
import TasksView from '@/components/views/TasksView'
import { InboxProvider } from '@/components/inbox'
import { Toaster } from '@/components/ui/overlay'
import { CommandPalette } from '@/components/shared'

function App() {
  const { isLoading, error, loadData, sidebarCollapsed, theme, settings } = useAppStore()
  const loadInboxItems = useInboxStore((state) => state.loadInboxItems)
  const loadDecisions = useDecisionStore((state) => state.loadDecisions)
  const loadTasks = useTasksStore((state) => state.loadTasks)

  useEffect(() => {
    const initializeApp = async () => {
      await loadData()
      // Load additional stores in parallel
      await Promise.all([
        loadInboxItems(),
        loadDecisions(),
        loadTasks(),
      ])
    }
    initializeApp()
  }, [])

  // Configure AI service when settings change
  useEffect(() => {
    if (settings.llmApiKey) {
      aiService.configure({
        apiKey: settings.llmApiKey,
        model: settings.llmModel || 'claude-3-haiku-20240307',
        provider: settings.llmProvider || 'anthropic',
      })
    }
  }, [settings.llmApiKey, settings.llmModel, settings.llmProvider])

  // Theme Management Effect
  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark')

      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(t)
      }
    }

    applyTheme(theme)

    // Listener for system theme change
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="mt-4 text-muted-foreground">
            Carregando dados...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-lg bg-card p-6 shadow-linear-lg border border-border/8">
          <h2 className="mb-2 text-xl font-medium text-destructive">
            Erro ao carregar
          </h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <InboxProvider>
      <CommandPalette />
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div
          className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}
        >
          {/* Top bar */}
          <TopBar />

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/initiatives" element={<InitiativesView />} />
              <Route path="/tasks" element={<TasksView />} />
              <Route path="/initiative/:id" element={<InitiativeEditor />} />
              <Route path="/inbox" element={<InboxView />} />
              <Route path="/decisions" element={<DecisionLogView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </main>
        </div>
      </div>
      <Toaster />
    </InboxProvider>
  )
}

export default App
