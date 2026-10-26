import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatPercent, formatUsd } from '@/lib/format'

export function PriceCard({ symbol, price, changePercent, isLoading }) {
  const [flash, setFlash] = useState(null) // 'up' | 'down' | null
  const prevPriceRef = useRef(price)

  useEffect(() => {
    if (price == null) return
    const prev = prevPriceRef.current
    if (prev != null && price !== prev) {
      setFlash(price > prev ? 'up' : 'down')
      const timer = setTimeout(() => setFlash(null), 500)
      prevPriceRef.current = price
      return () => clearTimeout(timer)
    }
    prevPriceRef.current = price
  }, [price])

  const handleCopy = async () => {
    if (price == null) return
    await navigator.clipboard.writeText(String(price))
    toast.success('Price copied to clipboard', { description: formatUsd(price) })
  }

  const isUp = Number(changePercent) >= 0

  return (
    <Card className="market-hero border-primary/15 shadow-lg shadow-primary/5">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {symbol} / USDT
          </CardTitle>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="live-dot size-1.5" />
            Live market price
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCopy}
              disabled={price == null}
            >
              <Copy className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy price</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
        {isLoading && price == null ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span
                className={cn(
                  'text-4xl font-semibold tracking-tight tabular-nums transition-colors duration-300 sm:text-5xl',
                  flash === 'up' && 'text-emerald-500',
                  flash === 'down' && 'text-red-500',
                )}
              >
                {formatUsd(price)}
              </span>
              {changePercent != null && (
                <Badge
                  variant={isUp ? 'default' : 'destructive'}
                  className={cn('mb-1 gap-1', isUp && 'bg-emerald-600 hover:bg-emerald-600')}
                >
                  {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {formatPercent(changePercent)}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">24 hour change</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
