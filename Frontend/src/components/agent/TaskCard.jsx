import { cn } from '@/lib/utils'
import { STRATEGY_META } from '@/lib/agentPresets'

export function TaskCard({ task, onDragStart, draggable = true }) {
  const meta = STRATEGY_META[task.strategy] ?? STRATEGY_META.trend
  const Icon = meta.icon

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(task))
        e.dataTransfer.effectAllowed = 'copy'
        onDragStart?.(task)
      }}
      className={cn(
        'flex cursor-grab items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition-transform active:cursor-grabbing',
        'hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <Icon className={cn('size-4 shrink-0', meta.color)} />
      <div className="min-w-0">
        <p className="truncate font-medium">{task.symbol}</p>
        <p className="truncate text-xs text-muted-foreground">
          {meta.label} · {task.timeframe}
        </p>
      </div>
    </div>
  )
}
