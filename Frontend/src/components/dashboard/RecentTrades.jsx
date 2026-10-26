import { memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatTime, formatUsd } from '@/lib/format'

export const RecentTrades = memo(function RecentTrades({ trades, isLoading, isError, onRetry }) {
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Failed to load recent trades</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>Could not reach Binance API.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !trades?.length) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <ScrollArea className="h-96">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Side</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.slice(0, 50).map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatTime(t.time)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-mono tabular-nums',
                  t.isBuyerMaker ? 'text-red-500' : 'text-emerald-500',
                )}
              >
                {formatUsd(t.price)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatNumber(t.qty, 5)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-medium',
                  t.isBuyerMaker ? 'text-red-500' : 'text-emerald-500',
                )}
              >
                {t.isBuyerMaker ? 'Sell' : 'Buy'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
})
