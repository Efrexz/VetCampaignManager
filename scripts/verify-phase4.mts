// Phase 4 ad-hoc verification: payload builder shape + mock client behavior.
import {
  buildCampaignPayload,
  buildSendableRecipients,
  type N8nCampaignPayload,
} from '../src/lib/campaign'
import { sendCampaign } from '../src/integrations/n8n'
import { nanoid } from 'nanoid'
import type {
  Category,
  MessageTemplate,
  Recipient,
} from '../src/lib/types'

function assert(label: string, ok: boolean, extra?: unknown) {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    console.error(`  ✗ ${label}`, extra ?? '')
    process.exitCode = 1
  }
}

// fetch shim: route on URL.
let lastFetch: { url: string; init?: RequestInit } | null = null
const globalRef = globalThis as unknown as { fetch: typeof fetch }
const realFetch = globalRef.fetch.bind(globalThis)

function fakeFetchFactory(responses: Record<string, { ok: boolean; status: number; body?: string }>) {
  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    lastFetch = { url: String(url), init }
    const key = Object.keys(responses).find((k) => String(url).includes(k))
    if (!key) {
      throw new Error(`unexpected fetch to ${url}`)
    }
    const cfg = responses[key]
    return {
      ok: cfg.ok,
      status: cfg.status,
      statusText: 'OK',
      text: async () => cfg.body ?? '',
    } as unknown as Response
  }
}

function makeRecipient(over: Partial<Recipient>): Recipient {
  return {
    id: nanoid(),
    rowNumber: 1,
    owner: 'OWNER',
    pet: 'PET',
    rawPhone: '+51 - 980000000',
    normalizedPhone: '+51980000000',
    category: 'Vacuna',
    phoneStatus: 'valid',
    ...over,
  } as Recipient
}

async function testPayloadShape() {
  console.log('\n— buildCampaignPayload —')
  const cats: Category[] = [{ id: 'c1', name: 'Vacuna' }]
  const templates: MessageTemplate[] = [
    {
      id: 't1',
      categoryId: 'c2',
      name: 'Other category',
      body: 'Hola',
      isDefault: false,
    },
    {
      id: 't2',
      categoryId: null,
      name: 'Predet',
      body: 'Hola {{owner}} por defecto',
      isDefault: true,
    },
  ]

  const r1 = makeRecipient({ owner: 'María', pet: 'Rocky', category: 'Vacuna' })
  const r2 = makeRecipient({ owner: 'Juan', pet: 'Luna', category: 'Antipulgas' })
  const sendable = buildSendableRecipients([r1, r2], cats, templates, {
    [r1.id]: true,
    [r2.id]: true,
  })

  const payload = buildCampaignPayload(sendable, {
    campaignId: 'CAMP-1',
    sentAt: '2026-07-22T12:00:00.000Z',
    source: 'VetCampaignManager',
    schema: 'vetcampaign/v1',
  })

  assert('schema label set', payload.schema === 'vetcampaign/v1')
  assert('campaign.id', payload.campaign.id === 'CAMP-1')
  assert('campaign.sentAt', payload.campaign.sentAt === '2026-07-22T12:00:00.000Z')
  assert('campaign.source', payload.campaign.source === 'VetCampaignManager')
  assert('recipients count', payload.recipients.length === 2)
  assert(
    'recipient 1 message rendered',
    payload.recipients[0].message === 'Hola María por defecto',
    payload.recipients[0].message,
  )
  assert('recipient 1 phone normalized', payload.recipients[0].phone === '+51980000000')
  assert('recipient 1 owner', payload.recipients[0].owner === 'María')
  assert('recipient 1 pet', payload.recipients[0].pet === 'Rocky')
  assert(
    'recipient 2 uses same default template',
    payload.recipients[1].message === 'Hola Juan por defecto',
  )

  // Empty sendable produces an empty recipients list (still a valid payload).
  const empty = buildCampaignPayload([], { campaignId: 'X' })
  assert('empty payload has 0 recipients', empty.recipients.length === 0)

  // sentAt default = now-ish (ISO string).
  const p2 = buildCampaignPayload(sendable, { campaignId: 'C' })
  assert('sentAt defaults to ISO', !Number.isNaN(Date.parse(p2.campaign.sentAt)))
  console.log('  sample payload:', JSON.stringify(payload, null, 2).split('\n').slice(0, 15).join('\n'))
}

async function testMockMode() {
  console.log('\n— sendCampaign: mock mode (empty webhook URL) —')
  const payload: N8nCampaignPayload = {
    schema: 'vetcampaign/v1',
    campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
    recipients: [{ id: 'r1', owner: 'A', pet: 'B', phone: '+519', category: 'Vacuna', message: 'hola' }],
  }
  const res = await sendCampaign(payload, '')
  assert('mock returns ok', res.ok === true)
  assert('mock reports status 200', res.status === 200)
  assert('mock reports mock:true', res.mock === true)
  assert('mock detail mentions count', /1 destinatario/.test(res.detail ?? ''), res.detail)
  assert('no fetch was called in mock mode', lastFetch === null)
}

