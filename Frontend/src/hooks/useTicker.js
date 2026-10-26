import { useQuery } from '@tanstack/react-query'
import { fetchTicker24hr } from '@/lib/binance'

export function useTicker(symbol) {
  return useQuery({
    queryKey: ['ticker24hr', symbol],
    queryFn: () => fetchTicker24hr(symbol),
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
