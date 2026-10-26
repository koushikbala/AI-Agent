import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatUsd } from '@/lib/format'

function formatUptime(ms) {
  if (!ms) return '—'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}h ${m}m ${s}s`
}

function formatLastRun(ts) {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false })
}

export function KpiCards({ status, signals, equity, isLoading }) {
  const todaysSignals = (signals ?? []).filter(
    (s) => new Date(s.time).toDateString() === new Date().toDateString(),
  )
  const buyCount = todaysSignals.filter((s) => s.signal === 'BUY').length
  const sellCount = todaysSignals.filter((s) => s.signal === 'SELL').length
  const holdCount = todaysSignals.filter((s) => s.signal === 'HOLD').length

  const closedSignals = (signals ?? []).filter((s) => s.result === 'Win' || s.result === 'Loss')
  const wins = closedSignals.filter((s) => s.result === 'Win').length
  const winRate = closedSignals.length ? (wins / closedSignals.length) * 100 : 0

  const startBalance = equity?.[0]?.balance ?? 10000
  const currentBalance = equity?.length ? equity[equity.length - 1].balance : startBalance
  const pnl = currentBalance - startBalance
  const pnlPct = startBalance ? (pnl / startBalance) * 100 : 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-semibold capitalize tracking-tight">{status?.status ?? 'stopped'}</p>
              <p className="text-xs text-muted-foreground">Uptime: {formatUptime(status?.uptimeMs)}</p>
              <p className="text-xs text-muted-foreground">Last run: {formatLastRun(status?.lastRunAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Signals Today</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-2">
              <p className="text-2xl font-semibold tabular-nums">{todaysSignals.length}</p>
              <div className="flex gap-1.5">
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                  {buyCount} BUY
                </Badge>
                <Badge variant="destructive">{sellCount} SELL</Badge>
                <Badge variant="secondary">{holdCount} HOLD</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-2">
              <p className="text-2xl font-semibold tabular-nums">{winRate.toFixed(0)}%</p>
              <Progress value={winRate} />
              <p className="text-xs text-muted-foreground">
                {wins} / {closedSignals.length} closed trades
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Paper PnL</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-1">
              <p className={cn('text-2xl font-semibold tabular-nums', pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {formatUsd(pnl)}
              </p>
              <Badge
                variant={pnlPct >= 0 ? 'default' : 'destructive'}
                className={cn(pnlPct >= 0 && 'bg-emerald-600 hover:bg-emerald-600')}
              >
                {pnlPct >= 0 ? '+' : ''}
                {pnlPct.toFixed(2)}%
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
