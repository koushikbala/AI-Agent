import {
  MarketAnalystSchema,
  QuantAnalystSchema,
  StrategyAgentSchema,
  RiskReviewSchema,
  CoordinatorSchema,
} from './schema.js'

const MOCK_MODE = process.env.AGENT_MOCK === 'true' || !process.env.ANTHROPIC_API_KEY

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const mockDelay = () => sleep(400 + Math.random() * 500)

async function callAnthropic({ prompt, model, temperature }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-5',
      max_tokens: 1024,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    throw new Error(`LLM request failed: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  const text = data.content?.map((c) => c.text).join('') ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('LLM response did not contain JSON')
  return JSON.parse(match[0])
}

/** Runs one pipeline stage: calls the LLM (or `mockFn`), validates with `schema`, retries once. */
async function runStage({ schema, prompt, model, temperature, mockFn }) {
  const attempt = async () => {
    const raw = MOCK_MODE ? await mockFn() : await callAnthropic({ prompt, model, temperature })
    return schema.parse(raw)
  }
  try {
    return await attempt()
  } catch (firstError) {
    try {
      return await attempt()
    } catch (secondError) {
      throw new Error(`${secondError.message} (after retry; first attempt: ${firstError.message})`)
    }
  }
}

function strategyText(config) {
  if (config.strategy === 'custom' && config.customPrompt) return config.customPrompt
  return {
    trend: 'Follow the dominant trend using EMA crossovers and MACD momentum.',
    mean_reversion: 'Look for overbought/oversold RSI extremes reverting to the mean.',
    breakout: 'Look for volatility expansion and volume-confirmed breakouts.',
  }[config.strategy]
}

// ---------------------------------------------------------------------------
// Stage 1: Market Analyst — market structure, trend, momentum, S/R, invalidation.
// ---------------------------------------------------------------------------

function marketAnalystMock({ indicators, candles, price }) {
  const { ema20, ema50, rsi14 } = indicators
  const trend = ema20 == null || ema50 == null ? 'sideways' : ema20 > ema50 * 1.001 ? 'up' : ema20 < ema50 * 0.999 ? 'down' : 'sideways'
  const recent = candles.slice(-30)
  const support = Math.min(...recent.map((c) => c.low))
  const resistance = Math.max(...recent.map((c) => c.high))
  const invalidation = trend === 'up' ? support * 0.995 : trend === 'down' ? resistance * 1.005 : price
  return {
    trend,
    momentum: rsi14 == null ? 'RSI unavailable' : rsi14 > 70 ? 'Momentum stretched to the upside (RSI overbought).' : rsi14 < 30 ? 'Momentum stretched to the downside (RSI oversold).' : 'Momentum is neutral, no extreme readings.',
    support: Number(support.toFixed(2)),
    resistance: Number(resistance.toFixed(2)),
    invalidation: Number(invalidation.toFixed(2)),
    facts: [
      `EMA20 ${ema20?.toFixed(2)} vs EMA50 ${ema50?.toFixed(2)}.`,
      `RSI(14) reading: ${rsi14?.toFixed(1) ?? 'n/a'}.`,
      `30-candle range: ${support.toFixed(2)} - ${resistance.toFixed(2)}.`,
    ],
    hypotheses: [
      trend === 'up'
        ? 'Price may continue testing resistance if momentum holds.'
        : trend === 'down'
          ? 'Price may continue testing support if momentum holds.'
          : 'Range-bound action may persist until a volume-confirmed break.',
    ],
  }
}

async function runMarketAnalyst({ config, indicators, candles, symbol, price }) {
  if (MOCK_MODE) {
    await mockDelay()
    return runStage({ schema: MarketAnalystSchema, mockFn: () => marketAnalystMock({ indicators, candles, price }) })
  }
  const prompt = `You are the Market Analyst in a multi-agent crypto trading system (PAPER TRADING only).
Role: analyze market structure, trend, momentum, support and resistance from the supplied candle data and quantitative features. Identify potential invalidation levels. Clearly distinguish facts (directly observable from the data) from hypotheses (your interpretation).

Symbol: ${symbol}
Current price: ${price}
Indicators: ${JSON.stringify(indicators)}
Last 20 candles [time,open,high,low,close,volume]: ${JSON.stringify(candles.slice(-20).map((c) => [c.time, c.open, c.high, c.low, c.close, c.volume]))}

Respond with ONLY JSON: { "trend": "up"|"down"|"sideways", "momentum": string, "support": number, "resistance": number, "invalidation": number, "facts": string[], "hypotheses": string[] }`
  return runStage({ schema: MarketAnalystSchema, prompt, model: config.model, temperature: config.temperature })
}

// ---------------------------------------------------------------------------
// Stage 2: Quant Analyst — statistical signals, volatility, expected value.
// ---------------------------------------------------------------------------

function quantAnalystMock({ indicators, price }) {
  const atr = indicators.atr14 ?? price * 0.01
  const atrPct = (atr / price) * 100
  const volatility = atrPct > 2 ? 'high' : atrPct > 0.8 ? 'medium' : 'low'
  const rsi = indicators.rsi14 ?? 50
  const signalStrength = Math.min(100, Math.max(0, Math.round(Math.abs(rsi - 50) * 2 + (indicators.volumeTrendPct ?? 0) / 2)))
  const winRateEstimate = Math.round(45 + signalStrength / 5)
  const expectedValuePct = Number((((winRateEstimate - 50) / 50) * atrPct).toFixed(2))
  return {
    expectedValuePct,
    winRateEstimate,
    volatility,
    signalStrength,
    notes: `ATR(14) ≈ ${atrPct.toFixed(2)}% of price. Volume trend ${indicators.volumeTrendPct >= 0 ? '+' : ''}${indicators.volumeTrendPct ?? 0}% vs prior window.`,
  }
}

async function runQuantAnalyst({ config, indicators, symbol, price, market }) {
  if (MOCK_MODE) {
    await mockDelay()
    return runStage({ schema: QuantAnalystSchema, mockFn: () => quantAnalystMock({ indicators, price }) })
  }
  const prompt = `You are the Quant Analyst in a multi-agent crypto trading system (PAPER TRADING only).
Role: evaluate statistical signals, volatility, indicator values and historical signal performance. Assess expected value and uncertainty using the precomputed quantitative evidence below. Never fabricate numerical calculations or historical results — derive every number from the data given.

Symbol: ${symbol}
Current price: ${price}
Indicators: ${JSON.stringify(indicators)}
Market Analyst's read: ${JSON.stringify(market)}

Respond with ONLY JSON: { "expectedValuePct": number, "winRateEstimate": number (0-100), "volatility": "low"|"medium"|"high", "signalStrength": number (0-100), "notes": string }`
  return runStage({ schema: QuantAnalystSchema, prompt, model: config.model, temperature: config.temperature })
}

// ---------------------------------------------------------------------------
// Stage 3: Strategy Agent — LONG/SHORT/FLAT proposal with entry/SL/TP.
// ---------------------------------------------------------------------------

function strategyAgentMock({ config, indicators, price, market, quant }) {
  const atr = indicators.atr14 ?? price * 0.01
  const rsi = indicators.rsi14 ?? 50
  let decision = 'FLAT'
  if (config.strategy === 'mean_reversion') {
    if (rsi < 32) decision = 'LONG'
    else if (rsi > 68) decision = 'SHORT'
  } else if (config.strategy === 'breakout') {
    if (price >= market.resistance * 0.999) decision = 'LONG'
    else if (price <= market.support * 1.001) decision = 'SHORT'
  } else {
    if (market.trend === 'up' && rsi < 70) decision = 'LONG'
    else if (market.trend === 'down' && rsi > 30) decision = 'SHORT'
  }
  if (quant.signalStrength < 25) decision = 'NO_TRADE'

  const isTrade = decision === 'LONG' || decision === 'SHORT'
  const stopDistance = Math.max(atr, price * 0.003)
  const entry = isTrade ? price : price
  const stopLoss = isTrade ? (decision === 'LONG' ? price - stopDistance : price + stopDistance) : price
  const takeProfit = isTrade ? (decision === 'LONG' ? price + stopDistance * 2 : price - stopDistance * 2) : price

  return {
    decision,
    entry: Number(entry.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(takeProfit.toFixed(2)),
    invalidation: isTrade ? `Close beyond ${market.invalidation.toFixed(2)} invalidates this idea.` : 'No active trade to invalidate.',
    rationale: isTrade
      ? `${config.strategy.replace('_', ' ')} setup: trend ${market.trend}, signal strength ${quant.signalStrength}/100.`
      : `Evidence insufficient (signal strength ${quant.signalStrength}/100) — standing aside.`,
  }
}

async function runStrategyAgent({ config, indicators, symbol, price, market, quant }) {
  if (MOCK_MODE) {
    await mockDelay()
    return runStage({ schema: StrategyAgentSchema, mockFn: () => strategyAgentMock({ config, indicators, price, market, quant }) })
  }
  const prompt = `You are the Strategy Agent in a multi-agent crypto trading system (PAPER TRADING only — you never place real orders).
Role: evaluate the given versioned strategy below and propose LONG, SHORT, or FLAT. Provide entry, stop-loss, take-profit, invalidation conditions and rationale. Return NO_TRADE when evidence is insufficient.

Symbol: ${symbol}
Current price: ${price}
Strategy: ${strategyText(config)}
Market Analyst: ${JSON.stringify(market)}
Quant Analyst: ${JSON.stringify(quant)}

Respond with ONLY JSON: { "decision": "LONG"|"SHORT"|"FLAT"|"NO_TRADE", "entry": number, "stopLoss": number, "takeProfit": number, "invalidation": string, "rationale": string }`
  return runStage({ schema: StrategyAgentSchema, prompt, model: config.model, temperature: config.temperature })
}

// ---------------------------------------------------------------------------
// Stage 4: Risk Reviewer — independently challenges the proposed trade.
// ---------------------------------------------------------------------------

function riskReviewerMock({ config, strategy, quant }) {
  const reasons = []
  const isTrade = strategy.decision === 'LONG' || strategy.decision === 'SHORT'
  if (!isTrade) {
    reasons.push('No trade proposed — nothing to review.')
    return { approved: true, reasons }
  }
  const riskPct = (Math.abs(strategy.entry - strategy.stopLoss) / strategy.entry) * 100
  let approved = true
  if (riskPct > config.riskPerTradePct * 5) {
    approved = false
    reasons.push(`Stop-loss distance (${riskPct.toFixed(2)}%) is wide relative to the ${config.riskPerTradePct}% risk budget.`)
  }
  if (quant.winRateEstimate < 45) {
    approved = false
    reasons.push(`Estimated win rate (${quant.winRateEstimate}%) is weak.`)
  }
  if (quant.volatility === 'high' && quant.signalStrength < 60) {
    approved = false
    reasons.push('High volatility without strong signal conviction.')
  }
  if (!reasons.length) reasons.push('Reward-to-risk and evidence quality look acceptable.')
  return { approved, reasons }
}

async function runRiskReviewer({ config, symbol, price, market, quant, strategy }) {
  if (MOCK_MODE) {
    await mockDelay()
    return runStage({ schema: RiskReviewSchema, mockFn: () => riskReviewerMock({ config, strategy, quant }) })
  }
  const prompt = `You are the Risk Reviewer in a multi-agent crypto trading system (PAPER TRADING only).
Role: independently challenge the proposed trade. Identify excessive risk, weak reward-to-risk, contradictory evidence, liquidity concerns and uncertainty. Recommend approval or rejection with explicit reasons. You do not control the deterministic risk engine — you only advise.

Symbol: ${symbol}
Current price: ${price}
Risk budget per trade: ${config.riskPerTradePct}%
Market Analyst: ${JSON.stringify(market)}
Quant Analyst: ${JSON.stringify(quant)}
Strategy Agent proposal: ${JSON.stringify(strategy)}

Respond with ONLY JSON: { "approved": boolean, "reasons": string[] }`
  return runStage({ schema: RiskReviewSchema, prompt, model: config.model, temperature: config.temperature })
}

// ---------------------------------------------------------------------------
// Stage 5: Coordinator — reconciles everything into one final decision.
// ---------------------------------------------------------------------------

function coordinatorMock({ price, market, quant, strategy, risk }) {
  const isTrade = strategy.decision === 'LONG' || strategy.decision === 'SHORT'
  const final = isTrade && risk.approved ? strategy.decision : isTrade ? 'NO_TRADE' : strategy.decision
  const disagreements = isTrade && !risk.approved ? [`Risk Reviewer rejected: ${risk.reasons.join('; ')}`] : []
  const confidence = Math.round(
    Math.min(95, Math.max(5, quant.signalStrength * 0.6 + quant.winRateEstimate * 0.4 - (disagreements.length ? 25 : 0))),
  )
  const tradeFields = final === 'LONG' || final === 'SHORT'
    ? { entry: strategy.entry, stopLoss: strategy.stopLoss, takeProfit: strategy.takeProfit }
    : { entry: price, stopLoss: price, takeProfit: price }
  return {
    final,
    ...tradeFields,
    confidence,
    reasoning: `${market.trend} trend, ${quant.volatility} volatility, strategy proposed ${strategy.decision}${disagreements.length ? `, but risk review blocked it` : risk.approved ? ', risk review cleared it' : ''}.`,
    disagreements,
  }
}

async function runCoordinator({ config, symbol, price, market, quant, strategy, risk }) {
  if (MOCK_MODE) {
    await mockDelay()
    return runStage({ schema: CoordinatorSchema, mockFn: () => coordinatorMock({ price, market, quant, strategy, risk }) })
  }
  const prompt = `You are the Coordinator in a multi-agent crypto trading system (PAPER TRADING only).
Role: collect and reconcile the other agents' structured outputs. Record disagreements and missing evidence. Produce one final, schema-validated proposal or NO_TRADE decision. You never authorize bypassing risk controls — if the Risk Reviewer rejected a trade, the final decision must be NO_TRADE or FLAT.

Symbol: ${symbol}
Current price: ${price}
Market Analyst: ${JSON.stringify(market)}
Quant Analyst: ${JSON.stringify(quant)}
Strategy Agent: ${JSON.stringify(strategy)}
Risk Reviewer: ${JSON.stringify(risk)}

Respond with ONLY JSON: { "final": "LONG"|"SHORT"|"FLAT"|"NO_TRADE", "entry": number, "stopLoss": number, "takeProfit": number, "confidence": number (0-100), "reasoning": string, "disagreements": string[] }`
  return runStage({ schema: CoordinatorSchema, prompt, model: config.model, temperature: config.temperature })
}

// ---------------------------------------------------------------------------

const DECISION_TO_SIGNAL = { LONG: 'BUY', SHORT: 'SELL', FLAT: 'HOLD', NO_TRADE: 'HOLD' }

/**
 * Runs the full 5-agent pipeline sequentially. `onStage(role, output)` fires
 * after each stage completes, so the caller can stream progress live.
 * Returns `{ pipeline, final }` where `final` is shaped like the legacy
 * single-call signal response for backward compatibility with the rest of
 * the agent loop / UI.
 */
export async function runAgentPipeline({ config, indicators, candles, symbol, price, onStage }) {
  const ctx = { config, indicators, candles, symbol, price }
  const pipeline = []

  const market = await runMarketAnalyst(ctx)
  pipeline.push({ role: 'market_analyst', output: market })
  onStage?.('market_analyst', market)

  const quant = await runQuantAnalyst({ ...ctx, market })
  pipeline.push({ role: 'quant_analyst', output: quant })
  onStage?.('quant_analyst', quant)

  const strategy = await runStrategyAgent({ ...ctx, market, quant })
  pipeline.push({ role: 'strategy_agent', output: strategy })
  onStage?.('strategy_agent', strategy)

  const risk = await runRiskReviewer({ ...ctx, market, quant, strategy })
  pipeline.push({ role: 'risk_reviewer', output: risk })
  onStage?.('risk_reviewer', risk)

  const coordinator = await runCoordinator({ ...ctx, market, quant, strategy, risk })
  pipeline.push({ role: 'coordinator', output: coordinator })
  onStage?.('coordinator', coordinator)

  const final = {
    signal: DECISION_TO_SIGNAL[coordinator.final],
    confidence: coordinator.confidence,
    entry: coordinator.entry,
    stopLoss: coordinator.stopLoss,
    takeProfit: coordinator.takeProfit,
    reasoning: coordinator.reasoning,
  }

  return { pipeline, final }
}

export const isMockMode = MOCK_MODE
