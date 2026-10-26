import { Link } from 'react-router-dom'
import { Pause, Play, RotateCw, Square } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  running: { label: 'Running', className: 'bg-emerald-600 hover:bg-emerald-600' },
  paused: { label: 'Paused', className: 'bg-amber-500 hover:bg-amber-500' },
  stopped: { label: 'Stopped', className: '' },
  error: { label: 'Error', className: '' },
}

export function AgentHeader({
  status,
  hasOpenPositions,
  onStart,
  onPause,
  onStop,
  onRunOnce,
  isStarting,
  isPausing,
  isStopping,
  isRunningOnce,
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.stopped
  const isRunning = status === 'running'
  const isStopped = status === 'stopped' || status === 'error' || !status

  const stopIconButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={isStopped || isStopping}
      onClick={hasOpenPositions ? undefined : onStop}
    >
      <Square className="size-4" />
      <span className="hidden sm:inline">Stop</span>
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Agent</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <p className="eyebrow">Automation workspace</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">AI trading agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">Monitor signals and manage paper positions.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
        <Badge className={cn(config.className)} variant={status === 'error' ? 'destructive' : 'default'}>
          {config.label}
        </Badge>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onStart} disabled={isRunning || isStarting}>
              <Play className="size-4" />
              <span className="hidden sm:inline">Start</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start agent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onPause} disabled={!isRunning || isPausing}>
              <Pause className="size-4" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pause agent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {hasOpenPositions ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>{stopIconButton}</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop agent with open positions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      There are open paper positions. Stopping the agent will leave them open —
                      they won&apos;t be auto-closed. This only affects simulated paper trades.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onStop}>Stop anyway</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              stopIconButton
            )}
          </TooltipTrigger>
          <TooltipContent>Stop agent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm" onClick={onRunOnce} disabled={isRunningOnce}>
              <RotateCw className={cn('size-4', isRunningOnce && 'animate-spin')} />
              <span className="hidden sm:inline">Run once</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Run once</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
