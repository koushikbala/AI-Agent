import { Outlet, useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { useTheme } from '@/components/layout/ThemeProvider'
import { useConnectionStatus } from '@/components/layout/ConnectionStatusContext'
import { ConnectionBadge } from '@/components/layout/ConnectionBadge'
import { useAgentList } from '@/hooks/useAgentStatus'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const PAGE_TITLES = {
  '/': 'Market Dashboard',
  '/markets': 'Markets',
  '/agent': 'AI Agent',
  '/agent/signals': 'Signals',
  '/agent/logs': 'Agent Logs',
  '/history': 'Trade History',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
}

export function AppLayout() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { status } = useConnectionStatus()
  const agentListQuery = useAgentList()
  const title = PAGE_TITLES[location.pathname] ?? 'Not Found'
  const anyAgentRunning = agentListQuery.data?.some((a) => a.status === 'running') ?? false

  return (
    <SidebarProvider>
      <AppSidebar agentRunning={anyAgentRunning} />
      <SidebarInset>
        <header className="app-topbar sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex min-w-0 flex-col justify-center">
            <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Real-time market intelligence
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {status && <ConnectionBadge status={status} />}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </Button>
                }
              />
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="page-shell">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
