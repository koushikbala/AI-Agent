import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Bell, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatUsd } from '@/lib/format'

function storageKey(symbol) {
  return `crypto-app-alert-${symbol}`
}

export function PriceAlert({ symbol, price }) {
  const [target, setTarget] = useState(() => {
    const stored = window.localStorage.getItem(storageKey(symbol))
    return stored ? Number(stored) : null
  })
  const [input, setInput] = useState('')
  const prevPriceRef = useRef(price)

  const clearAlert = useCallback(() => {
    window.localStorage.removeItem(storageKey(symbol))
    setTarget(null)
  }, [symbol])

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(symbol))
    setTarget(stored ? Number(stored) : null)
    prevPriceRef.current = null
  }, [symbol])

  useEffect(() => {
    if (target == null || price == null) {
      prevPriceRef.current = price
      return
    }
    const prev = prevPriceRef.current
    if (prev != null) {
      const crossedUp = prev < target && price >= target
      const crossedDown = prev > target && price <= target
      if (crossedUp || crossedDown) {
        toast.success(`${symbol} crossed ${formatUsd(target)}`, {
          description: `Current price: ${formatUsd(price)}`,
          icon: <Bell className="size-4" />,
        })
        clearAlert()
      }
    }
    prevPriceRef.current = price
  }, [price, target, symbol, clearAlert])

  const setAlert = () => {
    const value = Number(input)
    if (!value || Number.isNaN(value)) return
    window.localStorage.setItem(storageKey(symbol), String(value))
    setTarget(value)
    prevPriceRef.current = price
    setInput('')
    toast.info(`Alert set for ${formatUsd(value)}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Price Alert</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Target price (USD)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setAlert()}
          className="max-w-48"
        />
        <Button onClick={setAlert} disabled={!input}>
          <Bell className="size-4" /> Set Alert
        </Button>
        {target != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Watching <span className="font-mono text-foreground">{formatUsd(target)}</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" onClick={clearAlert}>
                  <X className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear alert</TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
