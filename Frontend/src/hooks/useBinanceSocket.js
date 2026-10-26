import { useEffect, useRef, useState } from 'react'
import { buildStreamUrl } from '@/lib/binance'

const MAX_BACKOFF_MS = 30000
const BASE_BACKOFF_MS = 1000

/**
 * Connects to the combined Binance mini-ticker/trade/depth/kline stream for
 * a symbol + kline interval. Auto-reconnects with exponential backoff,
 * supports pause/resume (closes the socket while paused), and cleans up on
 * unmount or symbol/interval change.
 *
 * `onMessage` is called with the parsed { stream, data } payload.
 */
export function useBinanceSocket({ symbol, interval, paused, onMessage }) {
  const [status, setStatus] = useState('connecting') // connecting | open | closed | error | paused
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (paused) {
      setStatus('paused')
      return
    }

    let ws = null
    let attempt = 0
    let reconnectTimer = null
    let closedByCleanup = false

    const connect = () => {
      setStatus('connecting')
      const url = buildStreamUrl(symbol, interval)
      ws = new WebSocket(url)

      ws.onopen = () => {
        attempt = 0
        setStatus('open')
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          onMessageRef.current?.(payload)
        } catch {
          // ignore malformed frame
        }
      }

      ws.onerror = () => {
        setStatus('error')
      }

      ws.onclose = () => {
        if (closedByCleanup) return
        setStatus('closed')
        attempt += 1
        const delay = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS)
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        ws.close()
      }
    }
  }, [symbol, interval, paused])

  return { status }
}
