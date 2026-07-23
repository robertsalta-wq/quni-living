export type CampusSeoFaq = {
  question: string
  answer: string
}

export type CampusSeoSection = {
  heading: string
  body: string
}

export type CampusSeoTipsSection = {
  heading: string
  tips: string[]
}

/** Matches suburb-generator campus content object shape. */
export type CampusSeoContent = {
  metaTitle: string
  metaDescription: string
  h1: string
  intro: string
  livingSection: CampusSeoSection
  transportSection: CampusSeoSection
  costSection: CampusSeoSection
  tipsSection: CampusSeoTipsSection
  faqs: CampusSeoFaq[]
  ctaText: string
}

const campusContentModules = import.meta.glob('../../../content/campuses/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, CampusSeoContent>

function pathKey(universitySlug: string, campusSlug: string): string | null {
  const uni = universitySlug.trim().toLowerCase()
  const campus = campusSlug.trim().toLowerCase()
  if (!uni || !campus) return null
  return `${uni}/${campus}`
}

function moduleKeyToSlugs(modulePath: string): { universitySlug: string; campusSlug: string } | null {
  const normalized = modulePath.replace(/\\/g, '/')
  const match = normalized.match(/content\/campuses\/([^/]+)\/([^/]+)\.json$/i)
  if (!match) return null
  return {
    universitySlug: match[1].toLowerCase(),
    campusSlug: match[2].toLowerCase(),
  }
}

const BY_KEY: Record<string, CampusSeoContent> = {}
for (const [modulePath, content] of Object.entries(campusContentModules)) {
  const slugs = moduleKeyToSlugs(modulePath)
  if (!slugs || !content) continue
  BY_KEY[`${slugs.universitySlug}/${slugs.campusSlug}`] = content
}

/** Strip a trailing brand suffix the generator may have added; Seo appends SITE_NAME. */
export function stripCampusMetaBrandSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*Quni(?:\s+Living)?\s*$/i, '').trim()
}

export function getCampusSeoContent(
  universitySlug: string,
  campusSlug: string,
): CampusSeoContent | null {
  const key = pathKey(universitySlug, campusSlug)
  if (!key) return null
  return BY_KEY[key] ?? null
}

/** Paths with content files, for prerender + sitemap expansion. */
export function listCampusSeoPaths(): string[] {
  return Object.keys(BY_KEY)
    .map((key) => {
      const [universitySlug, campusSlug] = key.split('/')
      if (!universitySlug || !campusSlug) return null
      return `/student-accommodation/${universitySlug}/${campusSlug}`
    })
    .filter((p): p is string => Boolean(p))
    .sort()
}
