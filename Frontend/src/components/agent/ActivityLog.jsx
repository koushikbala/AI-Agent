import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Database,
  LineChart,
  Radio,
  Trash2,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'
import { PIPELINE_STEPS } from '@/lib/agentPresets'

const STEP_ICON = {
  fetch: Database,
  indicators: LineChart,
  signal: Radio,
  risk_gate: AlertTriangle,
  position: Radio,
  error: AlertTriangle,
  ...Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, s.icon])),
}

const STEP_TITLE = Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, s.title]))

function stepLabel(step) {
  return STEP_TITLE[step] ?? step.replace(/_/g, ' ')
}

function LogRow({ entry }) {
  const [open, setOpen] = useState(false)
  const Icon = STEP_ICON[entry.step] ?? Database

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-start gap-3 border-b py-2.5 last:border-0">
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            entry.level === 'error' ? 'text-destructive' : 'text-muted-foreground',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{formatTime(entry.time)}</span>
            <span className="text-xs font-medium capitalize text-muted-foreground">{stepLabel(entry.step)}</span>
          </div>
          <p className={cn('text-sm', entry.level === 'error' && 'text-destructive')}>{entry.message}</p>
          {entry.raw != null && (
            <>
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" size="sm" className="mt-1 h-6 px-1.5 text-xs text-muted-foreground">
                    <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
                    Raw data
                  </Button>
                }
              />
              <CollapsibleContent>
                <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(entry.raw, null, 2)}
                </pre>
              </CollapsibleContent>
            </>
          )}
        </div>
      </div>
    </Collapsible>
  )
}

export function ActivityLog({ logs, onClear }) {
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
          <Label htmlFor="auto-scroll" className="text-sm text-muted-foreground">
            Auto-scroll (newest first)
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Trash2 className="size-3.5" /> Clear
        </Button>
      </div>

      {!logs.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No activity yet. Start the agent or run once to see log events here.
        </p>
      ) : (
        <ScrollArea className="h-96 rounded-md border px-3">
          {(autoScroll ? logs : [...logs].reverse()).map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </ScrollArea>
      )}
    </div>
  )
}
