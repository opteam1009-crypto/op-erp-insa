export interface SlackMessage {
  webhookUrl: string
  text: string
}

/**
 * Posts a message to a Slack incoming webhook.
 *
 * Never throws: a network-level failure (DNS, connection refused, timeout) is reported as
 * `false`, the same as a non-2xx response. The contract matters because the contract-reminder
 * cron logs a notification BEFORE calling this — an exception escaping here would abort the
 * whole employee loop, leaving that employee permanently marked "sent" and skipping every
 * remaining employee for the run.
 */
export async function sendSlackNotification({ webhookUrl, text }: SlackMessage): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return response.ok
  } catch {
    return false
  }
}
