import { useState } from 'react'
import { MessageSquarePlus, Sparkles, Loader2, Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { aiService } from '@/lib/ai'

interface InboxCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcess: (content: string) => Promise<void>
}

export function InboxCaptureModal({
  open,
  onOpenChange,
  onProcess,
}: InboxCaptureModalProps) {
  const [content, setContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const isAIConfigured = aiService.isConfigured()

  const handleProcess = async () => {
    if (!content.trim()) return

    setIsProcessing(true)
    try {
      await onProcess(content)
      setContent('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter to process
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleProcess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Inbox Inteligente
            <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
              <Keyboard size={10} className="mr-1" />
              Ctrl+I
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Cole notas de reunião, mensagens ou qualquer texto. A IA vai extrair
            tarefas, decisões, atualizações e ideias de novas iniciativas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            placeholder={`Exemplo:\n\nReunião Checkout: O time de infra barrou o uso do DynamoDB por custo, então batemos o martelo que vamos usar Postgres. O Pedro precisa refatorar a camada de dados até sexta. O projeto tá no prazo, mas com risco técnico. Surgiu ideia de fazer um Checkout Lite.`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={10}
            className="resize-none font-mono text-sm"
            autoFocus
          />

          {!isAIConfigured && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Configure sua chave API do Anthropic nas Configurações para usar o processamento com IA.
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+Enter</kbd> para processar
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!content.trim() || !isAIConfigured || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Processar com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
