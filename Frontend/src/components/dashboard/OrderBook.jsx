import { memo, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatUsd } from '@/lib/format'

const ROWS = 15

function Side({ rows, side }) {
  const isBid = side === 'bid'
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={cn(isBid ? 'text-emerald-500' : 'text-red-500')}>
            Price
          </TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.price}>
            <TableCell className={cn('font-mono tabular-nums', isBid ? 'text-emerald-500' : 'text-red-500')}>
              {formatUsd(row.price)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatNumber(row.amount, 5)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatNumber(row.total, 4)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const OrderBook = memo(function OrderBook({ bids, asks, isLoading, isError, onRetry }) {
  const { bidRows, askRows, spread } = useMemo(() => {
    const toRows = (levels) => {
      let cumulative = 0
      return levels.slice(0, ROWS).map(([price, amount]) => {
        const p = Number(price)
        const a = Number(amount)
        cumulative += p * a
        return { price: p, amount: a, total: cumulative }
      })
    }
    const bidRows = toRows(bids ?? [])
    const askRows = toRows(asks ?? [])
    const spread =
      bidRows.length && askRows.length ? askRows[0].price - bidRows[0].price : null
    return { bidRows, askRows, spread }
  }, [bids, asks])

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Failed to load order book</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>Could not reach Binance API.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || (!bidRows.length && !askRows.length)) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Side rows={bidRows} side="bid" />
        <Side rows={askRows} side="ask" />
      </div>
      {spread != null && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Spread: <span className="font-mono">{formatUsd(spread, { precise: true })}</span>
        </p>
      )}
    </div>
  )
})
