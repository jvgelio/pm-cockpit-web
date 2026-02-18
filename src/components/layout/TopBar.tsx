import {
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  Bell,
  Users,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useInbox } from '@/components/inbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/form"
import { cn } from '@/lib/utils'

function TopBar() {
  const {
    teams,
    currentTeam,
    setCurrentTeam,
    theme,
    setTheme,
    setFilters,
    filters,
  } = useAppStore()

  const { openCapture } = useInbox()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value || undefined })
  }

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ]

  const currentThemeOption = themeOptions.find((t) => t.value === theme)

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        {/* Team indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-3 hover:bg-muted/50 font-medium">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-foreground">
                {currentTeam?.name || 'Selecionar time'}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 p-2">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-2 py-1.5">
              Seus Times
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onSelect={() => setCurrentTeam(team.id)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-md transition-colors",
                  team.id === currentTeam?.id && "bg-primary/10 text-primary focus:bg-primary/20"
                )}
              >
                <span className="font-medium">{team.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 max-w-md ml-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Buscar em todo o projeto..."
            value={filters.search || ''}
            onChange={handleSearch}
            className="h-9 pl-10 bg-muted/30 border-border/8 focus-visible:ring-0 focus-visible:border-border/30 dark:bg-muted/20"
          />
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-9 gap-2 font-medium active:scale-95 transition-transform duration-150"
            onClick={openCapture}
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Inbox Inteligente</span>
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Ctrl+I
            </kbd>
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
            <Bell size={18} />
          </Button>

          {/* Theme toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
                {currentThemeOption && <currentThemeOption.icon size={18} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[10px] font-medium text-muted-foreground/70 uppercase py-1">Tema</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {themeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setTheme(option.value)}
                  className={cn(
                    "gap-2 cursor-pointer",
                    theme === option.value && "text-primary font-medium"
                  )}
                >
                  <option.icon size={14} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}

export default TopBar
