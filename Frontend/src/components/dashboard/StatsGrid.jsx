import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { formatNumber, formatUsd } from '@/lib/format'

const STAT_DEFS = [
  { key: 'high', label: '24h High', format: (v) => formatUsd(v) },
  { key: 'low', label: '24h Low', format: (v) => formatUsd(v) },
  { key: 'volume', label: 'Volume (BTC)', format: (v, base) => `${formatNumber(v)} ${base}` },
  { key: 'quoteVolume', label: 'Quote Volume (USDT)', format: (v) => formatUsd(v) },
]

export function StatsGrid({ stats, baseAsset, isLoading, isError, onRetry }) {
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Failed to load market stats</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>Could not reach Binance API.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAT_DEFS.map((def) => (
        <Card key={def.key} className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {def.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold tracking-tight tabular-nums">
                {def.format(stats[def.key], baseAsset)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
