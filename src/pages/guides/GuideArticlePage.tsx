import { Link, useParams } from 'react-router-dom'
import GuideMarkdown from '../../components/guides/GuideMarkdown'
import PageHeroBand from '../../components/PageHeroBand'
import Seo from '../../components/Seo'
import { buildGuidePageJsonLd } from '../../lib/guides/buildGuideJsonLd'
import { normalizeArticleMarkdown } from '../../lib/guides/normalizeArticleMarkdown'
import { getGuideBySlug } from '../../lib/guides/registry'
import { DEFAULT_OG_IMAGE, SITE_CONTENT_MAX_CLASS } from '../../lib/site'

function GuideBreadcrumbs(props: { headline: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/" className="text-indigo-600 hover:underline">
            Home
          </Link>
        </li>
        <li aria-hidden className="text-gray-300">
          /
        </li>
        <li>
          <span className="text-gray-500">Guides</span>
        </li>
        <li aria-hidden className="text-gray-300">
          /
        </li>
        <li>
          <span className="text-gray-900 font-medium line-clamp-1">{props.headline}</span>
        </li>
      </ol>
    </nav>
  )
}

export default function GuideArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const guide = getGuideBySlug(slug)

  if (!guide) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <Seo title="Guide not found" description="This guide is not available." noindex />
        <div className={`${SITE_CONTENT_MAX_CLASS} py-16`}>
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="text-gray-600 mt-2">
            <Link to="/international" className="text-indigo-600 font-medium hover:underline">
              International students
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const { seo } = guide
  const canonicalPath = `/guides/${seo.slug}`
  const ogImage = seo.ogImage ?? DEFAULT_OG_IMAGE
  const bodyMarkdown = normalizeArticleMarkdown(guide.articleMarkdown)
  // Follow-up: append faqPageJsonLd to this array when FAQ schema is ready.
  const jsonLd = buildGuidePageJsonLd(seo, { image: ogImage })

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <Seo
        title={seo.title}
        description={seo.metaDescription}
        ogDescription={seo.ogDescription}
        canonicalPath={canonicalPath}
        image={ogImage}
        ogType="article"
        articlePublishedTime={seo.datePublished}
        articleModifiedTime={seo.dateModified}
        jsonLd={jsonLd}
      />

      <PageHeroBand
        children={
          <>
            <GuideBreadcrumbs headline={seo.headline} />
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-4">
              {seo.headline}
            </h1>
            <p className="text-white/85 text-sm sm:text-base mt-2 max-w-2xl">
              Updated {seo.dateModified}
            </p>
          </>
        }
      />

      <div className={`${SITE_CONTENT_MAX_CLASS} py-8 sm:py-10`}>
        <article className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <GuideMarkdown markdown={bodyMarkdown} />
        </article>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-gray-600">
          More for international students?{' '}
          <Link to="/international" className="font-medium text-[#FF6F61] hover:underline">
            Australian platform &amp; your rights
          </Link>
          {' · '}
          <Link to="/listings" className="font-medium text-[#FF6F61] hover:underline">
            Browse listings
          </Link>
        </p>
      </div>
    </div>
  )
}
