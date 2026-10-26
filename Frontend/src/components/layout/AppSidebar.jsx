import { NavLink } from 'react-router-dom'
import {
  Bell,
  Bot,
  CandlestickChart,
  ChevronsUpDown,
  FileClock,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Radio,
  Settings,
  User,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/layout/ThemeProvider'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Markets', url: '/markets', icon: LineChart },
    ],
  },
  {
    label: 'AI',
    items: [
      { title: 'AI Agent', url: '/agent', icon: Bot, badge: 'Beta', statusDot: true },
      { title: 'Signals', url: '/agent/signals', icon: Radio },
      { title: 'Agent Logs', url: '/agent/logs', icon: FileClock },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Trade History', url: '/history', icon: History },
      { title: 'Alerts', url: '/alerts', icon: Bell },
      { title: 'Settings', url: '/settings', icon: Settings },
    ],
  },
]

function NavIcon({ icon: Icon, showStatusDot, agentRunning }) {
  return (
    <span className="relative inline-flex">
      <Icon />
      {showStatusDot && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 size-1.5 rounded-full ring-2 ring-sidebar',
            agentRunning ? 'bg-emerald-500' : 'bg-muted-foreground/60',
          )}
          aria-label={agentRunning ? 'Agent running' : 'Agent stopped'}
        />
      )}
    </span>
  )
}

export function AppSidebar({ agentRunning = false }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <NavLink to="/">
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <CandlestickChart className="size-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold tracking-tight">CryptoBoard</span>
                    <span className="text-[11px] text-muted-foreground">Live Markets</span>
                  </div>
                </NavLink>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group, idx) => (
          <SidebarGroup key={group.label}>
            {idx > 0 && <SidebarSeparator className="mb-2 group-data-[collapsible=icon]:hidden" />}
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      render={
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className={({ isActive }) =>
                            cn(
                              'transition-colors',
                              isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm',
                            )
                          }
                        >
                          <NavIcon icon={item.icon} showStatusDot={item.statusDot} agentRunning={agentRunning} />
                          <span>{item.title}</span>
                        </NavLink>
                      }
                    />
                    {item.badge && (
                      <SidebarMenuBadge>
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] leading-4">
                          {item.badge}
                        </Badge>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback>CB</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium">Trader</span>
                      <span className="truncate text-xs text-muted-foreground">Paper account</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  <Settings className="size-4" />
                  Theme: {theme === 'dark' ? 'Dark' : 'Light'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
