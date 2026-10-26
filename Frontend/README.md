# CryptoBoard

A multi-page crypto app built on React + Vite + shadcn/ui, with two implemented
pages:

- **Market Dashboard** (`/`) — live Binance market data (price, chart, order
  book, trades).
- **AI Agent** (`/agent`) — an **Agent Room**: a visual roster of independent
  cat-faced paper-trading agents. Each cat reads Binance data + indicators,
  asks an LLM for a BUY/SELL/HOLD signal, applies risk rules, and simulates
  the resulting trade in memory. Drag a task card (symbol + strategy) onto a
  cat to assign it work. **No agent ever places a real order.**

Every other sidebar route (`/markets`, `/agent/signals`, `/agent/logs`,
`/history`, `/alerts`, `/settings`) is scaffolded with a "Coming soon"
placeholder so routing and the app shell are already in place for future
pages.

## Tech stack

**Client**
- React 18 + Vite (JavaScript/JSX)
- Tailwind CSS v4
- shadcn/ui (sidebar, card, button, badge, tabs, select, table, skeleton,
  tooltip, separator, scroll-area, input, switch, chart, sonner,
  dropdown-menu, alert, toggle-group, breadcrumb, label, avatar, progress,
  slider, textarea, pagination, alert-dialog, collapsible, popover)
- React Router v6 (`react-router-dom`)
- TanStack Query (`@tanstack/react-query`) for REST fetching/caching/mutations
- Native WebSocket (`useBinanceSocket`) and native `EventSource`
  (`useAgentStream`) for live data
- Recharts via the shadcn `chart` component
- `lucide-react` icons, `sonner` toasts

**Server** (`/server`, separate Node package)
- Express, `cors`, `dotenv`
- `technicalindicators` (RSI/EMA/MACD/ATR)
- `zod` for LLM-response + config validation
- JSON-file persistence (`server/data/store.json`), keyed by agent id, for
  each agent's config/signals/positions/equity
- An `AgentManager` holding one `Agent` instance per cat — each with its own
  timer, state machine, and loop — so agents run truly independently
- A single room-wide Server-Sent Events stream, with every event tagged by
  `agentId`, for log/signal/status/position/created/removed events

## Setup commands (in order)

These were already run to get this project to its current state — included
here for reference / for reproducing on a clean checkout.

```bash
# Client (run from Frontend/)
npm install
npm install react-router-dom @tanstack/react-query recharts sonner next-themes
npm install -D concurrently
npx shadcn@latest init
npx shadcn@latest add sidebar card button badge tabs select table skeleton \
  tooltip separator scroll-area input switch chart sonner dropdown-menu \
  alert toggle-group breadcrumb label avatar progress slider textarea \
  pagination alert-dialog collapsible popover

# Server (run from server/)
npm install
```

## Running client + server together

```bash
# from Frontend/
cp ../server/.env.example ../server/.env   # first time only — see below
npm run dev:all        # runs the Vite client and the agent server together
```

Individually:

```bash
npm run dev            # client only, http://localhost:5173
npm run dev:server     # server only, http://localhost:4000 (from Frontend/)
npm run build          # production client build
npm run preview        # preview the production client build
npm run lint           # eslint
```

Vite proxies `/api/*` to `http://localhost:4000` (see `vite.config.js`), so
the client always calls relative `/api/...` paths — no CORS config needed in
dev, and no base URL to change between environments.

### Server `.env`

```bash
cd server
cp .env.example .env
```

```
PORT=4000
AGENT_MOCK=true          # true = random mock signals, no LLM call needed
ANTHROPIC_API_KEY=       # only used when AGENT_MOCK is not "true"
```

With `AGENT_MOCK=true` (the default, and automatic whenever
`ANTHROPIC_API_KEY` is unset) the agent generates randomized BUY/SELL/HOLD
signals so the whole UI — KPIs, current signal, equity chart, activity log,
signal history, open positions — works without any API key. Set
`ANTHROPIC_API_KEY` and `AGENT_MOCK=false` to call a real LLM instead; the key
never leaves the server.

## Project structure

