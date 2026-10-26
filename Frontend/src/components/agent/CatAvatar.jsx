import { cn } from '@/lib/utils'

function hueFromSeed(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

const MOOD = {
  running: 'running',
  paused: 'paused',
  error: 'error',
  idle: 'idle',
  stopped: 'idle',
}

/**
 * A small seeded, procedurally-colored cat face used as an agent's avatar.
 * `working` drives a bob/tail-wag animation for "actively processing a tick",
 * distinct from `status` which is the agent's persistent run state.
 */
export function CatAvatar({ seed = 'cat', status = 'idle', working = false, size = 56, className }) {
  const hue = hueFromSeed(seed)
  const fur = `oklch(0.82 0.09 ${hue})`
  const furShade = `oklch(0.72 0.1 ${hue})`
  const mood = MOOD[status] ?? 'idle'

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {mood === 'running' && (
        <span
          className={cn(
            'absolute inset-0 rounded-full bg-emerald-400/25',
            working ? 'animate-ping' : 'animate-pulse',
          )}
        />
      )}
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn('relative', working && 'animate-cat-bob')}
      >
        {/* tail */}
        <path
          d="M46 46 Q58 46 56 32"
          stroke={furShade}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          className={cn('origin-[46px_46px]', working && 'animate-cat-tail')}
        />

        {/* ears */}
        <path d="M14 20 L22 4 L28 22 Z" fill={furShade} />
        <path d="M50 20 L42 4 L36 22 Z" fill={furShade} />
        <path d="M17 18 L22 9 L25 19 Z" fill="oklch(0.6 0.08 20)" opacity="0.5" />
        <path d="M47 18 L42 9 L39 19 Z" fill="oklch(0.6 0.08 20)" opacity="0.5" />

        {/* head */}
        <circle cx="32" cy="34" r="22" fill={fur} />

        {/* eyes */}
        {mood === 'error' ? (
          <g stroke="oklch(0.3 0 0)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M22 30 L28 36 M28 30 L22 36" />
            <path d="M36 30 L42 36 M42 30 L36 36" />
          </g>
        ) : mood === 'paused' ? (
          <g fill="oklch(0.3 0 0)">
            <path d="M21 32 Q25 28 29 32" stroke="oklch(0.3 0 0)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="39" cy="32" r="2.6" />
          </g>
        ) : mood === 'idle' ? (
          <g stroke="oklch(0.3 0 0)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 32 Q25 35 29 32" />
            <path d="M35 32 Q39 35 43 32" />
          </g>
        ) : (
          <g fill="oklch(0.3 0 0)">
            <circle cx="25" cy="32" r="2.8" />
            <circle cx="39" cy="32" r="2.8" />
          </g>
        )}

        {/* nose + mouth */}
        <path d="M30 40 L34 40 L32 43 Z" fill="oklch(0.55 0.15 20)" />
        <path
          d={mood === 'error' ? 'M27 46 Q32 43 37 46' : 'M27 44 Q32 48 37 44'}
          stroke="oklch(0.3 0 0)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />

        {/* whiskers */}
        <g stroke="oklch(0.3 0 0 / 0.35)" strokeWidth="1.2" strokeLinecap="round">
          <path d="M10 36 L20 37" />
          <path d="M10 42 L20 40" />
          <path d="M54 36 L44 37" />
          <path d="M54 42 L44 40" />
        </g>
      </svg>
    </div>
  )
}
