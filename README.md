# MoneyLine Sports API for JavaScript and TypeScript

The official SDK for [MoneyLine Sports API](https://www.moneylineapp.com). Use it to get live odds, player props, hit rates, +EV and arbitrage signals, and scores for NFL, NBA, MLB, NHL, college football, college basketball, EPL, MLS and the World Cup, all through one API.

See what's covered right now, including leagues, sportsbooks, DFS apps and exchanges, at [moneylineapp.com/coverage](https://www.moneylineapp.com/coverage).

## Install

```bash
npm install moneyline-sports-api
```

The SDK needs Node 18 or later and has no dependencies. It also runs in Deno, Bun and edge runtimes.

## Get an API key

[Sign up for a free key](https://www.moneylineapp.com/signup). The SDK reads it from the `MONEYLINE_API_KEY` environment variable, or you can pass it in yourself:

```ts
import { MoneyLine } from 'moneyline-sports-api'

const ml = new MoneyLine({ apiKey: process.env.MONEYLINE_API_KEY })
```

## Examples

```ts
// Today's NFL odds across every book
const odds = await ml.odds({ league: 'nfl' })

// Player props for one player
const props = await ml.playerProps({ league: 'nba', player: 'Jayson Tatum' })

// Positive expected-value bets and arbitrage
const ev = await ml.evBets({ league: 'nfl', limit: 10 })
const arbs = await ml.arbitrage({ league: 'mlb' })

// Hit rates over the last 5, 10 and 25 games and the season
// for one prop. Take the player ID and line from a player-prop record.
const rates = await ml.hitRates('nba-p-3934672', { market: 'player_points', line: 24.5 })

// Ask MoneyLine AI a question grounded in live data
const answer = await ml.ask('Best NBA player props tonight?')

// Live coverage counts (no key needed)
const coverage = await ml.coverage()
```

Every other endpoint is reachable through `ml.get(path, query)`, which returns the response data. To get `data` and `meta` together, use `ml.request('GET', path, { query })`.

## Errors

A failed call throws `MoneyLineError` with the HTTP `status`, a stable `code` such as `ERR_API_KEY_INVALID` or `ERR_CREDIT_LIMIT`, and a `requestId` to include when you contact support.

```ts
import { MoneyLineError } from 'moneyline-sports-api'

try {
  await ml.odds({ league: 'nfl' })
} catch (err) {
  if (err instanceof MoneyLineError && err.status === 429) {
    // You hit the rate limit. Wait, then try again.
  }
}
```

Each request times out after 15 seconds. To change that, pass `timeoutMs`.

## Links

- [Documentation](https://www.moneylineapp.com/docs)
- [Live coverage](https://www.moneylineapp.com/coverage)
- [OpenAPI spec](https://mlapi.bet/openapi.json)
- [Pricing](https://www.moneylineapp.com/pricing)
- [Python SDK](https://github.com/moneyline-sports-api/moneyline-sports-api-python)

MIT licensed.
