import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatUsd } from '@/lib/format'

const SIGNAL_STYLES = {
  BUY: 'bg-emerald-600 hover:bg-emerald-600',
  SELL: 'bg-red-600 hover:bg-red-600',
  HOLD: 'bg-muted text-muted-foreground hover:bg-muted',
}

export function CurrentSignal({ signal, symbol, isThinking }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Current Signal</CardTitle>
        {isThinking && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Analyzing...
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isThinking && !signal ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : !signal ? (
          <p className="text-sm text-muted-foreground">
            No signal yet. Start the agent or click &ldquo;Run once&rdquo; to generate one.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={cn('px-3 py-1 text-sm', SIGNAL_STYLES[signal.signal])}>
                {signal.signal}
              </Badge>
              <span className="text-sm font-medium">{symbol}</span>
              <span className="text-sm text-muted-foreground">@ {formatUsd(signal.entry)}</span>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence</span>
                <span>{signal.confidence}%</span>
              </div>
              <Progress value={signal.confidence} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Entry</p>
                <p className="font-mono">{formatUsd(signal.entry)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stop Loss</p>
                <p className="font-mono text-red-500">{formatUsd(signal.stopLoss)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Take Profit</p>
                <p className="font-mono text-emerald-500">{formatUsd(signal.takeProfit)}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">AI Reasoning</p>
              <p className="text-sm leading-relaxed">{signal.reasoning}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
