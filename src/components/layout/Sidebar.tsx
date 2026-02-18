import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Grid,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  MessageSquarePlus,
  FileCheck,
  CheckSquare,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/initiatives', icon: Grid, label: 'Iniciativas' },
    { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  ]

  const smartNavItems = [
    { to: '/inbox', icon: MessageSquarePlus, label: 'Inbox Inteligente' },
    { to: '/decisions', icon: FileCheck, label: 'Log de Decisões' },
  ]

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col",
        "bg-background border-r border-border/8 transition-all duration-150 ease-in-out",
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo and toggle */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border/8">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Rocket className="h-5 w-5" />
            </div>
            <span className="font-medium text-foreground tracking-tight">
              PM Cockpit
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 text-muted-foreground hover:bg-muted"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-x-hidden">
        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0 h-10"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                sidebarCollapsed && "m-0"
              )} />
              {!sidebarCollapsed && (
                <span className="animate-in fade-in slide-in-from-left-1 duration-200">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {!sidebarCollapsed && <Separator className="mx-4 my-2 opacity-50" />}

        {/* Smart Features Navigation */}
        {!sidebarCollapsed && (
          <div className="px-3 animate-in fade-in duration-300">
            <h3 className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
              IA & Insights
            </h3>
          </div>
        )}
        <nav className="flex flex-col gap-1.5 px-3">
          {smartNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0 h-10"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                sidebarCollapsed && "m-0"
              )} />
              {!sidebarCollapsed && (
                <span className="animate-in fade-in slide-in-from-left-1 duration-200">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings at bottom */}
      <div className="mt-auto p-3 border-t border-border/8">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            "nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            sidebarCollapsed && "justify-center px-0 h-10"
          )}
          title={sidebarCollapsed ? 'Configurações' : undefined}
        >
          <Settings className={cn(
            "h-5 w-5 shrink-0",
            sidebarCollapsed && "m-0"
          )} />
          {!sidebarCollapsed && <span>Configurações</span>}
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
