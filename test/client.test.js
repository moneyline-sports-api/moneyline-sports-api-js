import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MoneyLine, MoneyLineError } from '../dist/index.js'

const fakeFetch = (status, body, seen = {}) => async (url, init) => {
  seen.url = String(url); seen.init = init
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

test('sends the key, drops undefined params, and returns data', async () => {
  const seen = {}
  const ml = new MoneyLine({ apiKey: 'k', fetch: fakeFetch(200, { success: true, data: [1], meta: {}, error: null }, seen) })
  assert.deepEqual(await ml.odds({ league: 'nfl', market: undefined }), [1])
  assert.equal(seen.url, 'https://mlapi.bet/v1/odds?league=nfl')
  assert.equal(seen.init.headers['x-api-key'], 'k')
})

test('throws MoneyLineError with the API error code', async () => {
  const ml = new MoneyLine({ apiKey: 'bad', fetch: fakeFetch(401, { success: false, data: null, meta: { requestId: 'r1' }, error: { message: 'Invalid key', statusCode: 401, code: 'ERR_API_KEY_INVALID' } }) })
  await assert.rejects(ml.sports(), (e) => e instanceof MoneyLineError && e.status === 401 && e.code === 'ERR_API_KEY_INVALID' && e.requestId === 'r1')
})

test('ask posts one user message', async () => {
  const seen = {}
  const ml = new MoneyLine({ apiKey: 'k', fetch: fakeFetch(200, { success: true, data: { answer: 'x' }, meta: {}, error: null }, seen) })
  await ml.ask('best NFL props tonight?')
  assert.deepEqual(JSON.parse(seen.init.body), { messages: [{ role: 'user', content: 'best NFL props tonight?' }] })
})
