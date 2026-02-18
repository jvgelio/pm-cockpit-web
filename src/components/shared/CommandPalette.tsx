import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sun, 
  Moon, 
  Laptop, 
  LayoutDashboard, 
  ListTodo, 
  Inbox, 
  FileCheck, 
  Settings, 
  Plus,
  Search,
  CheckSquare,
  MessageSquarePlus
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut'
import { useAppStore } from '@/stores/appStore'
import { useInbox } from '@/components/inbox'

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const { setTheme, theme } = useAppStore()
    const { openCapture } = useInbox()

    const toggleOpen = useCallback(() => {
        setOpen((prev) => !prev)
    }, [])

    const modifiers = useMemo(() => ['ctrl'] as const, [])

    // Toggle the command palette with Ctrl+K (Cmd+K on Mac)
    useGlobalShortcut({
        key: 'k',
        modifiers: modifiers,
        callback: toggleOpen
    })

    const runCommand = useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    const isMac = typeof window !== 'undefined' && 
      (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
       navigator.userAgent.indexOf('Mac') >= 0)
    
    const modifierKey = isMac ? '⌘' : 'Ctrl+'

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Digite um comando ou pesquise..." />
            <CommandList className="max-h-[450px]">
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                
                <CommandGroup heading="Ações Rápidas">
                    <CommandItem onSelect={() => runCommand(() => openCapture())}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        <span>Capturar Inbox Inteligente</span>
                        <CommandShortcut>{modifierKey}I</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/initiatives'))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Nova Iniciativa</span>
                    </CommandItem>
                </CommandGroup>
                
                <CommandSeparator />

                <CommandGroup heading="Navegação">
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                        <CommandShortcut>{modifierKey}D</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/initiatives'))}>
                        <ListTodo className="mr-2 h-4 w-4" />
                        <span>Iniciativas</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/tasks'))}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        <span>Minhas Tarefas</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/inbox'))}>
                        <Inbox className="mr-2 h-4 w-4" />
                        <span>Inbox Inteligente</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/decisions'))}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        <span>Log de Decisões</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Preferências & Sistema">
                    <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                        <Sun className={`mr-2 h-4 w-4 ${theme === 'light' ? 'text-primary' : ''}`} />
                        <span>Tema Claro</span>
                        {theme === 'light' && <span className="ml-auto text-xs text-primary font-medium">Ativo</span>}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                        <Moon className={`mr-2 h-4 w-4 ${theme === 'dark' ? 'text-primary' : ''}`} />
                        <span>Tema Escuro</span>
                        {theme === 'dark' && <span className="ml-auto text-xs text-primary font-medium">Ativo</span>}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                        <Laptop className={`mr-2 h-4 w-4 ${theme === 'system' ? 'text-primary' : ''}`} />
                        <span>Tema do Sistema</span>
                        {theme === 'system' && <span className="ml-auto text-xs text-primary font-medium">Ativo</span>}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                        <CommandShortcut>{modifierKey}S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

            </CommandList>
        </CommandDialog>
    )
}
