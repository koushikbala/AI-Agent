import { EventEmitter } from 'node:events'
import crypto from 'node:crypto'
import { computeIndicators } from './indicators.js'
import { runAgentPipeline, isMockMode } from './llm.js'
import { store } from './store.js'
import { PIPELINE_ROLES } from './schema.js'

function summarizeStage(role, output) {
  switch (role) {
    case 'market_analyst':
      return `Trend ${output.trend} · S/R ${output.support}/${output.resistance}`
    case 'quant_analyst':
      return `EV ${output.expectedValuePct}% · win-rate ~${output.winRateEstimate}% · ${output.volatility} vol`
    case 'strategy_agent':
      return `Proposes ${output.decision}${output.decision === 'LONG' || output.decision === 'SHORT' ? ` @ ${output.entry}` : ''}`
    case 'risk_reviewer':
      return output.approved ? 'Risk review: approved' : `Risk review: rejected — ${output.reasons[0]}`
    case 'coordinator':
      return `Final: ${output.final} (${output.confidence}% confidence)`
    default:
      return PIPELINE_ROLES.find((r) => r.key === role)?.title ?? role
  }
}

const BINANCE_BASES = ['https://api.binance.com', 'https://data-api.binance.vision']

async function fetchKlines(symbol, interval, limit = 200) {
  let lastError
  for (const base of BINANCE_BASES) {
    try {
      const res = await fetch(
        `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      )
      if (!res.ok) throw new Error(`Binance klines failed: ${res.status}`)
      const raw = await res.json()
      return raw.map((k) => ({
        time: k[0],
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
      }))
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

async function fetchPrice(symbol) {
  let lastError
  for (const base of BINANCE_BASES) {
    try {
      const res = await fetch(`${base}/api/v3/ticker/price?symbol=${symbol}`)
      if (!res.ok) throw new Error(`Binance price failed: ${res.status}`)
      const data = await res.json()
      return Number(data.price)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

/** One paper-trading agent instance: its own loop, timer, and state machine. */
class Agent extends EventEmitter {
  constructor({ id, name, catSeed }) {
    super()
    this.id = id
    this.name = name
    this.catSeed = catSeed
    this.status = 'idle' // idle | running | paused | stopped | error
    this.timer = null
    this.startedAt = null
    this.lastRunAt = null
    this.runningIteration = false
  }

  log(level, step, message, raw) {
    const entry = {
      id: crypto.randomUUID(),
      time: Date.now(),
      level,
      step,
      message,
      raw: raw ?? null,
    }
    this.emit('event', { agentId: this.id, type: 'log', payload: entry })
    return entry
  }

  setStatus(status) {
    this.status = status
    this.emit('event', { agentId: this.id, type: 'status', payload: this.getStatusPayload() })
  }

  getStatusPayload() {
    return {
      id: this.id,
      name: this.name,
      catSeed: this.catSeed,
      status: this.status,
      startedAt: this.startedAt,
      lastRunAt: this.lastRunAt,
      uptimeMs: this.startedAt && this.status === 'running' ? Date.now() - this.startedAt : 0,
      mockMode: isMockMode,
      symbol: store.getConfig(this.id)?.symbol,
    }
  }

  start() {
    if (this.status === 'running') return this.getStatusPayload()
    this.startedAt = this.startedAt ?? Date.now()
    this.setStatus('running')
    this.scheduleLoop()
    this.log('info', 'fetch', `${this.name} started.`)
    return this.getStatusPayload()
  }

  pause() {
    if (this.status !== 'running') return this.getStatusPayload()
    this.clearTimer()
    this.setStatus('paused')
    this.log('info', 'fetch', `${this.name} paused.`)
    return this.getStatusPayload()
  }

  stop() {
    this.clearTimer()
    this.startedAt = null
    this.setStatus('stopped')
    this.log('info', 'fetch', `${this.name} stopped.`)
    return this.getStatusPayload()
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  scheduleLoop() {
    this.clearTimer()
    const config = store.getConfig(this.id)
    const intervalMs = config.runEveryMinutes * 60 * 1000
    this.timer = setInterval(() => this.runIteration(), intervalMs)
    this.runIteration()
  }

  async runOnce() {
    await this.runIteration()
    return this.getStatusPayload()
  }

  closePosition(positionId, currentPrice) {
    const positions = store.getPositions(this.id)
    const position = positions.find((p) => p.id === positionId)
    if (!position) return null
    const direction = position.side === 'BUY' ? 1 : -1
    const pnl = (currentPrice - position.entry) * position.size * direction
    store.removePosition(this.id, position.id)
    store.applyPnl(this.id, pnl)
    store.updateSignal(this.id, position.signalId, {
      result: pnl >= 0 ? 'Win' : 'Loss',
      pnl: Math.round(pnl * 100) / 100,
      closedAt: Date.now(),
    })
    this.log('info', 'position', `Manually closed ${position.side} ${position.symbol} PnL ${pnl.toFixed(2)} USDT`, position)
    this.emit('event', { agentId: this.id, type: 'position', payload: { closed: position.id } })
    return { pnl }
  }

  async runIteration() {
    if (this.runningIteration) return
    this.runningIteration = true
    const config = store.getConfig(this.id)
    try {
      await this.checkOpenPositions(config)
      await this.generateAndApply(config)
      this.lastRunAt = Date.now()
      this.emit('event', { agentId: this.id, type: 'status', payload: this.getStatusPayload() })
    } catch (err) {
      this.log('error', 'error', err.message)
      this.setStatus('error')
    } finally {
      this.runningIteration = false
    }
  }

  async checkOpenPositions(config) {
    const positions = store.getPositions(this.id)
    if (!positions.length) return
    let price
    try {
      price = await fetchPrice(config.symbol)
    } catch (err) {
      this.log('error', 'fetch', `Price check failed: ${err.message}`)
      return
    }
    for (const position of positions) {
      if (position.symbol !== config.symbol) continue
      const hitTp = position.side === 'BUY' ? price >= position.takeProfit : price <= position.takeProfit
      const hitSl = position.side === 'BUY' ? price <= position.stopLoss : price >= position.stopLoss
      if (hitTp || hitSl) {
        const direction = position.side === 'BUY' ? 1 : -1
        const pnl = (price - position.entry) * position.size * direction
        const result = hitTp ? 'Win' : 'Loss'
        store.removePosition(this.id, position.id)
        store.applyPnl(this.id, pnl)
        store.updateSignal(this.id, position.signalId, { result, pnl: Math.round(pnl * 100) / 100, closedAt: Date.now() })
        this.log('info', 'position', `Closed ${position.side} ${position.symbol} (${result}) PnL ${pnl.toFixed(2)} USDT`, position)
        this.emit('event', { agentId: this.id, type: 'position', payload: { closed: position.id } })
      }
    }
  }

  async generateAndApply(config) {
    this.log('info', 'fetch', `Fetching ${config.symbol} ${config.timeframe} klines...`)
    const candles = await fetchKlines(config.symbol, config.timeframe, 200)
    const price = candles[candles.length - 1].close

    this.log('info', 'indicators', 'Computing RSI/EMA/MACD/ATR/volume trend...')
    const indicators = computeIndicators(candles)

    this.log('info', 'fetch', `Running 5-agent pipeline (${isMockMode ? 'mock mode' : config.model})...`)
    let pipeline
    let result
    try {
      const run = await runAgentPipeline({
        config,
        indicators,
        candles,
        symbol: config.symbol,
        price,
        onStage: (role, output) => this.log('info', role, summarizeStage(role, output), output),
      })
      pipeline = run.pipeline
      result = run.final
    } catch (err) {
      this.log('error', 'error', err.message)
      return
    }

    const signalEntry = {
      id: crypto.randomUUID(),
      time: Date.now(),
      symbol: config.symbol,
      signal: result.signal,
      confidence: result.confidence,
      entry: result.entry,
      stopLoss: result.stopLoss,
      takeProfit: result.takeProfit,
      reasoning: result.reasoning,
      pipeline,
      result: 'Open',
      pnl: null,
      closedAt: null,
    }

    this.log(
      'info',
      'signal',
      `Signal: ${result.signal} (${result.confidence}% confidence) @ ${result.entry}`,
      result,
    )

    const positions = store.getPositions(this.id)
    const riskPct = (Math.abs(result.entry - result.stopLoss) / result.entry) * 100

    if (result.signal === 'HOLD') {
      store.addSignal(this.id, signalEntry)
      this.emit('event', { agentId: this.id, type: 'signal', payload: signalEntry })
      return
    }

    if (result.confidence < 60) {
      signalEntry.result = 'Rejected (low confidence)'
      store.addSignal(this.id, signalEntry)
      this.log('info', 'risk_gate', `Rejected signal: confidence ${result.confidence}% < 60%.`)
      this.emit('event', { agentId: this.id, type: 'signal', payload: signalEntry })
      return
    }

    if (riskPct > config.riskPerTradePct * 5) {
      signalEntry.result = 'Rejected (risk too high)'
      store.addSignal(this.id, signalEntry)
      this.log('info', 'risk_gate', `Rejected signal: stop-loss risk ${riskPct.toFixed(2)}% too wide for ${config.riskPerTradePct}% risk budget.`)
      this.emit('event', { agentId: this.id, type: 'signal', payload: signalEntry })
      return
    }

    if (positions.length >= config.maxOpenPositions) {
      signalEntry.result = 'Rejected (max positions)'
      store.addSignal(this.id, signalEntry)
      this.log('info', 'risk_gate', `Rejected signal: max open positions (${config.maxOpenPositions}) reached.`)
      this.emit('event', { agentId: this.id, type: 'signal', payload: signalEntry })
      return
    }

    store.addSignal(this.id, signalEntry)
    this.emit('event', { agentId: this.id, type: 'signal', payload: signalEntry })

    const balance = store.getBalance(this.id)
    const riskAmount = balance * (config.riskPerTradePct / 100)
    const stopDistance = Math.abs(result.entry - result.stopLoss) || 1
    const size = riskAmount / stopDistance

    const position = {
      id: crypto.randomUUID(),
      symbol: config.symbol,
      side: result.signal,
      size: Number(size.toFixed(6)),
      entry: result.entry,
      stopLoss: result.stopLoss,
      takeProfit: result.takeProfit,
      openedAt: Date.now(),
      signalId: signalEntry.id,
    }
    store.addPosition(this.id, position)
    this.log('info', 'position', `Opened PAPER ${position.side} ${position.symbol} size ${position.size}`, position)
    this.emit('event', { agentId: this.id, type: 'position', payload: { opened: position } })
  }
}

/** In-memory registry of live Agent instances, backed by the persisted store. */
class AgentManager extends EventEmitter {
  constructor() {
    super()
    this.instances = new Map()
    for (const record of store.listAgents()) {
      this.hydrate(record)
    }
  }

  hydrate(record) {
    const agent = new Agent({ id: record.id, name: record.name, catSeed: record.catSeed })
    agent.on('event', (evt) => this.emit('event', evt))
    this.instances.set(record.id, agent)
    return agent
  }

  create({ name, catSeed, config }) {
    const id = crypto.randomUUID()
    store.createAgent({ id, name, catSeed, config })
    const agent = this.hydrate(store.getAgentRecord(id))
    this.emit('event', { agentId: id, type: 'created', payload: agent.getStatusPayload() })
    return agent
  }

  get(id) {
    return this.instances.get(id) ?? null
  }

  list() {
    return [...this.instances.values()].map((a) => a.getStatusPayload())
  }

  remove(id) {
    const agent = this.get(id)
    if (!agent) return false
    agent.stop()
    this.instances.delete(id)
    store.deleteAgent(id)
    this.emit('event', { agentId: id, type: 'removed', payload: { id } })
    return true
  }
}

export const agentManager = new AgentManager()
