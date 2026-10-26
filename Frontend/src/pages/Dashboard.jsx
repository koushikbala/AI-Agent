import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Activity, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTicker } from '@/hooks/useTicker'
import { useKlines } from '@/hooks/useKlines'
import { useOrderBook } from '@/hooks/useOrderBook'
import { useTrades } from '@/hooks/useTrades'
import { useBinanceSocket } from '@/hooks/useBinanceSocket'
import { useConnectionStatus } from '@/components/layout/ConnectionStatusContext'
import { SYMBOLS, parseWsKline } from '@/lib/binance'

import { PriceCard } from '@/components/dashboard/PriceCard'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { PriceChart } from '@/components/dashboard/PriceChart'
import { OrderBook } from '@/components/dashboard/OrderBook'
import { RecentTrades } from '@/components/dashboard/RecentTrades'
import { PriceAlert } from '@/components/dashboard/PriceAlert'

const DEPTH_THROTTLE_MS = 250 // ~4 updates/sec
const MAX_TRADES = 50

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const symbol = searchParams.get('symbol') ?? 'BTCUSDT'
  const [interval, setInterval_] = useState('1m')
  const [paused, setPaused] = useState(false)

  const { setStatus: setConnectionStatus } = useConnectionStatus()
  const queryClient = useQueryClient()

  // REST queries
  const tickerQuery = useTicker(symbol)
  const klinesQuery = useKlines(symbol, interval)
  const orderBookQuery = useOrderBook(symbol)
  const tradesQuery = useTrades(symbol)

  // Live overlays from websocket
  const [liveTicker, setLiveTicker] = useState(null)
  const [liveTrades, setLiveTrades] = useState([])
  const [liveDepth, setLiveDepth] = useState(null)
  const [liveCandle, setLiveCandle] = useState(null)

  const depthBufferRef = useRef(null)
  const depthTimerRef = useRef(null)

  // Reset live state whenever symbol changes so stale data never leaks across symbols.
  useEffect(() => {
    setLiveTicker(null)
    setLiveTrades([])
    setLiveDepth(null)
    setLiveCandle(null)
  }, [symbol])

  useEffect(() => {
    setLiveCandle(null)
  }, [symbol, interval])

  const flushDepth = useCallback(() => {
    if (depthBufferRef.current) {
      setLiveDepth(depthBufferRef.current)
      depthBufferRef.current = null
    }
    depthTimerRef.current = null
  }, [])

  const handleMessage = useCallback(
    ({ stream, data }) => {
      if (!stream || !data) return
      const streamLower = stream.toLowerCase()
      if (streamLower.endsWith('@miniticker')) {
        setLiveTicker(data)
      } else if (streamLower.endsWith('@trade')) {
        setLiveTrades((prev) => {
          const next = [
            { id: data.t, time: data.T, price: Number(data.p), qty: Number(data.q), isBuyerMaker: data.m },
            ...prev,
          ]
          return next.slice(0, MAX_TRADES)
        })
      } else if (streamLower.includes('@depth20')) {
        depthBufferRef.current = { bids: data.bids, asks: data.asks }
        if (!depthTimerRef.current) {
          depthTimerRef.current = setTimeout(flushDepth, DEPTH_THROTTLE_MS)
        }
      } else if (streamLower.includes('@kline_')) {
        setLiveCandle(parseWsKline(data.k))
      }
    },
    [flushDepth],
  )

  useEffect(() => () => {
    if (depthTimerRef.current) clearTimeout(depthTimerRef.current)
  }, [])

  const { status } = useBinanceSocket({ symbol, interval, paused, onMessage: handleMessage })

  useEffect(() => {
    setConnectionStatus(status)
  }, [status, setConnectionStatus])

  // Merge REST + live data
  const livePrice = liveTicker ? Number(liveTicker.c) : null
  const restPrice = tickerQuery.data ? Number(tickerQuery.data.lastPrice) : null
  const price = livePrice ?? restPrice

  const changePercent = liveTicker
    ? ((Number(liveTicker.c) - Number(liveTicker.o)) / Number(liveTicker.o)) * 100
    : tickerQuery.data
      ? Number(tickerQuery.data.priceChangePercent)
      : null

  const stats = useMemo(() => {
    if (liveTicker) {
      return {
        high: Number(liveTicker.h),
        low: Number(liveTicker.l),
        volume: Number(liveTicker.v),
        quoteVolume: Number(liveTicker.q),
      }
    }
    if (tickerQuery.data) {
      return {
        high: Number(tickerQuery.data.highPrice),
        low: Number(tickerQuery.data.lowPrice),
        volume: Number(tickerQuery.data.volume),
        quoteVolume: Number(tickerQuery.data.quoteVolume),
      }
    }
    return null
  }, [liveTicker, tickerQuery.data])

  const chartData = useMemo(() => {
    const base = klinesQuery.data ?? []
    if (!liveCandle || !base.length) return base
    const last = base[base.length - 1]
    if (liveCandle.time === last.time) {
      return [...base.slice(0, -1), liveCandle]
    }
    if (liveCandle.time > last.time) {
      return [...base, liveCandle]
    }
    return base
  }, [klinesQuery.data, liveCandle])

  const trades = liveTrades.length ? liveTrades : (tradesQuery.data ?? []).slice().reverse()

  const orderBook = liveDepth ?? orderBookQuery.data

  const baseAsset = symbol.replace(/USDT$/, '')

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticker24hr', symbol] })
    queryClient.invalidateQueries({ queryKey: ['klines', symbol, interval] })
    queryClient.invalidateQueries({ queryKey: ['depth', symbol] })
    queryClient.invalidateQueries({ queryKey: ['trades', symbol] })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Market overview</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Live markets</h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground">
              <span className="live-dot" />
              Streaming data
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track price action, liquidity, and market momentum in one view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
          <Select
            value={symbol}
            onValueChange={(v) => setSearchParams({ symbol: v })}
          >
            <SelectTrigger className="h-9 w-40 border-0 bg-transparent shadow-none focus-visible:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYMBOLS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 px-2">
            <Switch id="live-toggle" checked={!paused} onCheckedChange={(v) => setPaused(!v)} />
            <Label htmlFor="live-toggle" className="text-xs text-muted-foreground">
              Live
            </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleRefresh} aria-label="Refresh market data">
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh market data</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <PriceCard
            symbol={symbol}
            price={price}
            changePercent={changePercent}
            isLoading={tickerQuery.isLoading}
          />

          <StatsGrid
            stats={stats}
            baseAsset={baseAsset}
            isLoading={tickerQuery.isLoading}
            isError={tickerQuery.isError}
            onRetry={() => tickerQuery.refetch()}
          />

          <PriceChart
            klines={chartData}
            interval={interval}
            onIntervalChange={setInterval_}
            isLoading={klinesQuery.isLoading}
            isError={klinesQuery.isError}
            onRetry={() => klinesQuery.refetch()}
          />

          <PriceAlert symbol={symbol} price={price} />
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="size-4 text-primary" />
                Order flow
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="orderbook">
                <TabsList>
                  <TabsTrigger value="orderbook">Order Book</TabsTrigger>
                  <TabsTrigger value="trades">Recent Trades</TabsTrigger>
                </TabsList>
                <TabsContent value="orderbook">
                  <OrderBook
                    bids={orderBook?.bids}
                    asks={orderBook?.asks}
                    isLoading={orderBookQuery.isLoading}
                    isError={orderBookQuery.isError}
                    onRetry={() => orderBookQuery.refetch()}
                  />
                </TabsContent>
                <TabsContent value="trades">
                  <RecentTrades
                    trades={trades}
                    isLoading={tradesQuery.isLoading}
                    isError={tradesQuery.isError}
                    onRetry={() => tradesQuery.refetch()}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
