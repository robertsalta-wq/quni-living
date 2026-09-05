import { useState } from 'react'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import {
  QldRoomingHouseRulesDownloadBar,
  QldRoomingHouseRulesFields,
} from '../components/landlord/QldRoomingHouseRulesFields'
import { parseRoomsRentedToResidents } from '../lib/tenancy/qldBoarderLodger'
import {
  qldPublicHouseRulesAccess,
  type QldHouseRuleExtras,
  type QldHouseRuleSubject,
} from '../lib/tenancy/qldHouseRules'

/**
 * Public QLD rooming house-rules generator. No account. No save.
 * Preview-gated; Production 302s away until Rob says go.
 */
export default function QldHouseRulesPage() {
  const [livesAtPremises, setLivesAtPremises] = useState<boolean | null>(null)
  const [roomsLet, setRoomsLet] = useState('')
  const [commonAreas, setCommonAreas] = useState('')
  const [extras, setExtras] = useState<QldHouseRuleExtras>({})
  const [premisesLine, setPremisesLine] = useState('')

  const roomsParsed = parseRoomsRentedToResidents(roomsLet)
  const access = qldPublicHouseRulesAccess({
    providerLivesAtPremises: livesAtPremises,
    roomsLetToResidents: roomsParsed,
  })

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
        subtitle="For Queensland rooming accommodation: a room with shared facilities. Two PDFs: one to give the proposed resident, one to put on the wall."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
          <p>
            This is not legal advice. Quinnvestments Pty Ltd trading as Quni Living is not the provider or
            the provider&apos;s agent, and does not sign the agreement.
          </p>
          <p>
            The house rules prescribed by law apply whether or not you use this page. Extra rules must stay
            inside the seven subjects in the Residential Tenancies and Rooming Accommodation Act 2008 s 268(1).
          </p>
          <p>Nothing is saved. Download the PDFs and keep them with your records.</p>
        </div>

        <fieldset className="mb-8 space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            Does the provider live at the rental premises?
          </legend>
          <div className="flex flex-wrap gap-4 text-sm text-gray-800">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="qld-hr-lives-at"
                checked={livesAtPremises === false}
                onChange={() => {
                  setLivesAtPremises(false)
                  setRoomsLet('')
                }}
              />
              No
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="qld-hr-lives-at"
                checked={livesAtPremises === true}
                onChange={() => setLivesAtPremises(true)}
              />
              Yes
            </label>
          </div>
          {livesAtPremises === true ? (
            <div>
              <label htmlFor="qld-hr-rooms-let" className="mb-1.5 block text-sm font-medium text-gray-800">
                How many rooms are occupied by, or available to, residents?
              </label>
              <input
                id="qld-hr-rooms-let"
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                value={roomsLet}
                onChange={(e) => setRoomsLet(e.target.value)}
                className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--quni-rust)] focus:outline-none focus:ring-1 focus:ring-[var(--quni-rust)]"
              />
            </div>
          ) : null}
        </fieldset>

        {access === 'stop' ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800" role="status">
            The rooming accommodation house rules do not apply to this arrangement. Do not use this generator
            for these premises.
          </p>
        ) : null}

        {access === 'generate' ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  )
}
