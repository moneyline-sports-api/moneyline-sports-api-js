export const DEFAULT_BASE_URL = 'https://mlapi.bet'
const DEFAULT_TIMEOUT_MS = 15_000

type Query = Record<string, string | number | boolean | undefined>

export type SourceType = 'sportsbook' | 'dfs' | 'exchange' | 'all'

export interface ClientOptions {
  /** Your MoneyLine API key. Defaults to the MONEYLINE_API_KEY environment variable. */
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  fetch?: typeof fetch
}

export interface Envelope<T> {
  success: boolean
  data: T
  meta: Record<string, unknown>
  error: { message: string; statusCode: number; code: string } | null
}

export class MoneyLineError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null, readonly requestId: string | null) {
    super(message)
    this.name = 'MoneyLineError'
  }
}

export class MoneyLine {
  private readonly apiKey?: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? (typeof process !== 'undefined' ? process.env?.MONEYLINE_API_KEY : undefined)
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    // Call the global fetch through a wrapper: browsers throw "Illegal invocation" when fetch runs with this = the client.
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init))
  }

  /** Calls any endpoint and returns the full response envelope (data + meta). */
  async request<T = unknown>(method: 'GET' | 'POST', path: string, { query, body }: { query?: Query; body?: unknown } = {}): Promise<Envelope<T>> {
    const url = new URL(this.baseUrl + path)
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v))

    const headers: Record<string, string> = { accept: 'application/json' }
    if (this.apiKey) headers['x-api-key'] = this.apiKey
    if (body !== undefined) headers['content-type'] = 'application/json'

    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const json = (await res.json().catch(() => null)) as Envelope<T> | null
    if (!res.ok || !json?.success) {
      throw new MoneyLineError(
        json?.error?.message ?? `HTTP ${res.status}`,
        res.status,
        json?.error?.code ?? null,
        (json?.meta?.requestId as string | undefined) ?? null,
      )
    }
    return json
  }

  /** GET an endpoint and return only its data. */
  async get<T = unknown>(path: string, query?: Query): Promise<T> {
    return (await this.request<T>('GET', path, { query })).data
  }

  /** Live counts of leagues, books and markets. No API key needed. */
  coverage() { return this.get('/public/coverage') }

  sports() { return this.get('/v1/sports') }
  leagues(query?: { sport?: string }) { return this.get('/v1/leagues', query) }

  events(query?: { league?: string; date?: string; from?: string; to?: string; status?: string; limit?: number; page?: number }) {
    return this.get('/v1/events', query)
  }
  event(eventId: string) { return this.get(`/v1/events/${encodeURIComponent(eventId)}`) }
  liveEvents(query?: { league?: string }) { return this.get('/v1/events/live', query) }

  odds(query?: { league?: string; market?: string; bookmaker?: string; sourceType?: SourceType; limit?: number; page?: number }) {
    return this.get('/v1/odds', query)
  }
  eventOdds(eventId: string, query?: { market?: string; sourceType?: SourceType }) {
    return this.get(`/v1/events/${encodeURIComponent(eventId)}/odds`, query)
  }
  bookmakers(query?: { sourceType?: SourceType }) { return this.get('/v1/odds/bookmakers', query) }

  playerProps(query?: { league?: string; market?: string; player?: string; playerId?: string; bookmaker?: string; sourceType?: SourceType; limit?: number; page?: number }) {
    return this.get('/v1/player-props', query)
  }
  /** Hit rates for one prop. The API rejects a call without both `market` and `line`. */
  hitRates(playerId: string, query: { market: string; line: number }) {
    return this.get(`/v1/players/${encodeURIComponent(playerId)}/hit-rates`, query)
  }

  evBets(query?: { league?: string; market?: string; sourceType?: SourceType; limit?: number }) { return this.get('/v1/edge/ev', query) }
  valueBets(query?: { league?: string; market?: string; sourceType?: SourceType; minEdge?: number; limit?: number }) { return this.get('/v1/edge/value', query) }
  arbitrage(query?: { league?: string; market?: string; sourceType?: SourceType; minProfit?: number; limit?: number }) { return this.get('/v1/edge/arbitrage', query) }
  bestBets(query?: { league?: string; market?: string; bookmaker?: string; sourceType?: SourceType; limit?: number; page?: number }) {
    return this.get('/v1/best-bets', query)
  }

  /** MoneyLine AI: a data-grounded answer to a betting question. */
  async ask(message: string, options: Record<string, unknown> = {}) {
    return (await this.request('POST', '/v1/ai/chat', { body: { messages: [{ role: 'user', content: message }], ...options } })).data
  }
}

export default MoneyLine