async function testRealSuccess() {
  console.log('\n— sendCampaign: real success path —')
  const globalRef = globalThis as unknown as { fetch: typeof fetch }
  const original = globalRef.fetch
  globalRef.fetch = fakeFetchFactory({
    'my-n8n.example': { ok: true, status: 200, body: '{"received":true}' },
  }) as unknown as typeof fetch
  lastFetch = null
  try {
    const payload: N8nCampaignPayload = {
      schema: 'vetcampaign/v1',
      campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
      recipients: [{ id: 'r1', owner: 'A', pet: 'B', phone: '+519', category: 'Vacuna', message: 'hola' }],
    }
    const res = await sendCampaign(
      payload,
      'https://my-n8n.example.com/webhook/campaign',
    )
    assert('real ok', res.ok === true)
    assert('real status 200', res.status === 200)
    assert('real mock false', res.mock === false)
    assert('fetch hit url', /my-n8n\.example/.test(lastFetch?.url ?? ''), lastFetch?.url)
    assert('fetch was POST', lastFetch?.init?.method === 'POST')
    assert(
      'fetch sent JSON content-type',
      (lastFetch?.init?.headers as Record<string, string>)?.['Content-Type'] === 'application/json',
    )
    assert('body is JSON string', typeof lastFetch?.init?.body === 'string')
  } finally {
    globalRef.fetch = original
  }
}

async function testReal4xx() {
  console.log('\n— sendCampaign: real 4xx (not retried) —')
  const globalRef = globalThis as unknown as { fetch: typeof fetch }
  const original = globalRef.fetch
  let calls = 0
  globalRef.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls++
    return {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Bad webhook URL',
    } as unknown as Response
  }
  try {
    const payload: N8nCampaignPayload = {
      schema: 'vetcampaign/v1',
      campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
      recipients: [],
    }
    const res = await sendCampaign(payload, 'https://x.example/webhook')
    assert('4xx not ok', res.ok === false)
    assert('4xx status surfaced', res.status === 400)
    assert('4xx not retried (single call)', calls === 1, { calls })
    assert('4xx error message includes status', /400/.test(res.error ?? ''), res.error)
  } finally {
    globalRef.fetch = original
  }
}

async function testNetworkRetry() {
  console.log('\n— sendCampaign: network retry (1 retry on throw, then success) —')
  const globalRef = globalThis as unknown as { fetch: typeof fetch }
  const original = globalRef.fetch
  let calls = 0
  globalRef.fetch = async () => {
    calls++
    if (calls === 1) throw new Error('network down')
    return { ok: true, status: 200, statusText: 'OK', text: async () => 'ok' } as unknown as Response
  }
  try {
    const payload: N8nCampaignPayload = {
      schema: 'vetcampaign/v1',
      campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
      recipients: [],
    }
    const res = await sendCampaign(payload, 'https://x.example/webhook', { timeoutMs: 1000 })
    assert('retry eventually ok', res.ok === true)
    assert('exactly 2 calls (initial + 1 retry)', calls === 2, { calls })
  } finally {
    globalRef.fetch = original
  }
}

async function testNetworkAllFail() {
  console.log('\n— sendCampaign: all network calls fail —')
  const globalRef = globalThis as unknown as { fetch: typeof fetch }
  const original = globalRef.fetch
  let calls = 0
  globalRef.fetch = async () => {
    calls++
    throw new Error('network down')
  }
  try {
    const payload: N8nCampaignPayload = {
      schema: 'vetcampaign/v1',
      campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
      recipients: [],
    }
    const res = await sendCampaign(payload, 'https://x.example/webhook', { timeoutMs: 500 })
    assert('final result not ok', res.ok === false)
    assert('exactly 2 calls', calls === 2, { calls })
    assert('error includes original message', /network down/.test(res.error ?? ''), res.error)
  } finally {
    globalRef.fetch = original
  }
}

async function testAbortTimeout() {
  console.log('\n— sendCampaign: timeout handling —')
  const globalRef = globalThis as unknown as { fetch: typeof fetch }
  const original = globalRef.fetch
  // Simulate AbortError on first call, then success on retry.
  let calls = 0
  globalRef.fetch = async (_u: string | URL | Request, init?: RequestInit) => {
    calls++
    if (init?.signal?.aborted) {
      const e = new DOMException('Aborted', 'AbortError')
      throw e
    }
    return { ok: true, status: 200, statusText: 'OK', text: async () => 'ok' } as unknown as Response
  }
  try {
    const payload: N8nCampaignPayload = {
      schema: 'vetcampaign/v1',
      campaign: { id: 'C1', sentAt: 't', source: 'VetCampaignManager' },
      recipients: [],
    }
    const res = await sendCampaign(payload, 'https://x.example/webhook', { timeoutMs: 1500 })
    // Success: the fetch factory above never actually aborts, just returns
    assert('fake-success returns ok', res.ok === true)
  } finally {
    globalRef.fetch = original
    console.log(`  (calls: ${calls})`)
  }
}

async function main() {
  await testPayloadShape()
  await testMockMode()
  await testRealSuccess()
  await testReal4xx()
  await testNetworkRetry()
  await testNetworkAllFail()
  await testAbortTimeout()
  console.log('\nDONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})