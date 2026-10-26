import { useEffect, useRef, useState } from 'react'

const MAX_LOGS = 400
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 15000

/**
 * Subscribes to the room-wide SSE stream (/api/agent/stream), which carries
 * events for every agent instance tagged with `agentId`. Auto-reconnects
 * with exponential backoff on drop.
 */
export function useAgentStream() {
  const [logs, setLogs] = useState([])
  const [statuses, setStatuses] = useState({}) // id -> status payload
  const [latestSignals, setLatestSignals] = useState({}) // id -> signal
  const [latestPositionEvents, setLatestPositionEvents] = useState({}) // id -> payload
  const [roomChangeToken, setRoomChangeToken] = useState(0)
  const [connected, setConnected] = useState(false)

  const attemptRef = useRef(0)

  useEffect(() => {
    let es = null
    let reconnectTimer = null
    let closed = false

    const connect = () => {
      es = new EventSource('/api/agent/stream')

      es.onopen = () => {
        attemptRef.current = 0
        setConnected(true)
      }

      es.addEventListener('snapshot', (e) => {
        const list = JSON.parse(e.data)
        setStatuses(Object.fromEntries(list.map((s) => [s.id, s])))
      })

      es.addEventListener('log', (e) => {
        const { agentId, payload } = JSON.parse(e.data)
        setLogs((prev) => [{ ...payload, agentId }, ...prev].slice(0, MAX_LOGS))
      })

      es.addEventListener('signal', (e) => {
        const { agentId, payload } = JSON.parse(e.data)
        setLatestSignals((prev) => ({ ...prev, [agentId]: payload }))
      })

      es.addEventListener('position', (e) => {
        const { agentId, payload } = JSON.parse(e.data)
        setLatestPositionEvents((prev) => ({ ...prev, [agentId]: payload }))
      })

      es.addEventListener('status', (e) => {
        const { agentId, payload } = JSON.parse(e.data)
        setStatuses((prev) => ({ ...prev, [agentId]: payload }))
      })

      es.addEventListener('created', () => setRoomChangeToken((t) => t + 1))
      es.addEventListener('removed', (e) => {
        const { agentId } = JSON.parse(e.data)
        setStatuses((prev) => {
          const next = { ...prev }
          delete next[agentId]
          return next
        })
        setRoomChangeToken((t) => t + 1)
      })

      es.onerror = () => {
        setConnected(false)
        es?.close()
        if (closed) return
        const attempt = attemptRef.current + 1
        attemptRef.current = attempt
        const delay = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS)
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [])

  const clearLogs = (agentId) => {
    setLogs((prev) => (agentId ? prev.filter((l) => l.agentId !== agentId) : []))
  }

  return {
    logs,
    statuses,
    latestSignals,
    latestPositionEvents,
    roomChangeToken,
    connected,
    clearLogs,
  }
}