```
Frontend/src/
  main.jsx                      # QueryClientProvider, ThemeProvider, TooltipProvider, BrowserRouter
  App.jsx                       # <Routes> definition + <Toaster />
  components/
    ui/                         # shadcn-generated primitives
    layout/
      AppLayout.jsx              # sidebar + topbar + <Outlet />
      AppSidebar.jsx             # grouped nav (Overview / AI / Account), avatar+dropdown footer
      ThemeProvider.jsx          # dark/light, persisted to localStorage
      ConnectionBadge.jsx        # websocket status badge
      ConnectionStatusContext.jsx# lets Dashboard publish ws status to the topbar
    dashboard/
      PriceCard.jsx / StatsGrid.jsx / PriceChart.jsx / OrderBook.jsx
      RecentTrades.jsx / PriceAlert.jsx
    agent/
      AgentRoom.jsx                # visual room: cat desks, drag-and-drop task assignment
      CatAvatar.jsx                # seeded, procedural inline-SVG cat face (mood = agent status)
      TaskCard.jsx                 # draggable symbol+strategy task card
      AgentHeader.jsx            # breadcrumb, status badge, start/pause/stop/run-once
      KpiCards.jsx                # status, signals today, win rate, paper PnL
      CurrentSignal.jsx           # big BUY/SELL/HOLD card with confidence + reasoning
      EquityChart.jsx             # paper balance area chart, 1D/1W/1M
      AgentConfigForm.jsx         # symbol/timeframe/strategy/model/risk/etc, paper-only switch
      ActivityLog.jsx             # SSE log timeline with collapsible raw JSON
      SignalHistory.jsx           # sortable, paginated table + CSV export
      OpenPositions.jsx           # live current price, unrealized PnL, close w/ confirm
  pages/
    Dashboard.jsx                # route "/"
    Agent.jsx                    # route "/agent"
    ComingSoon.jsx                # placeholder for every other route
    NotFound.jsx                  # 404
  hooks/
    useBinanceSocket.js           # combined-stream WS, reconnect w/ backoff, pause/resume
    useTicker.js / useKlines.js / useOrderBook.js / useTrades.js   # REST via React Query
    useAgentStream.js             # room-wide EventSource subscription w/ auto-reconnect
    useAgentStatus.js              # list/create/remove/assign + per-agent start/pause/stop/run-once
    useAgentSignals.js             # per-agent signals/positions/equity queries + close-position
    useAgentConfig.js              # per-agent config query + save mutation
  lib/
    binance.js                    # REST base URLs + fallback, WS stream URL builder, parsers
    agentApi.js                    # fetch wrapper for /api/agent/* (id-scoped + room-level)
    agentPresets.js                # strategy metadata (label/icon/color) shared by Room + config form
    format.js                     # price/volume/time formatters
    utils.js                      # shadcn `cn` helper

server/
  index.js                        # Express app, id-scoped + room-level REST routes, SSE stream
  agent.js                        # Agent (one instance's state machine/loop) + AgentManager registry
  indicators.js                   # RSI/EMA/MACD/ATR/volume-trend via `technicalindicators`
  llm.js                          # prompt building + LLM call + mock-mode generator
  schema.js                       # zod schemas for the LLM response, agent config, and agent creation
  store.js                        # JSON-file persistence (data/store.json), keyed by agent id
```

## Dashboard page notes

- Symbol selection (`BTCUSDT` / `ETHUSDT` / `BNBUSDT` / `SOLUSDT`) is stored
  in the URL as `?symbol=`, so it refetches REST data and resubscribes the
  websocket whenever it changes.
- A single combined WebSocket stream (`miniTicker` + `trade` + `depth20@100ms`
  + `kline_{interval}`) drives all live updates; `useBinanceSocket` handles
  reconnection with exponential backoff (capped at 30s) and tears the socket
  down cleanly on symbol/interval change, pause, or unmount.
- Order book updates are buffered and flushed at most every 250ms (~4/sec) to
  avoid re-render storms from the 100ms depth stream.
- The price alert and theme are the two pieces of state persisted to
  `localStorage` (per-symbol key for alerts).
- REST data from React Query is always the fallback/initial render; once the
  socket is open, live stream data overlays it.

## AI Agent page notes

- **Paper trading only.** Every agent only ever reads market data and writes
  simulated positions to its own slice of the JSON store — there is no code
  path to any exchange order-placement endpoint. The config's "Paper trading"
  switch is locked `on` and disabled in the UI as a visible guarantee of this.
- **The Room.** `AgentRoom` shows one cat per agent instance (`CatAvatar` is a
  seeded, procedurally-colored inline-SVG face whose mood reflects
  `idle`/`running`/`paused`/`error`). "+ Add cat" creates a new, unassigned
  agent. Drag a `TaskCard` (a symbol + strategy + timeframe preset, or a
  custom one built via the popover) onto a cat to reconfigure and start that
  agent (`useAssignTask` → `PUT /api/agent/:id/config` then
  `POST /api/agent/:id/start`). Clicking a cat selects it as the agent shown
  in every panel below the room (KPIs, current signal, equity chart, config
  form, activity log, signal history, open positions).
- The server holds one `Agent` instance per cat inside an `AgentManager`
  registry (`server/agent.js`) — each with its own timer and state machine,
  so agents genuinely run independently and in parallel, not as a shared
  queue.
- Each agent's loop tick: fetches klines → computes indicators → builds a
  prompt → calls the LLM (or the mock generator) → validates the response
  with zod (one retry on failure) → applies risk rules (min confidence 60%,
  max stop-loss risk, max open positions) → opens/closes a paper position →
  emits SSE events for all of the above, tagged with that agent's id.
- `AGENT_MOCK=true` (the default) replaces the LLM call with a randomized
  signal generator so the full UI works with zero setup. Flip it off and set
  `ANTHROPIC_API_KEY` in `server/.env` to use a real model — the key is read
  only on the server and never sent to the browser.
- The client subscribes to the single room-wide `/api/agent/stream` (SSE) via
  `useAgentStream`; every event carries `agentId` so the room overlays live
  status onto every cat at once, while the detail panels filter the stream
  down to whichever cat is selected. React Query remains the source of truth
  for history/pagination/CSV export.
- Open Positions shows a live current price via a small dedicated miniTicker
  WebSocket subscription (scoped to the symbols the selected agent currently
  holds) so unrealized PnL updates in real time without needing the full
  Dashboard socket.

## Adding page 2 (Markets)

1. Build `src/pages/Markets.jsx`.
2. In `src/App.jsx`, swap the placeholder route:

   ```jsx
   // before
   <Route path="/markets" element={<ComingSoon title="Markets" />} />

   // after
   <Route path="/markets" element={<Markets />} />
   ```

3. Add any new dashboard-style subcomponents under
   `src/components/markets/`, and any new data hooks under `src/hooks/`
   following the same REST-hook / websocket pattern used for the Dashboard
   page (`lib/binance.js` already exports the shared REST/WS helpers, so new
   pages can reuse `binanceFetch`, `buildStreamUrl`, etc.).
4. The sidebar nav link for `/markets` already exists in
   `AppSidebar.jsx` — no changes needed there.
