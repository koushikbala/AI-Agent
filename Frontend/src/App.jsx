import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConnectionStatusProvider } from '@/components/layout/ConnectionStatusContext'
import { useTheme } from '@/components/layout/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { Dashboard } from '@/pages/Dashboard'
import { Agent } from '@/pages/Agent'
import { ComingSoon } from '@/pages/ComingSoon'
import { NotFound } from '@/pages/NotFound'

function App() {
  const { theme } = useTheme()

  return (
    <ConnectionStatusProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/markets" element={<ComingSoon title="Markets" />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/agent/signals" element={<ComingSoon title="Signals" />} />
          <Route path="/agent/logs" element={<ComingSoon title="Agent Logs" />} />
          <Route path="/history" element={<ComingSoon title="Trade History" />} />
          <Route path="/alerts" element={<ComingSoon title="Alerts" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster theme={theme} position="bottom-right" />
    </ConnectionStatusProvider>
  )
}

export default App
