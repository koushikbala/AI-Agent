import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PIPELINE_STEPS } from '@/lib/agentPresets'

function StepRow({ step, log, active }) {
  const [open, setOpen] = useState(false)
  const Icon = step.icon
  const done = !!log && !active

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
            active
              ? 'border-primary bg-primary/10 text-primary'
              : done
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
                : 'border-dashed border-muted-foreground/30 text-muted-foreground/50',
          )}
        >
          {active ? (
            <Loader2 className="size-4 animate-spin" />
          ) : done ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <div className={cn('mt-1 w-px flex-1', done ? 'bg-emerald-500/30' : 'bg-border')} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className={cn('text-sm font-medium', !log && !active && 'text-muted-foreground')}>
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {log ? log.message : active ? 'Working…' : step.blurb}
        </p>
        {log?.raw && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 px-1.5 text-xs text-muted-foreground"
              onClick={() => setOpen((o) => !o)}
            >
              <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
              Details
            </Button>
            {open && (
              <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
                {JSON.stringify(log.raw, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Renders the 5-agent pipeline (Market Analyst -> Coordinator) as a vertical stepper. */
export function AgentPipeline({ logs }) {
  const { steps, hasActivity } = useMemo(() => {
    const stepLogs = PIPELINE_STEPS.map((step) => ({
      step,
      log: logs.find((l) => l.step === step.key) ?? null,
    }))
    const signalLog = logs.find((l) => l.step === 'signal') ?? null
    let lastDoneIndex = -1
    stepLogs.forEach((s, i) => {
      if (s.log) lastDoneIndex = i
    })
    const cycleComplete =
      signalLog && lastDoneIndex >= 0 && signalLog.time >= stepLogs[lastDoneIndex].log.time
    return {
      steps: stepLogs.map((s, i) => ({ ...s, active: !cycleComplete && i === lastDoneIndex })),
      hasActivity: lastDoneIndex >= 0,
    }
  }, [logs])

  if (!hasActivity) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No pipeline runs yet — start this agent or run once to watch it think.
      </p>
    )
  }

  return (
    <div>
      {steps.map(({ step, log, active }) => (
        <StepRow key={step.key} step={step} log={log} active={active} />
      ))}
    </div>
  )
}
