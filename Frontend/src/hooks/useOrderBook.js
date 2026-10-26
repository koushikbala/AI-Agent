import { useQuery } from '@tanstack/react-query'
import { fetchDepth } from '@/lib/binance'

export function useOrderBook(symbol) {
  return useQuery({
    queryKey: ['depth', symbol],
    queryFn: () => fetchDepth(symbol, 20),
    staleTime: 5000,
    refetchInterval: 15000,
  })
}
