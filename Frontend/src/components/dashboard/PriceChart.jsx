import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { INTERVALS } from '@/lib/binance'
import { formatTime, formatUsd } from '@/lib/format'

const chartConfig = {
  close: {
    label: 'Price',
    color: 'var(--primary)',
  },
}

export function PriceChart({ klines, interval, onIntervalChange, isLoading, isError, onRetry }) {
  const data = useMemo(
    () => (klines ?? []).map((k) => ({ time: k.time, close: k.close })),
    [klines],
  )

  const domain = useMemo(() => {
    if (!data.length) return undefined
    const closes = data.map((d) => d.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const pad = (max - min) * 0.1 || max * 0.01
    return [min - pad, max + pad]
  }, [data])

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-sm font-medium">Price Chart</CardTitle>
        <ToggleGroup
          type="single"
          value={interval}
          onValueChange={(v) => v && onIntervalChange(v)}
          size="sm"
          variant="outline"
        >
          {INTERVALS.map((i) => (
            <ToggleGroupItem key={i} value={i} aria-label={i}>
              {i}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Failed to load chart data</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Could not reach Binance API.</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCw className="size-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading || !data.length ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={data} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-close)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-close)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={domain}
                tickFormatter={(v) => formatUsd(v)}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => formatTime(v)}
                    formatter={(value) => formatUsd(value)}
                  />
                }
              />
              <Area
                dataKey="close"
                type="monotone"
                fill="url(#fillClose)"
                stroke="var(--color-close)"
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
