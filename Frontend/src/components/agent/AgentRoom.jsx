import { useMemo, useState } from 'react'
import { Eye, Plus, Settings2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CatAvatar } from '@/components/agent/CatAvatar'
import { TaskCard } from '@/components/agent/TaskCard'
import { AgentPipeline } from '@/components/agent/AgentPipeline'
import { cn } from '@/lib/utils'
import { SYMBOLS } from '@/lib/binance'
import { STRATEGY_META, PIPELINE_STEP_KEYS } from '@/lib/agentPresets'

const CAT_NAME_POOL = [
  'Hermes', 'Apollo', 'Luna', 'Nova', 'Ziggy', 'Momo',
  'Simba', 'Mochi', 'Loki', 'Pepper', 'Tofu', 'Biscuit',
]

const STRATEGIES = Object.keys(STRATEGY_META)
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h']

const PRESET_TASKS = SYMBOLS.flatMap((symbol) =>
  STRATEGIES.map((strategy) => ({
    id: `${symbol}-${strategy}`,
    symbol,
    strategy,
    timeframe: '15m',
  })),
)

function suggestName(existingNames) {
  const taken = new Set(existingNames)
  return CAT_NAME_POOL.find((n) => !taken.has(n)) ?? `Cat ${existingNames.length + 1}`
}

const STATUS_LABEL = {
  running: 'Working',
  paused: 'Paused',
  error: 'Error',
  idle: 'Idle',
  stopped: 'Idle',
}

/** True while an agent's logs show a pipeline stage more recent than its last finished signal. */
function isWorking(logsForAgent) {
  const lastPipelineLog = logsForAgent.find((l) => PIPELINE_STEP_KEYS.includes(l.step))
  if (!lastPipelineLog) return false
  const lastSignalLog = logsForAgent.find((l) => l.step === 'signal')
  return !lastSignalLog || lastSignalLog.time < lastPipelineLog.time
}

function AddCatPopover({ existingNames, onCreate, isPending }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const handleOpenChange = (next) => {
    setOpen(next)
    if (next) setName(suggestName(existingNames))
  }

  const handleCreate = () => {
    const finalName = name.trim() || suggestName(existingNames)
    onCreate({ name: finalName, catSeed: finalName.toLowerCase() })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Add cat
          </Button>
        }
      />
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>New agent</PopoverTitle>
          <PopoverDescription>Give it a name, then drag a task onto it to put it to work.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 flex items-center gap-2">
          <CatAvatar seed={name || 'cat'} status="idle" size={36} />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
        </div>
        <Button className="mt-3 w-full" onClick={handleCreate} disabled={isPending}>
          Add to room
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function CustomTaskPopover({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState(SYMBOLS[0])
  const [strategy, setStrategy] = useState(STRATEGIES[0])
  const [timeframe, setTimeframe] = useState('15m')

  const handleCreate = () => {
    onCreate({ id: `custom-${Date.now()}`, symbol, strategy, timeframe })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm">
            <Settings2 className="size-4" /> Custom task
          </Button>
        }
      />
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>Custom task</PopoverTitle>
        </PopoverHeader>
        <div className="mt-3 space-y-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => <SelectItem key={s} value={s}>{STRATEGY_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-3 w-full" size="sm" onClick={handleCreate}>
          Add to backlog
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function CatDesk({ agent, isSelected, isDragOver, working, onSelect, onDragOver, onDragLeave, onDrop, onRemove, onViewWork }) {
  const status = agent.status ?? 'idle'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(agent.id)}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        onDragOver(agent.id)
      }}
      onDragLeave={() => onDragLeave(agent.id)}
      onDrop={(e) => {
        e.preventDefault()
        const data = e.dataTransfer.getData('application/json')
        if (data) onDrop(agent.id, JSON.parse(data))
      }}
      className={cn(
        'group relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition-colors',
        isDragOver ? 'border-primary bg-primary/5' : 'border-transparent',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50',
      )}
    >
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewWork(agent.id)
                }}
              >
                <Eye className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>See what it's doing</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(agent.id)
                }}
              >
                <X className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>Remove agent</TooltipContent>
        </Tooltip>
      </div>

      <CatAvatar seed={agent.catSeed ?? agent.name} status={status} working={working} size={56} />

      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-medium">{agent.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {working ? 'Thinking…' : (agent.symbol ?? '—')}
        </p>
      </div>

      <Badge
        variant={status === 'running' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
        className={cn('gap-1 text-[10px]', status === 'running' && 'bg-emerald-600 hover:bg-emerald-600')}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            status === 'running' ? 'bg-white' : status === 'error' ? 'bg-white' : 'bg-foreground/40',
          )}
        />
        {STATUS_LABEL[status] ?? 'Idle'}
      </Badge>
    </div>
  )
}

export function AgentRoom({ agents, logs, selectedId, onSelect, onAssign, onCreateCat, onRemoveCat, isCreating }) {
  const [customTasks, setCustomTasks] = useState([])
  const [dragOverId, setDragOverId] = useState(null)
  const [viewWorkId, setViewWorkId] = useState(null)

  const backlog = useMemo(() => [...customTasks, ...PRESET_TASKS], [customTasks])
  const existingNames = useMemo(() => (agents ?? []).map((a) => a.name), [agents])

  const logsByAgent = useMemo(() => {
    const map = {}
    for (const agent of agents ?? []) map[agent.id] = logs.filter((l) => l.agentId === agent.id)
    return map
  }, [agents, logs])

  const viewWorkAgent = (agents ?? []).find((a) => a.id === viewWorkId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Agent Room</CardTitle>
        <AddCatPopover existingNames={existingNames} onCreate={onCreateCat} isPending={isCreating} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Drag a task card onto a cat to assign it &mdash; the agent reconfigures and starts automatically.
            Hover a cat and click the eye to watch it think.
          </p>
          <div className="flex flex-wrap gap-3">
            {(agents ?? []).map((agent) => (
              <CatDesk
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedId}
                isDragOver={dragOverId === agent.id}
                working={isWorking(logsByAgent[agent.id] ?? [])}
                onSelect={onSelect}
                onDragOver={setDragOverId}
                onDragLeave={() => setDragOverId((id) => (id === agent.id ? null : id))}
                onDrop={(id, task) => {
                  setDragOverId(null)
                  onAssign(id, task)
                }}
                onRemove={onRemoveCat}
                onViewWork={setViewWorkId}
              />
            ))}
            {!agents?.length && (
              <p className="py-6 text-sm text-muted-foreground">
                No agents yet &mdash; add one to start building the room.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Task backlog</p>
            <CustomTaskPopover onCreate={(task) => setCustomTasks((prev) => [task, ...prev])} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {backlog.map((task) => (
              <div key={task.id} className="w-40 shrink-0">
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <Sheet open={!!viewWorkId} onOpenChange={(open) => !open && setViewWorkId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              {viewWorkAgent && (
                <CatAvatar
                  seed={viewWorkAgent.catSeed ?? viewWorkAgent.name}
                  status={viewWorkAgent.status}
                  working={isWorking(logsByAgent[viewWorkId] ?? [])}
                  size={36}
                />
              )}
              <SheetTitle>{viewWorkAgent?.name ?? 'Agent'}&rsquo;s work</SheetTitle>
            </div>
            <SheetDescription>
              Live pipeline for {viewWorkAgent?.symbol ?? 'this agent'} &mdash; Market Analyst through Coordinator.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AgentPipeline logs={logsByAgent[viewWorkId] ?? []} />
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
