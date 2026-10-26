const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdFormatterPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

export function formatUsd(value, { precise = false } = {}) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return (precise ? usdFormatterPrecise : usdFormatter).format(n)
}

export function formatNumber(value, maximumFractionDigits = 2) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(n)
}

export function formatCompact(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatPercent(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false })
}

export function formatDateTime(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-US', { hour12: false })
}
