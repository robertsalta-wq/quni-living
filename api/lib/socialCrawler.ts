/** Detect link-preview crawlers (WhatsApp, Facebook, Twitter, LinkedIn, Slack, Discord). */
export function isSocialCrawler(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim()
  if (!ua) return false
  return SOCIAL_CRAWLER_UA.test(ua)
}

/**
 * Genuine social / link-preview bots only.
 * Googlebot family (Googlebot, Googlebot-Image, Googlebot-News, AdsBot-Google,
 * Google-InspectionTool) must NOT match — prerendered HTML is authoritative for those.
 */
const SOCIAL_CRAWLER_UA =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|discordbot/i
