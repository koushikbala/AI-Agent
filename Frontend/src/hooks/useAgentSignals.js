import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { agentApi } from '@/lib/agentApi'

export function useAgentSignals(id) {
  return useQuery({
    queryKey: ['agent', id, 'signals'],
    queryFn: () => agentApi.getSignals(id),
    enabled: !!id,
    refetchInterval: 15000,
  })
}

export function useAgentPositions(id) {
  return useQuery({
    queryKey: ['agent', id, 'positions'],
    queryFn: () => agentApi.getPositions(id),
    enabled: !!id,
    refetchInterval: 10000,
  })
}

export function useAgentEquity(id) {
  return useQuery({
    queryKey: ['agent', id, 'equity'],
    queryFn: () => agentApi.getEquity(id),
    enabled: !!id,
    refetchInterval: 15000,
  })
}

export function useClosePosition(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ positionId, currentPrice }) => agentApi.closePosition(id, positionId, currentPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'positions'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'signals'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id, 'equity'] })
      toast.success('Position closed')
    },
    onError: (err) => toast.error(err.message),
  })
}
