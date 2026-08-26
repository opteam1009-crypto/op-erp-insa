import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendSlackNotification } from './notify'

describe('sendSlackNotification', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts the message text to the webhook URL and returns true on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendSlackNotification({ webhookUrl: 'https://hooks.slack.com/x', text: '안녕' })

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.com/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '안녕' }),
    })
  })

  it('returns false when the webhook responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await sendSlackNotification({ webhookUrl: 'https://hooks.slack.com/x', text: '안녕' })
    expect(result).toBe(false)
  })

  it('returns false instead of throwing when the fetch itself fails at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    await expect(
      sendSlackNotification({ webhookUrl: 'https://hooks.slack.com/x', text: '안녕' })
    ).resolves.toBe(false)
  })
})
