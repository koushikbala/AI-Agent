import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { agentApi } from '@/lib/agentApi'

export function useAgentList() {
  return useQuery({
    queryKey: ['agent', 'list'],
    queryFn: agentApi.list,
    refetchInterval: 10000,
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: agentApi.create,
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success(`${agent.name} joined the room`)
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useRemoveAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: agentApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success('Agent removed')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useAgentStatus(id) {
  return useQuery({
    queryKey: ['agent', id, 'status'],
    queryFn: () => agentApi.getStatus(id),
    enabled: !!id,
    refetchInterval: 10000,
  })
}

function useAgentControlMutation(fn, successMessage) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, id) => {
      queryClient.setQueryData(['agent', id, 'status'], data)
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success(successMessage(data))
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useStartAgent() {
  return useAgentControlMutation(agentApi.start, (d) => `${d.name} started`)
}

export function usePauseAgent() {
  return useAgentControlMutation(agentApi.pause, (d) => `${d.name} paused`)
}

export function useStopAgent() {
  return useAgentControlMutation(agentApi.stop, (d) => `${d.name} stopped`)
}

/** Reconfigures an agent for a dropped task (symbol/strategy/timeframe) and starts it. */
export function useAssignTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, task }) => {
      const config = await agentApi.setConfig(id, {
        symbol: task.symbol,
        strategy: task.strategy,
        timeframe: task.timeframe,
      })
      const status = await agentApi.start(id)
      return { config, status }
    },
    onSuccess: ({ config, status }, { id }) => {
      queryClient.setQueryData(['agent', id, 'status'], status)
      queryClient.setQueryData(['agent', id, 'config'], config)
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success(`${status.name} assigned to ${config.symbol}`, {
        description: `${config.strategy.replace('_', ' ')} · ${config.timeframe}`,
      })
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useRunOnce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: agentApi.runOnce,
    onSuccess: (data, id) => {
      queryClient.setQueryData(['agent', id, 'status'], data)
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'signals'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'positions'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'equity'] })
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success(`${data.name} ran one iteration`)
    },
    onError: (err) => toast.error(err.message),
  })
}
