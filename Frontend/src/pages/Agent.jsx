import { useEffect, useMemo, useState } from 'react'
import { Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { AgentRoom } from '@/components/agent/AgentRoom'
import { AgentHeader } from '@/components/agent/AgentHeader'
import { KpiCards } from '@/components/agent/KpiCards'
import { CurrentSignal } from '@/components/agent/CurrentSignal'
import { AgentPipeline } from '@/components/agent/AgentPipeline'
import { EquityChart } from '@/components/agent/EquityChart'
import { AgentConfigForm } from '@/components/agent/AgentConfigForm'
import { ActivityLog } from '@/components/agent/ActivityLog'
import { SignalHistory } from '@/components/agent/SignalHistory'
import { OpenPositions } from '@/components/agent/OpenPositions'

import { useAgentStream } from '@/hooks/useAgentStream'
import {
  useAgentList,
  useCreateAgent,
  useRemoveAgent,
  useAssignTask,
  useStartAgent,
  usePauseAgent,
  useStopAgent,
  useRunOnce,
} from '@/hooks/useAgentStatus'
import {
  useAgentSignals,
  useAgentPositions,
  useAgentEquity,
  useClosePosition,
} from '@/hooks/useAgentSignals'
import { useAgentConfig, useSaveAgentConfig } from '@/hooks/useAgentConfig'
import { PIPELINE_STEP_KEYS } from '@/lib/agentPresets'

export function Agent() {
  const listQuery = useAgentList()
  const [selectedId, setSelectedId] = useState(null)

  const stream = useAgentStream()

  // Merge the REST list with live SSE status overlays, and default-select the
  // first agent once the room has loaded.
  const agents = useMemo(() => {
    const base = listQuery.data ?? []
    const merged = base.map((a) => ({ ...a, ...stream.statuses[a.id] }))
    for (const [id, status] of Object.entries(stream.statuses)) {
      if (!merged.some((a) => a.id === id)) merged.push(status)
    }
    return merged
  }, [listQuery.data, stream.statuses])

  useEffect(() => {
    if (!selectedId && agents.length) setSelectedId(agents[0].id)
    if (selectedId && agents.length && !agents.some((a) => a.id === selectedId)) {
      setSelectedId(agents[0]?.id ?? null)
    }
  }, [agents, selectedId])

  useEffect(() => {
    if (stream.roomChangeToken) listQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.roomChangeToken])

  const createMutation = useCreateAgent()
  const removeMutation = useRemoveAgent()
  const assignMutation = useAssignTask()
  const startMutation = useStartAgent()
  const pauseMutation = usePauseAgent()
  const stopMutation = useStopAgent()
  const runOnceMutation = useRunOnce()

  const signalsQuery = useAgentSignals(selectedId)
  const positionsQuery = useAgentPositions(selectedId)
  const equityQuery = useAgentEquity(selectedId)
  const configQuery = useAgentConfig(selectedId)
  const saveConfigMutation = useSaveAgentConfig(selectedId)
  const closePositionMutation = useClosePosition(selectedId)

  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    const latest = stream.logs.find((l) => l.agentId === selectedId)
    if (!latest) return
    if (PIPELINE_STEP_KEYS.includes(latest.step)) setIsThinking(true)
    if (latest.step === 'signal' || latest.step === 'error') setIsThinking(false)
  }, [stream.logs, selectedId])

  const selectedAgent = agents.find((a) => a.id === selectedId)
  const positions = positionsQuery.data ?? []

  const currentSignal = useMemo(() => {
    if (stream.latestSignals[selectedId]) return stream.latestSignals[selectedId]
    return signalsQuery.data?.[0] ?? null
  }, [stream.latestSignals, selectedId, signalsQuery.data])

  const selectedLogs = useMemo(
    () => stream.logs.filter((l) => l.agentId === selectedId),
    [stream.logs, selectedId],
  )

  const handleClosePosition = (position, currentPrice) => {
    closePositionMutation.mutate({ positionId: position.id, currentPrice })
  }

  return (
    <div className="flex flex-col gap-4">
      <AgentRoom
        agents={agents}
        logs={stream.logs}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAssign={(id, task) => assignMutation.mutate({ id, task })}
        onCreateCat={(data) => createMutation.mutate(data)}
        onRemoveCat={(id) => removeMutation.mutate(id)}
        isCreating={createMutation.isPending}
      />

      {selectedAgent && (
        <>
          <AgentHeader
            status={selectedAgent.status}
            hasOpenPositions={positions.length > 0}
            onStart={() => startMutation.mutate(selectedId)}
            onPause={() => pauseMutation.mutate(selectedId)}
            onStop={() => stopMutation.mutate(selectedId)}
            onRunOnce={() => runOnceMutation.mutate(selectedId)}
            isStarting={startMutation.isPending}
            isPausing={pauseMutation.isPending}
            isStopping={stopMutation.isPending}
            isRunningOnce={runOnceMutation.isPending}
          />

          <KpiCards
            status={selectedAgent}
            signals={signalsQuery.data}
            equity={equityQuery.data}
            isLoading={listQuery.isLoading}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <CurrentSignal
                signal={currentSignal}
                symbol={configQuery.data?.symbol ?? selectedAgent.symbol ?? 'BTCUSDT'}
                isThinking={isThinking}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {selectedAgent.name}&rsquo;s Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AgentPipeline logs={selectedLogs} />
                </CardContent>
              </Card>
              <EquityChart
                equity={equityQuery.data}
                isLoading={equityQuery.isLoading}
                isError={equityQuery.isError}
                onRetry={() => equityQuery.refetch()}
              />
            </div>

            <div className="lg:col-span-1">
              <AgentConfigForm
                config={configQuery.data}
                isLoading={configQuery.isLoading}
                isError={configQuery.isError}
                onRetry={() => configQuery.refetch()}
                onSave={(form) => saveConfigMutation.mutate(form)}
                isSaving={saveConfigMutation.isPending}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Bot className="size-4" /> {selectedAgent.name}&rsquo;s Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="activity">
                <TabsList>
                  <TabsTrigger value="activity">Activity Log</TabsTrigger>
                  <TabsTrigger value="history">Signal History</TabsTrigger>
                  <TabsTrigger value="positions">Open Positions</TabsTrigger>
                </TabsList>
                <TabsContent value="activity">
                  <ActivityLog logs={selectedLogs} onClear={() => stream.clearLogs(selectedId)} />
                </TabsContent>
                <TabsContent value="history">
                  <SignalHistory
                    signals={signalsQuery.data}
                    isLoading={signalsQuery.isLoading}
                    isError={signalsQuery.isError}
                    onRetry={() => signalsQuery.refetch()}
                  />
                </TabsContent>
                <TabsContent value="positions">
                  <OpenPositions
                    positions={positionsQuery.data}
                    isLoading={positionsQuery.isLoading}
                    isError={positionsQuery.isError}
                    onRetry={() => positionsQuery.refetch()}
                    onClose={handleClosePosition}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      <Alert>
        <AlertTitle>Paper trading only</AlertTitle>
        <AlertDescription>AI output is not financial advice.</AlertDescription>
      </Alert>
    </div>
  )
}
