import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { agentApi } from '@/lib/agentApi'

export function useAgentConfig(id) {
  return useQuery({
    queryKey: ['agent', id, 'config'],
    queryFn: () => agentApi.getConfig(id),
    enabled: !!id,
    staleTime: 60000,
  })
}

export function useSaveAgentConfig(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config) => agentApi.setConfig(id, config),
    onSuccess: (config) => {
      queryClient.setQueryData(['agent', id, 'config'], config)
      queryClient.invalidateQueries({ queryKey: ['agent', 'list'] })
      toast.success('Agent configuration saved')
    },
    onError: (err) => toast.error(`Failed to save config: ${err.message}`),
  })
}
