import { describe, expect, test } from 'vitest'
import { maskUrl, relativeTimeEs } from '../format'

describe('maskUrl', () => {
  test('keeps protocol and first 4 chars of host, hides the rest', () => {
    expect(maskUrl('https://my-n8n.example.com/webhook/campaign')).toBe(
      'https://my-n•••••',
    )
  })

  test('returns input unchanged when it does not match a URL pattern', () => {
    expect(maskUrl('not-a-url')).toBe('not-a-url')
  })

  test('handles http URLs', () => {
    expect(maskUrl('http://10.0.0.5:1234/path')).toBe('http://10.0•••••')
  })
})

describe('relativeTimeEs', () => {
  const now = new Date(2026, 8, 21, 12, 0)

  test('minutes', () => {
    expect(relativeTimeEs(new Date(now.getTime() - 5 * 60000).toISOString(), now)).toBe(
      'Hace 5 min',
    )
  })

  test('hours', () => {
    expect(relativeTimeEs(new Date(now.getTime() - 2 * 3600000).toISOString(), now)).toBe(
      'Hace 2 h',
    )
  })

  test('days', () => {
    expect(relativeTimeEs(new Date(now.getTime() - 3 * 86400000).toISOString(), now)).toBe(
      'Hace 3 días',
    )
  })

  test('invalid input yields empty string', () => {
    expect(relativeTimeEs('not-a-date', now)).toBe('')
  })
})
