import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { agentManager } from './agent.js'
import { store } from './store.js'
import { ConfigSchema, CreateAgentSchema } from './schema.js'

const PORT = process.env.PORT || 4000

// Seed one default cat agent so the room is never empty on a fresh install.
if (agentManager.list().length === 0) {
  agentManager.create({ name: 'Hermes', catSeed: 'hermes' })
}

const app = express()
app.use(cors())
app.use(express.json())

function getAgentOr404(req, res) {
  const agent = agentManager.get(req.params.id)
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return null
  }
  return agent
}

// --- Agent room: list / create / delete ---

app.get('/api/agent/list', (_req, res) => {
  res.json(agentManager.list())
})

app.post('/api/agent/create', (req, res) => {
  const parsed = CreateAgentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message })
  }
  const agent = agentManager.create(parsed.data)
  res.status(201).json(agent.getStatusPayload())
})

app.delete('/api/agent/:id', (req, res) => {
  const removed = agentManager.remove(req.params.id)
  if (!removed) return res.status(404).json({ error: 'Agent not found' })
  res.json({ ok: true })
})

// --- Per-agent control ---

app.post('/api/agent/:id/start', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  res.json(agent.start())
})

app.post('/api/agent/:id/pause', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  res.json(agent.pause())
})

app.post('/api/agent/:id/stop', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  res.json(agent.stop())
})

app.post('/api/agent/:id/run-once', async (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  try {
    res.json(await agent.runOnce())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/agent/:id/status', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  res.json(agent.getStatusPayload())
})

app.get('/api/agent/:id/signals', (req, res) => {
  if (!getAgentOr404(req, res)) return
  res.json(store.getSignals(req.params.id))
})

app.get('/api/agent/:id/positions', (req, res) => {
  if (!getAgentOr404(req, res)) return
  res.json(store.getPositions(req.params.id))
})

app.post('/api/agent/:id/positions/:positionId/close', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  const price = Number(req.body?.currentPrice)
  if (!price || Number.isNaN(price)) {
    return res.status(400).json({ error: 'currentPrice is required' })
  }
  const result = agent.closePosition(req.params.positionId, price)
  if (!result) return res.status(404).json({ error: 'Position not found' })
  res.json(result)
})

app.get('/api/agent/:id/equity', (req, res) => {
  if (!getAgentOr404(req, res)) return
  res.json(store.getEquity(req.params.id))
})

app.get('/api/agent/:id/config', (req, res) => {
  if (!getAgentOr404(req, res)) return
  res.json(store.getConfig(req.params.id))
})

app.put('/api/agent/:id/config', (req, res) => {
  const agent = getAgentOr404(req, res)
  if (!agent) return
  const parsed = ConfigSchema.safeParse({ ...store.getConfig(req.params.id), ...req.body, paperTrading: true })
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message })
  }
  const config = store.setConfig(req.params.id, parsed.data)
  if (agent.status === 'running') {
    agent.scheduleLoop()
  }
  res.json(config)
})

// --- SSE stream (all agents, events tagged with agentId) ---

app.get('/api/agent/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write(`event: snapshot\ndata: ${JSON.stringify(agentManager.list())}\n\n`)

  const onEvent = (evt) => {
    res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`)
  }
  agentManager.on('event', onEvent)

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000)

  req.on('close', () => {
    agentManager.off('event', onEvent)
    clearInterval(heartbeat)
  })
})

app.listen(PORT, () => {
  console.log(`Agent server listening on http://localhost:${PORT}`)
})
