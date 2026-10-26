import { Compass, Repeat, Sigma, ShieldQuestion, TrendingUp, Users, Zap } from 'lucide-react'

export const STRATEGY_META = {
  trend: { label: 'Trend Following', icon: TrendingUp, color: 'text-sky-500' },
  mean_reversion: { label: 'Mean Reversion', icon: Repeat, color: 'text-violet-500' },
  breakout: { label: 'Breakout', icon: Zap, color: 'text-amber-500' },
}

/** The 5-agent pipeline each cat runs through on every tick, in order. */
export const PIPELINE_STEPS = [
  { key: 'market_analyst', title: 'Market Analyst', blurb: 'Structure, trend & momentum', icon: Compass },
  { key: 'quant_analyst', title: 'Quant Analyst', blurb: 'Statistics & expected value', icon: Sigma },
  { key: 'strategy_agent', title: 'Strategy Agent', blurb: 'LONG / SHORT / FLAT proposal', icon: TrendingUp },
  { key: 'risk_reviewer', title: 'Risk Reviewer', blurb: 'Independent challenge', icon: ShieldQuestion },
  { key: 'coordinator', title: 'Coordinator', blurb: 'Final reconciled decision', icon: Users },
]

export const PIPELINE_STEP_KEYS = PIPELINE_STEPS.map((s) => s.key)
