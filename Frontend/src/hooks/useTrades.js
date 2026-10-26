import { useQuery } from '@tanstack/react-query'
import { fetchTrades } from '@/lib/binance'

export function useTrades(symbol) {
  return useQuery({
    queryKey: ['trades', symbol],
    queryFn: () => fetchTrades(symbol, 30),
    staleTime: 10000,
    refetchInterval: 15000,
  })
}
