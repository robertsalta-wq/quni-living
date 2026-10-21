import Seo from '../components/Seo'
import ByTheRoomCalculator from '../components/byTheRoom/ByTheRoomCalculator'
import { BY_THE_ROOM_PATH } from '../lib/byTheRoom'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const PAGE_TITLE = 'Whole home vs by the room'
const PAGE_DESCRIPTION =
  'Compare the rent you get now for a whole home with letting it by the room. Every figure is one you enter. NSW and QLD.'

/**
 * Shareable landlord comparison. noindex until the NSW and QLD notes have approved wording.
 * Not listed in the sitemap.
 */
export default function ByTheRoom() {
  return (
    <div className="bg-admin-surface-2 text-admin-ink-3">
      <Seo title={PAGE_TITLE} description={PAGE_DESCRIPTION} canonicalPath={BY_THE_ROOM_PATH} noindex />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-8 sm:py-10`}>
        <h1 className="font-display text-2xl font-bold text-admin-ink sm:text-3xl">{PAGE_TITLE}</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-ink-3 sm:text-base">
          Enter what you get now, and what each room would bring in. NSW and QLD.
        </p>
        <ByTheRoomCalculator />
      </div>
    </div>
  )
}
