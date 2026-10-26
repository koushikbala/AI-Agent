import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { SYMBOLS } from '@/lib/binance'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h']
const STRATEGIES = [
  { value: 'trend', label: 'Trend Following' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'custom', label: 'Custom prompt' },
]
const MODELS = ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5']
const RUN_EVERY = [1, 5, 15, 60]

export function AgentConfigForm({ config, isLoading, isError, onRetry, onSave, isSaving }) {
  const [form, setForm] = useState(config ?? null)

  useEffect(() => {
    if (config) setForm(config)
  }, [config])

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleSave = () => {
    if (form) onSave(form)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agent Config</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Failed to load config</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Could not reach the agent server.</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCw className="size-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading || !form ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Symbol</Label>
              <Select value={form.symbol} onValueChange={(v) => update({ symbol: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Timeframe</Label>
              <Select value={form.timeframe} onValueChange={(v) => update({ timeframe: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Select value={form.strategy} onValueChange={(v) => update({ strategy: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.strategy === 'custom' && (
              <div className="space-y-1.5">
                <Label>Custom system prompt</Label>
                <Textarea
                  value={form.customPrompt}
                  onChange={(e) => update({ customPrompt: e.target.value })}
                  placeholder="Describe the exact strategy the agent should follow..."
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>LLM model</Label>
              <Select value={form.model} onValueChange={(v) => update({ model: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-xs text-muted-foreground">{form.temperature.toFixed(2)}</span>
              </div>
              <Slider
                value={[form.temperature]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => update({ temperature: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Run every</Label>
              <Select
                value={String(form.runEveryMinutes)}
                onValueChange={(v) => update({ runEveryMinutes: Number(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_EVERY.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Risk per trade</Label>
                <span className="text-xs text-muted-foreground">{form.riskPerTradePct.toFixed(1)}%</span>
              </div>
              <Slider
                value={[form.riskPerTradePct]}
                min={0.1}
                max={10}
                step={0.1}
                onValueChange={([v]) => update({ riskPerTradePct: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Max open positions</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.maxOpenPositions}
                onChange={(e) => update({ maxOpenPositions: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="mb-0.5 block">Paper trading</Label>
                <p className="text-xs text-muted-foreground">The agent never places real orders.</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Switch checked disabled />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Live trading is disabled</TooltipContent>
              </Tooltip>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              Save config
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
