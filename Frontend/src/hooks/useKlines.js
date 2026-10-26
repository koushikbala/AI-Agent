import { useQuery } from '@tanstack/react-query'
import { fetchKlines, parseRestKline } from '@/lib/binance'

export function useKlines(symbol, interval) {
  return useQuery({
    queryKey: ['klines', symbol, interval],
    queryFn: async () => {
      const raw = await fetchKlines(symbol, interval, 200)
      return raw.map(parseRestKline)
    },
    staleTime: 60000,
  })
}
