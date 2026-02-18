import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useInboxStore } from '@/stores/inboxStore'
import { useAppStore } from '@/stores/appStore'
import { useInboxShortcut } from '@/hooks/useGlobalShortcut'
import { InboxCaptureModal } from './InboxCaptureModal'
import { InboxReviewModal } from './InboxReviewModal'
import type { InboxSuggestion } from '@/types'
import { toast } from '@/hooks/use-toast'

interface InboxContextValue {
  openCapture: () => void
  isOpen: boolean
}

const InboxContext = createContext<InboxContextValue | null>(null)

export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error('useInbox must be used within InboxProvider')
  }
  return context
}

interface InboxProviderProps {
  children: ReactNode
}

export function InboxProvider({ children }: InboxProviderProps) {
  // Modal states
  const [captureOpen, setCaptureOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<InboxSuggestion[]>([])
  const [sourceContent, setSourceContent] = useState('')

  // Stores
  const { processContentWithAI, confirmSuggestions } = useInboxStore()
  const { initiatives } = useAppStore()

  // Global shortcut
  useInboxShortcut(() => {
    setCaptureOpen(true)
  })

  // Open capture modal
  const openCapture = useCallback(() => {
    setCaptureOpen(true)
  }, [])

  // Handle AI processing
  const handleProcess = useCallback(
    async (content: string) => {
      try {
        setSourceContent(content)
        const result = await processContentWithAI(content, initiatives)

        if (result.length === 0) {
          toast({
            title: 'Nenhuma sugestão encontrada',
            description: 'Não foi possível extrair itens acionáveis do texto.',
          })
          return
        }

        setSuggestions(result)
        setCaptureOpen(false)
        setReviewOpen(true)
      } catch (error) {
        toast({
          title: 'Erro ao processar',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível processar o texto.',
          variant: 'destructive',
        })
      }
    },
    [processContentWithAI, initiatives]
  )

  // Handle suggestion update
  const handleUpdateSuggestion = useCallback(
    (id: string, updates: Partial<InboxSuggestion>) => {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } as InboxSuggestion : s))
      )
    },
    []
  )

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    try {
      const results = await confirmSuggestions(suggestions)

      // Show summary toast
      const parts: string[] = []
      if (results.tasksCreated > 0) {
        parts.push(`${results.tasksCreated} tarefa${results.tasksCreated > 1 ? 's' : ''}`)
      }
      if (results.decisionsCreated > 0) {
        parts.push(`${results.decisionsCreated} decisão${results.decisionsCreated > 1 ? 'ões' : ''}`)
      }
      if (results.initiativesUpdated > 0) {
        parts.push(`${results.initiativesUpdated} atualização${results.initiativesUpdated > 1 ? 'ões' : ''}`)
      }
      if (results.initiativesCreated > 0) {
        parts.push(`${results.initiativesCreated} nova${results.initiativesCreated > 1 ? 's' : ''} iniciativa${results.initiativesCreated > 1 ? 's' : ''}`)
      }

      if (parts.length > 0) {
        toast({
          title: 'Itens criados com sucesso',
          description: parts.join(', '),
        })
      }

      // Reset state
      setSuggestions([])
      setSourceContent('')
      setReviewOpen(false)
    } catch (error) {
      toast({
        title: 'Erro ao confirmar',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar os itens.',
        variant: 'destructive',
      })
      throw error
    }
  }, [suggestions, confirmSuggestions])

  const contextValue: InboxContextValue = {
    openCapture,
    isOpen: captureOpen || reviewOpen,
  }

  return (
    <InboxContext.Provider value={contextValue}>
      {children}

      {/* Capture Modal */}
      <InboxCaptureModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onProcess={handleProcess}
      />

      {/* Review Modal */}
      <InboxReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        suggestions={suggestions}
        onUpdateSuggestion={handleUpdateSuggestion}
        onConfirm={handleConfirm}
        sourceContent={sourceContent}
      />
    </InboxContext.Provider>
  )
}
