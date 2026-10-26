// Binance public REST + WS helpers. No API key required.

export const REST_BASES = [
  'https://api.binance.com',
  'https://data-api.binance.vision',
]

export const WS_BASE = 'wss://stream.binance.com:9443/stream?streams='

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d']

/**
 * Fetch JSON from Binance REST, trying each base URL in order until one
 * succeeds. Throws the last error if all fail.
 */
export async function binanceFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  let lastError
  for (const base of REST_BASES) {
    try {
      const res = await fetch(`${base}${path}?${qs}`)
      if (!res.ok) {
        throw new Error(`Binance request failed: ${res.status} ${res.statusText}`)
      }
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export function fetchTicker24hr(symbol) {
  return binanceFetch('/api/v3/ticker/24hr', { symbol })
}

export function fetchKlines(symbol, interval, limit = 200) {
  return binanceFetch('/api/v3/klines', { symbol, interval, limit })
}

export function fetchDepth(symbol, limit = 20) {
  return binanceFetch('/api/v3/depth', { symbol, limit })
}

export function fetchTrades(symbol, limit = 30) {
  return binanceFetch('/api/v3/trades', { symbol, limit })
}

/** Builds the combined stream path for a symbol + kline interval. */
export function buildStreamUrl(symbol, interval) {
  const s = symbol.toLowerCase()
  const streams = [
    `${s}@miniTicker`,
    `${s}@trade`,
    `${s}@depth20@100ms`,
    `${s}@kline_${interval}`,
  ]
  return `${WS_BASE}${streams.join('/')}`
}

/** Normalizes a raw kline array (REST) into an object. */
export function parseRestKline(k) {
  return {
    time: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: k[6],
  }
}

/** Normalizes a streamed kline payload (WS "k" object) into an object. */
export function parseWsKline(k) {
  return {
    time: k.t,
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
    closeTime: k.T,
    isFinal: k.x,
  }
}
