import { useState } from 'react'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import {
  QldRoomingHouseRulesDownloadBar,
  QldRoomingHouseRulesFields,
} from '../components/landlord/QldRoomingHouseRulesFields'
import type { QldHouseRuleExtras, QldHouseRuleSubject } from '../lib/tenancy/qldHouseRules'

/**
 * Public QLD rooming house-rules generator. No account. No save.
 * Preview-gated; Production 302s away until Rob says go.
 */
export default function QldHouseRulesPage() {
  const [commonAreas, setCommonAreas] = useState('')
  const [extras, setExtras] = useState<QldHouseRuleExtras>({})
  const [premisesLine, setPremisesLine] = useState('')

  function onExtraChange(subject: QldHouseRuleSubject, value: string) {
    setExtras((prev) => {
      const next = { ...prev }
      if (!value.trim()) delete next[subject]
      else next[subject] = value
      return next
    })
  }

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="QLD rooming house rules"
        description="Generate Queensland prescribed house rules for rooming accommodation: a resident copy and a wall-display copy."
        noindex
      />
      <PageHeroBand
        title="QLD rooming house rules"
        subtitle="Generate the prescribed house rules plus any extras the Act allows. Two PDFs: one to give the proposed resident, one to put on the wall."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
          <p>
            This is not legal advice. Quni Living Pty Ltd is not the provider or the provider&apos;s agent, and
            does not sign the agreement.
          </p>
          <p>
            The house rules prescribed by law apply whether or not you use this page. Extra rules must stay
            inside the seven subjects in the Residential Tenancies and Rooming Accommodation Act 2008 s 268(1).
          </p>
          <p>Nothing is saved. Download the PDFs and keep them with your records.</p>
        </div>
        <QldRoomingHouseRulesFields
          commonAreas={commonAreas}
          extras={extras}
          onCommonAreasChange={setCommonAreas}
          onExtraChange={onExtraChange}
          premisesLine={premisesLine}
          onPremisesLineChange={setPremisesLine}
          showPremisesLine
          compactIntro
        />
        <div className="mt-8 border-t border-gray-100 pt-6">
          <QldRoomingHouseRulesDownloadBar
            commonAreas={commonAreas}
            extras={extras}
            premisesLine={premisesLine}
          />
        </div>
      </div>
    </div>
  )
}
