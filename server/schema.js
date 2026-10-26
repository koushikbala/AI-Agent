import { z } from 'zod'

export const SignalResponseSchema = z.object({
  signal: z.enum(['BUY', 'SELL', 'HOLD']),
  confidence: z.number().min(0).max(100),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  reasoning: z.string().min(1).max(2000),
})

// --- 5-agent pipeline (Market Analyst -> Quant Analyst -> Strategy Agent ->
// Risk Reviewer -> Coordinator). Each stage's output is schema-validated
// independently so one agent's hallucination can't silently corrupt the next.

export const MarketAnalystSchema = z.object({
  trend: z.enum(['up', 'down', 'sideways']),
  momentum: z.string().min(1).max(300),
  support: z.number(),
  resistance: z.number(),
  invalidation: z.number(),
  facts: z.array(z.string().max(200)).min(1).max(6),
  hypotheses: z.array(z.string().max(200)).max(6).default([]),
})

export const QuantAnalystSchema = z.object({
  expectedValuePct: z.number(),
  winRateEstimate: z.number().min(0).max(100),
  volatility: z.enum(['low', 'medium', 'high']),
  signalStrength: z.number().min(0).max(100),
  notes: z.string().min(1).max(400),
})

export const StrategyAgentSchema = z.object({
  decision: z.enum(['LONG', 'SHORT', 'FLAT', 'NO_TRADE']),
  entry: z.number().nonnegative(),
  stopLoss: z.number().nonnegative(),
  takeProfit: z.number().nonnegative(),
  invalidation: z.string().min(1).max(300),
  rationale: z.string().min(1).max(400),
})

export const RiskReviewSchema = z.object({
  approved: z.boolean(),
  reasons: z.array(z.string().max(200)).min(1).max(6),
})

export const CoordinatorSchema = z.object({
  final: z.enum(['LONG', 'SHORT', 'FLAT', 'NO_TRADE']),
  entry: z.number().nonnegative(),
  stopLoss: z.number().nonnegative(),
  takeProfit: z.number().nonnegative(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1).max(500),
  disagreements: z.array(z.string().max(200)).default([]),
})

export const PIPELINE_ROLES = [
  { key: 'market_analyst', title: 'Market Analyst' },
  { key: 'quant_analyst', title: 'Quant Analyst' },
  { key: 'strategy_agent', title: 'Strategy Agent' },
  { key: 'risk_reviewer', title: 'Risk Reviewer' },
  { key: 'coordinator', title: 'Coordinator' },
]

export const ConfigSchema = z.object({
  symbol: z.enum(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h']),
  strategy: z.enum(['trend', 'mean_reversion', 'breakout', 'custom']),
  customPrompt: z.string().max(4000).optional().default(''),
  model: z.string().min(1),
  temperature: z.number().min(0).max(1),
  runEveryMinutes: z.union([z.literal(1), z.literal(5), z.literal(15), z.literal(60)]),
  riskPerTradePct: z.number().min(0.1).max(10),
  maxOpenPositions: z.number().int().min(1).max(10),
  paperTrading: z.literal(true).default(true),
})

export const DEFAULT_CONFIG = {
  symbol: 'BTCUSDT',
  timeframe: '15m',
  strategy: 'trend',
  customPrompt: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  runEveryMinutes: 5,
  riskPerTradePct: 1,
  maxOpenPositions: 3,
  paperTrading: true,
}

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(40),
  catSeed: z.string().min(1).max(40),
  config: ConfigSchema.partial().optional(),
})
