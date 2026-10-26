import { RSI, EMA, MACD, ATR } from 'technicalindicators'

/**
 * Computes the indicator set the agent prompt is built from, given an
 * ascending array of klines ({ open, high, low, close, volume, time }).
 */
export function computeIndicators(klines) {
  const closes = klines.map((k) => k.close)
  const highs = klines.map((k) => k.high)
  const lows = klines.map((k) => k.low)
  const volumes = klines.map((k) => k.volume)

  const rsi = RSI.calculate({ period: 14, values: closes })
  const ema20 = EMA.calculate({ period: 20, values: closes })
  const ema50 = EMA.calculate({ period: 50, values: closes })
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })
  const atr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes })

  const last = (arr) => (arr.length ? arr[arr.length - 1] : null)

  const recentVolume = volumes.slice(-10)
  const olderVolume = volumes.slice(-30, -10)
  const avgRecent = recentVolume.reduce((a, b) => a + b, 0) / (recentVolume.length || 1)
  const avgOlder = olderVolume.reduce((a, b) => a + b, 0) / (olderVolume.length || 1)
  const volumeTrend = avgOlder ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0

  return {
    rsi14: last(rsi),
    ema20: last(ema20),
    ema50: last(ema50),
    macd: last(macd),
    atr14: last(atr),
    volumeTrendPct: Number(volumeTrend.toFixed(2)),
    lastClose: last(closes),
  }
}
