import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatUsd } from '@/lib/format'

const PAGE_SIZE = 10

const COLUMNS = [
  { key: 'time', label: 'Time' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'signal', label: 'Signal' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'entry', label: 'Entry' },
  { key: 'stopLoss', label: 'SL' },
  { key: 'takeProfit', label: 'TP' },
  { key: 'result', label: 'Result' },
  { key: 'pnl', label: 'PnL' },
]

const SIGNAL_VARIANT = {
  BUY: 'default',
  SELL: 'destructive',
  HOLD: 'secondary',
}

function toCsv(rows) {
  const header = COLUMNS.map((c) => c.label).join(',')
  const lines = rows.map((r) =>
    COLUMNS.map((c) => {
      const v = c.key === 'time' ? formatDateTime(r.time) : r[c.key]
      return `"${String(v ?? '').replace(/"/g, '""')}"`
    }).join(','),
  )
  return [header, ...lines].join('\n')
}

export function SignalHistory({ signals, isLoading, isError, onRetry }) {
  const [sortKey, setSortKey] = useState('time')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    const rows = [...(signals ?? [])]
    rows.sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [signals, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  const handleExport = () => {
    const csv = toCsv(sorted)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signal-history-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Failed to load signal history</AlertTitle>
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
    return <Skeleton className="h-96 w-full" />
  }

  if (!signals?.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No signals generated yet.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col.key}>
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {formatDateTime(s.time)}
                </TableCell>
                <TableCell>{s.symbol}</TableCell>
                <TableCell>
                  <Badge variant={SIGNAL_VARIANT[s.signal]}>{s.signal}</Badge>
                </TableCell>
                <TableCell>{s.confidence}%</TableCell>
                <TableCell className="font-mono">{formatUsd(s.entry)}</TableCell>
                <TableCell className="font-mono text-red-500">{formatUsd(s.stopLoss)}</TableCell>
                <TableCell className="font-mono text-emerald-500">{formatUsd(s.takeProfit)}</TableCell>
                <TableCell className="whitespace-nowrap">{s.result}</TableCell>
                <TableCell
                  className={cn(
                    'font-mono',
                    s.pnl > 0 && 'text-emerald-500',
                    s.pnl < 0 && 'text-red-500',
                  )}
                >
                  {s.pnl != null ? formatUsd(s.pnl) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(page === 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className={cn(page === pageCount && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
