import { describe, it, expect, vi } from 'vitest'
import { getConfiguredSenders, dispatchToSenders, type NotificationSender } from './dispatch'

describe('getConfiguredSenders', () => {
  it('includes a slack sender when SLACK_WEBHOOK_URL is set', () => {
    const senders = getConfiguredSenders({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x' })
    expect(senders.map((s) => s.name)).toEqual(['slack'])
  })

  it('returns no senders when SLACK_WEBHOOK_URL is unset', () => {
    const senders = getConfiguredSenders({})
    expect(senders).toEqual([])
  })
})

describe('dispatchToSenders', () => {
  it('returns true if at least one sender succeeds', async () => {
    const senders: NotificationSender[] = [
      { name: 'a', send: vi.fn().mockResolvedValue(false) },
      { name: 'b', send: vi.fn().mockResolvedValue(true) },
    ]
    expect(await dispatchToSenders(senders, '안녕')).toBe(true)
  })

  it('returns false when there are no senders', async () => {
    expect(await dispatchToSenders([], '안녕')).toBe(false)
  })

  it('returns false when every sender fails', async () => {
    const senders: NotificationSender[] = [{ name: 'a', send: vi.fn().mockResolvedValue(false) }]
    expect(await dispatchToSenders(senders, '안녕')).toBe(false)
  })

  it('calls every sender with the same text', async () => {
    const sendA = vi.fn().mockResolvedValue(true)
    const sendB = vi.fn().mockResolvedValue(true)
    await dispatchToSenders([{ name: 'a', send: sendA }, { name: 'b', send: sendB }], '메시지')
    expect(sendA).toHaveBeenCalledWith('메시지')
    expect(sendB).toHaveBeenCalledWith('메시지')
  })
})
