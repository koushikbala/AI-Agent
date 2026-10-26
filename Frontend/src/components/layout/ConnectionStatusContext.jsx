import { createContext, useContext, useMemo, useState } from 'react'

const ConnectionStatusContext = createContext(null)

/** Lets a page (e.g. Dashboard) publish its websocket status for the topbar badge. */
export function ConnectionStatusProvider({ children }) {
  const [status, setStatus] = useState(null)
  const value = useMemo(() => ({ status, setStatus }), [status])
  return (
    <ConnectionStatusContext.Provider value={value}>
      {children}
    </ConnectionStatusContext.Provider>
  )
}

export function useConnectionStatus() {
  const ctx = useContext(ConnectionStatusContext)
  if (!ctx) throw new Error('useConnectionStatus must be used within ConnectionStatusProvider')
  return ctx
}
