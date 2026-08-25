export interface SlackMessage {
  webhookUrl: string
  text: string
}

export async function sendSlackNotification({ webhookUrl, text }: SlackMessage): Promise<boolean> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return response.ok
}
