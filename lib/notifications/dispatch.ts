import { sendSlackNotification } from '@/lib/slack/notify'

export interface NotificationSender {
  name: string
  send: (text: string) => Promise<boolean>
}

export interface NotificationEnv {
  SLACK_WEBHOOK_URL?: string
}

/**
 * Builds the list of active notification senders from environment config.
 * Kakao AlimTalk has no entry yet: no 발송대행사(vendor) is contracted, and
 * every vendor's API shape differs, so there is nothing real to call. Once a
 * vendor is chosen, add another `if (env.KAKAO_...) senders.push({ name: 'kakao', send: ... })`
 * here — dispatchNotification and every call site stay unchanged.
 */
export function getConfiguredSenders(env: NotificationEnv): NotificationSender[] {
  const senders: NotificationSender[] = []
  if (env.SLACK_WEBHOOK_URL) {
    senders.push({
      name: 'slack',
      send: (text) => sendSlackNotification({ webhookUrl: env.SLACK_WEBHOOK_URL!, text }),
    })
  }
  return senders
}

/** Sends `text` through every sender in parallel; returns true if at least one succeeded. */
export async function dispatchToSenders(senders: NotificationSender[], text: string): Promise<boolean> {
  if (senders.length === 0) return false
  const results = await Promise.all(senders.map((sender) => sender.send(text)))
  return results.some(Boolean)
}

/** Convenience wrapper used by cron routes: builds senders from process.env and dispatches. */
export async function dispatchNotification(text: string): Promise<boolean> {
  const env: NotificationEnv = {
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  }
  return dispatchToSenders(getConfiguredSenders(env), text)
}
