import { Wifi, WifiOff, Loader2, PauseCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG = {
  open: { label: 'Live', variant: 'default', icon: Wifi, className: 'bg-emerald-600 hover:bg-emerald-600' },
  connecting: { label: 'Connecting', variant: 'secondary', icon: Loader2, spin: true },
  closed: { label: 'Reconnecting', variant: 'destructive', icon: WifiOff },
  error: { label: 'Error', variant: 'destructive', icon: WifiOff },
  paused: { label: 'Paused', variant: 'outline', icon: PauseCircle },
}

export function ConnectionBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.connecting
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${config.className ?? ''}`}>
      <Icon className={`size-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  )
}
