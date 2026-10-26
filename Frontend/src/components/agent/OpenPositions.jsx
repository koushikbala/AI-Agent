import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatUsd } from '@/lib/format'

/** Lightweight single-stream miniTicker subscription, scoped to this table. */
function useLivePrices(streamKey) {
  const [prices, setPrices] = useState({})

  useEffect(() => {
    if (!streamKey) return
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamKey}`)
    ws.onmessage = (event) => {
      try {
        const { data } = JSON.parse(event.data)
        if (data?.s && data?.c) {
          setPrices((prev) => ({ ...prev, [data.s]: Number(data.c) }))
        }
      } catch {
        // ignore malformed frame
      }
    }
    return () => ws.close()
  }, [streamKey])

  return prices
}

export function OpenPositions({ positions, isLoading, isError, onRetry, onClose }) {
  const symbols = useMemo(() => [...new Set((positions ?? []).map((p) => p.symbol))], [positions])
  const streamKey = useMemo(
    () => (symbols.length ? symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join('/') : null),
    [symbols],
  )
  const prices = useLivePrices(streamKey)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Failed to load open positions</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>Could not reach the agent server.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!positions?.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No open paper positions.</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Entry</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Unrealized PnL</TableHead>
            <TableHead className="text-right">Close</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => {
            const current = prices[p.symbol] ?? p.entry
            const direction = p.side === 'BUY' ? 1 : -1
            const unrealized = (current - p.entry) * p.size * direction
            return (
              <TableRow key={p.id}>
                <TableCell>{p.symbol}</TableCell>
                <TableCell>
                  <Badge variant={p.side === 'BUY' ? 'default' : 'destructive'} className={cn(p.side === 'BUY' && 'bg-emerald-600 hover:bg-emerald-600')}>
                    {p.side}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{formatNumber(p.size, 5)}</TableCell>
                <TableCell className="text-right font-mono">{formatUsd(p.entry)}</TableCell>
                <TableCell className="text-right font-mono">{formatUsd(current)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono',
                    unrealized >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {formatUsd(unrealized)}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <X className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close this paper position?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Closes {p.side} {p.symbol} at the current price ({formatUsd(current)}). This is
                          a simulated close — no real order is placed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onClose(p, current)}>Close position</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
