async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const agentApi = {
  list: () => request('/api/agent/list'),
  create: ({ name, catSeed, config }) =>
    request('/api/agent/create', { method: 'POST', body: JSON.stringify({ name, catSeed, config }) }),
  remove: (id) => request(`/api/agent/${id}`, { method: 'DELETE' }),

  getStatus: (id) => request(`/api/agent/${id}/status`),
  getSignals: (id) => request(`/api/agent/${id}/signals`),
  getPositions: (id) => request(`/api/agent/${id}/positions`),
  getEquity: (id) => request(`/api/agent/${id}/equity`),
  getConfig: (id) => request(`/api/agent/${id}/config`),
  setConfig: (id, config) => request(`/api/agent/${id}/config`, { method: 'PUT', body: JSON.stringify(config) }),
  start: (id) => request(`/api/agent/${id}/start`, { method: 'POST' }),
  pause: (id) => request(`/api/agent/${id}/pause`, { method: 'POST' }),
  stop: (id) => request(`/api/agent/${id}/stop`, { method: 'POST' }),
  runOnce: (id) => request(`/api/agent/${id}/run-once`, { method: 'POST' }),
  closePosition: (id, positionId, currentPrice) =>
    request(`/api/agent/${id}/positions/${positionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ currentPrice }),
    }),
}
