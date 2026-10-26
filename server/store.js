import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_CONFIG } from './schema.js'

const DATA_DIR = path.resolve(import.meta.dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

function newAgentRecord({ id, name, catSeed, config }) {
  return {
    id,
    name,
    catSeed,
    config: { ...DEFAULT_CONFIG, ...config },
    signals: [],
    positions: [],
    equity: [{ time: Date.now(), balance: 10000 }],
    balance: 10000,
  }
}

const INITIAL_STATE = { agents: {} }

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_STATE, null, 2))
  }
}

function read() {
  ensureFile()
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    if (!data.agents) return structuredClone(INITIAL_STATE)
    return data
  } catch {
    return structuredClone(INITIAL_STATE)
  }
}

function write(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2))
}

export const store = {
  listAgents() {
    return Object.values(read().agents)
  },

  getAgentRecord(id) {
    return read().agents[id] ?? null
  },

  createAgent({ id, name, catSeed, config }) {
    const state = read()
    state.agents[id] = newAgentRecord({ id, name, catSeed, config })
    write(state)
    return state.agents[id]
  },

  deleteAgent(id) {
    const state = read()
    delete state.agents[id]
    write(state)
  },

  getConfig(id) {
    return read().agents[id]?.config ?? null
  },
  setConfig(id, config) {
    const state = read()
    if (!state.agents[id]) return null
    state.agents[id].config = config
    write(state)
    return state.agents[id].config
  },
  renameAgent(id, name) {
    const state = read()
    if (!state.agents[id]) return null
    state.agents[id].name = name
    write(state)
    return state.agents[id]
  },

  getSignals(id) {
    return read().agents[id]?.signals ?? []
  },
  addSignal(id, signal) {
    const state = read()
    if (!state.agents[id]) return null
    state.agents[id].signals.unshift(signal)
    state.agents[id].signals = state.agents[id].signals.slice(0, 500)
    write(state)
    return signal
  },
  updateSignal(id, signalId, patch) {
    const state = read()
    const agent = state.agents[id]
    if (!agent) return null
    const idx = agent.signals.findIndex((s) => s.id === signalId)
    if (idx !== -1) {
      agent.signals[idx] = { ...agent.signals[idx], ...patch }
      write(state)
      return agent.signals[idx]
    }
    return null
  },

  getPositions(id) {
    return read().agents[id]?.positions ?? []
  },
  addPosition(id, position) {
    const state = read()
    if (!state.agents[id]) return null
    state.agents[id].positions.push(position)
    write(state)
    return position
  },
  removePosition(id, positionId) {
    const state = read()
    if (!state.agents[id]) return
    state.agents[id].positions = state.agents[id].positions.filter((p) => p.id !== positionId)
    write(state)
  },

  getBalance(id) {
    return read().agents[id]?.balance ?? 0
  },
  applyPnl(id, pnl) {
    const state = read()
    if (!state.agents[id]) return 0
    state.agents[id].balance = Math.round((state.agents[id].balance + pnl) * 100) / 100
    state.agents[id].equity.push({ time: Date.now(), balance: state.agents[id].balance })
    state.agents[id].equity = state.agents[id].equity.slice(-5000)
    write(state)
    return state.agents[id].balance
  },

  getEquity(id) {
    return read().agents[id]?.equity ?? []
  },
}
