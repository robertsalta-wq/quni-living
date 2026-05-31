/** Detect link-preview crawlers (WhatsApp, Facebook, iMessage, Slack, etc.). */
export function isSocialCrawler(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim()
  if (!ua) return false
  return SOCIAL_CRAWLER_UA.test(ua)
}

const SOCIAL_CRAWLER_UA =
  /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|embedly|vkshare|googlebot/i
