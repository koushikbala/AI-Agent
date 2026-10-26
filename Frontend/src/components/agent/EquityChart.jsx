import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { formatDateTime, formatUsd } from '@/lib/format'

const RANGE_MS = {
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
}

const chartConfig = {
  balance: {
    label: 'Paper Balance',
    color: 'var(--primary)',
  },
}

export function EquityChart({ equity, isLoading, isError, onRetry }) {
  const [range, setRange] = useState('1D')

  const data = useMemo(() => {
    if (!equity?.length) return []
    const latestTime = equity[equity.length - 1].time
    const cutoff = latestTime - RANGE_MS[range]
    const filtered = equity.filter((p) => p.time >= cutoff)
    return (filtered.length ? filtered : equity).map((p) => ({ time: p.time, balance: p.balance }))
  }, [equity, range])

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-sm font-medium">Paper Equity</CardTitle>
        <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v)} size="sm" variant="outline">
          {Object.keys(RANGE_MS).map((r) => (
            <ToggleGroupItem key={r} value={r}>
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Failed to load equity data</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Could not reach the agent server.</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCw className="size-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !data.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No equity history yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(v) => new Date(v).toLocaleTimeString('en-US', { hour12: false })}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis tickFormatter={(v) => formatUsd(v)} tickLine={false} axisLine={false} width={90} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => formatDateTime(v)}
                    formatter={(value) => formatUsd(value)}
                  />
                }
              />
              <Area
                dataKey="balance"
                type="monotone"
                fill="url(#fillBalance)"
                stroke="var(--color-balance)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
