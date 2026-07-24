import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../lib/database.types'
import { useRenterSituationSave } from '../../../hooks/useRenterSituationSave'
import { useStudentVerificationDocUpload } from '../../../hooks/useStudentVerificationDocUpload'
import { computeRenterReadiness, isRenterUniversalVerificationComplete, tierToSync } from '../../../lib/renterReadiness'
import { isRouteSectionComplete } from '../../../lib/renterRouteSection'
import { incomeBandSuggestsGuarantor } from '../../../lib/renterIncomeBands'
import type { RenterSituation } from '../../../lib/renterSituation'
import { dbPatchForVerificationDoc, docStepComplete, type VerificationDocKind } from '../../../lib/verificationDocSlot'
import { isStudentUniEmailVerified } from '../../../lib/studentUniEmailVerification'
import { situationShowsVerificationEmail } from '../../../lib/renterVerificationEmail'
import { isStep2Saved } from '../../../lib/studentOnboarding'
import {
  renterOptionalDividerClass,
  renterOptionalDividerLineClass,
  renterStackClass,
} from '../../../lib/renterProfileFormClasses'
import {
  emergencySummary,
  isPersonalDetailsComplete,
  personalDetailsSummary,
  renterProfileDefaultExpandedSection,
  routeSectionNumber,
  routeSectionTitle,
} from '../../../lib/renterProfileSection'
import {
  parseRenterSectionHash,
  type RenterProfileExpandKey,
} from '../../../lib/renterProfilePaths'
import { ProfileSetupSection, ProfileNestedSection } from './ProfileSetupSection'
import { RenterSituationSection } from './RenterSituationPicker'
import { RenterProfilePersonalSection } from './RenterProfilePersonalSection'
import { RenterUniversalVerificationSection } from './RenterUniversalVerificationSection'
import { RenterStudentRouteSection } from './RenterStudentRouteSection'
import { RenterWorkingRouteSection } from './RenterWorkingRouteSection'
import { RenterVisaRouteSection } from './RenterVisaRouteSection'
import { RenterGeneralRouteSection } from './RenterGeneralRouteSection'
import { RenterProfileEmergencySection } from './RenterProfileEmergencySection'
import { RenterGuarantorSection, isGuarantorSectionComplete } from './RenterGuarantorSection'
import { RenterProfileAboutSection } from './RenterProfileAboutSection'
import { RenterProfileLivingPreferencesSection } from './RenterProfileLivingPreferencesSection'
import { RenterProfileReadinessDriver } from './RenterProfileReadinessDriver'
import { RenterProfileLockedRouteSection, SwitchSituationDialog } from './RenterProfileShell'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

function routeSectionIcon(situation: RenterSituation): 'study' | 'work' | 'verify' {
  if (situation === 'student') return 'study'
  if (situation === 'working') return 'work'
  return 'verify'
}

function routeSubtitle(situation: RenterSituation): string {
  switch (situation) {
    case 'student':
      return 'Study details and how you’ll fund rent'
    case 'working':
      return 'Job and income details for your application'
    case 'working_holiday':
    case 'backpacker':
      return 'Visa and funding details'
    case 'retired':
      return 'How you fund rent in retirement'
    case 'between_jobs':
      return 'How you fund rent between roles'
  }
}

function verificationSummary(
  profile: StudentRow,
  situation: RenterSituation,
  docUpload: ReturnType<typeof useStudentVerificationDocUpload>,
): string {
  const parts = ['Government photo ID', 'Supporting document']
  if (situation === 'student' && isStudentUniEmailVerified(profile)) parts.push('University email verified')
  if (situation === 'working' && profile.work_email_verified) parts.push('Work email verified')
  if (docStepComplete(docUpload.idDoc) && docStepComplete(docUpload.identitySupportDoc)) {
    return parts.join(' · ')
  }
  if (situationShowsVerificationEmail(situation)) {
    const emailLabel = situation === 'student' ? 'University email' : 'Work email'
    return `${parts.join(' · ')} · ${emailLabel}`
  }
  return parts.join(' · ')
}

function shouldShowGuarantor(profile: StudentRow, situation: RenterSituation | null): boolean {
  if (!situation) return false
  if (profile.has_guarantor === true) return true
  if (situation === 'working') {
    return !profile.income_band?.trim() || incomeBandSuggestsGuarantor(profile.income_band)
  }
  return Boolean(profile.income_band?.trim() && incomeBandSuggestsGuarantor(profile.income_band))
}

type Props = {
  profile: StudentRow
  userId: string
  displayEmail: string
  onRefresh: () => Promise<void>
  onProfilePatch?: (patch: Partial<StudentRow>) => void
  children?: ReactNode
}

export function RenterProfileSetup({ profile, userId, displayEmail, onRefresh, onProfilePatch, children }: Props) {
  const location = useLocation()
  const situation = profile.renter_situation ?? null
  const readiness = computeRenterReadiness(profile)
  const [switchDialog, setSwitchDialog] = useState<{
    from: RenterSituation
    to: RenterSituation
    resolve: (ok: boolean) => void
  } | null>(null)

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const handleRefresh = useCallback(async () => {
    await onRefreshRef.current()
  }, [])

  const onConfirmSwitch = useCallback(
    (args: { fromSituation: RenterSituation; toSituation: RenterSituation }) =>
      new Promise<boolean>((resolve) => {
        setSwitchDialog({ from: args.fromSituation, to: args.toSituation, resolve })
      }),
    [],
  )

  const onVerificationDocUploaded = useCallback(
    (kind: VerificationDocKind, filePath: string, submittedAt: string, displayName: string) => {
      onProfilePatch?.(dbPatchForVerificationDoc(kind, filePath, submittedAt, displayName) as Partial<StudentRow>)
    },
    [onProfilePatch],
  )

  const docUpload = useStudentVerificationDocUpload(profile, userId, onVerificationDocUploaded)

  const { saveSituation, busy: situationBusy, error: situationError } = useRenterSituationSave({
    userId,
    profile,
    onAfterSave: handleRefresh,
    onConfirmSwitch,
  })

  useEffect(() => {
    const next = tierToSync(profile)
    if (!next) return
    let cancelled = false
    ;(async () => {
      const { error } = await supabase
        .from('student_profiles')
        .update({ verification_type: next })
        .eq('user_id', userId)
      if (!error && !cancelled) await onRefreshRef.current()
    })()
    return () => {
      cancelled = true
    }
  }, [
    profile,
    userId,
    profile.verification_type,
    profile.accommodation_verification_route,
    profile.renter_situation,
    profile.uni_email_verified,
    profile.work_email_verified,
    profile.id_document_url,
    profile.id_submitted_at,
    profile.enrolment_doc_url,
    profile.enrolment_submitted_at,
    profile.identity_supporting_doc_url,
    profile.identity_supporting_submitted_at,
  ])

  const personalComplete = isPersonalDetailsComplete(profile)
  const verificationComplete = situation
    ? isRenterUniversalVerificationComplete(profile, situation, {
        idDoc: docUpload.idDoc,
        identitySupportDoc: docUpload.identitySupportDoc,
      })
    : false
  const routeComplete = situation ? isRouteSectionComplete(situation, profile) : false
  const emergencyComplete = isStep2Saved(profile)
  const showGuarantor = situation ? shouldShowGuarantor(profile, situation) : false
  const guarantorComplete = !showGuarantor || isGuarantorSectionComplete(profile)

  const aboutHasContent = Boolean(profile.bio?.trim() || (profile.languages_spoken && profile.languages_spoken.length > 0))
  const prefsHasContent = Boolean(
    profile.room_type_preference ||
      profile.budget_min_per_week != null ||
      profile.occupancy_type ||
      profile.preferred_move_in_date,
  )

  const defaultExpanded = useMemo(
    () =>
      renterProfileDefaultExpandedSection({
        situation,
        personalComplete,
        verificationComplete,
        routeComplete,
        showGuarantor,
        guarantorComplete,
        emergencyComplete,
      }),
    [
      situation,
      personalComplete,
      verificationComplete,
      routeComplete,
      showGuarantor,
      guarantorComplete,
      emergencyComplete,
    ],
  )

  const [expanded, setExpanded] = useState<RenterProfileExpandKey | null>(defaultExpanded)
  const [guarantorOpen, setGuarantorOpen] = useState(showGuarantor && !guarantorComplete)

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [profile.user_id, defaultExpanded])

  useEffect(() => {
    if (!showGuarantor) {
      setGuarantorOpen(false)
      return
    }
    setGuarantorOpen(!guarantorComplete)
  }, [showGuarantor, guarantorComplete, profile.user_id])

  useEffect(() => {
    const parsed = parseRenterSectionHash(location.hash)
    if (!parsed) return
    setExpanded(parsed.expand)
    if (parsed.openGuarantor) setGuarantorOpen(true)
    requestAnimationFrame(() => {
      document.getElementById(parsed.scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, profile.user_id])

  const toggleSection = (key: RenterProfileExpandKey) => {
    setExpanded((prev) => (prev === key ? defaultExpanded : key))
  }

  const situationExpanded = situation == null || expanded === 'situation'

  return (
    <div className={renterStackClass}>
      {switchDialog ? (
        <SwitchSituationDialog
          fromSituation={switchDialog.from}
          nextSituation={switchDialog.to}
          onCancel={() => {
            switchDialog.resolve(false)
            setSwitchDialog(null)
          }}
          onConfirm={() => {
            switchDialog.resolve(true)
            setSwitchDialog(null)
          }}
        />
      ) : null}

      <RenterProfileReadinessDriver
        readiness={readiness}
        profile={profile}
        situation={situation}
        verificationComplete={verificationComplete}
      />

      <RenterSituationSection
        currentSituation={situation}
        onSelect={(s) => void saveSituation(s)}
        busy={situationBusy}
        error={situationError}
        expanded={situationExpanded}
        onToggle={() => toggleSection('situation')}
      />

      <ProfileSetupSection
        id="renter-section-personal"
        sectionNum="01"
        icon="user"
        title="Personal details"
        subtitle="Name, phone and basics"
        status={personalComplete ? 'done' : 'todo'}
        summary={personalDetailsSummary(profile)}
        expanded={expanded === 'personal'}
        onToggle={() => toggleSection('personal')}
      >
        <RenterProfilePersonalSection
          profile={profile}
          userId={userId}
          displayEmail={displayEmail}
          onSaved={handleRefresh}
        />
      </ProfileSetupSection>

      <ProfileSetupSection
        id="renter-section-verification"
        sectionNum="02"
        icon="verify"
        title="Verification"
        subtitle="Photo ID and supporting document"
        status={verificationComplete ? 'done' : 'todo'}
        summary={situation ? verificationSummary(profile, situation, docUpload) : undefined}
        expanded={expanded === 'verification'}
        onToggle={() => toggleSection('verification')}
      >
        {situation ? (
          <RenterUniversalVerificationSection
            profile={profile}
            userId={userId}
            situation={situation}
            onRefresh={handleRefresh}
            onProfilePatch={onProfilePatch}
            docUpload={docUpload}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--quni-ink-4)' }}>Choose your situation to see verification steps.</p>
        )}
      </ProfileSetupSection>

      {!situation ? <RenterProfileLockedRouteSection /> : null}

      {situation ? (
        <ProfileSetupSection
          id="renter-section-route"
          sectionNum={routeSectionNumber()}
          icon={routeSectionIcon(situation)}
          title={routeSectionTitle(situation)}
          subtitle={routeSubtitle(situation)}
          status={routeComplete && (!showGuarantor || guarantorComplete) ? 'done' : 'todo'}
          expanded={expanded === 'route'}
          onToggle={() => toggleSection('route')}
        >
          {situation === 'student' ? (
            <RenterStudentRouteSection profile={profile} userId={userId} onRefresh={handleRefresh} docUpload={docUpload} />
          ) : null}
          {situation === 'working' ? (
            <RenterWorkingRouteSection profile={profile} userId={userId} onSaved={handleRefresh} />
          ) : null}
          {situation === 'working_holiday' || situation === 'backpacker' ? (
            <RenterVisaRouteSection profile={profile} userId={userId} onRefresh={handleRefresh} />
          ) : null}
          {situation === 'retired' ? (
            <RenterGeneralRouteSection profile={profile} userId={userId} situation="retired" onSaved={handleRefresh} />
          ) : null}
          {situation === 'between_jobs' ? (
            <RenterGeneralRouteSection profile={profile} userId={userId} situation="between_jobs" onSaved={handleRefresh} />
          ) : null}

          {showGuarantor ? (
            <ProfileNestedSection
              id="renter-section-guarantor"
              icon="guarantor"
              title="Guarantor"
              status={guarantorComplete ? 'done' : 'todo'}
              note="Shown because your declared income is low or not yet verified. A guarantor agrees to cover the rent if you can't."
              expanded={guarantorOpen}
              onToggle={() => setGuarantorOpen((v) => !v)}
            >
              <RenterGuarantorSection profile={profile} userId={userId} onSaved={handleRefresh} />
            </ProfileNestedSection>
          ) : null}
        </ProfileSetupSection>
      ) : null}

      <ProfileSetupSection
        id="renter-section-emergency"
        sectionNum="04"
        icon="emergency"
        title="Emergency contact"
        subtitle="Someone we can contact if needed"
        status={emergencyComplete ? 'done' : 'todo'}
        summary={emergencySummary(profile)}
        expanded={expanded === 'emergency'}
        onToggle={() => toggleSection('emergency')}
      >
        <RenterProfileEmergencySection profile={profile} userId={userId} onSaved={handleRefresh} />
      </ProfileSetupSection>

      <div className={renterOptionalDividerClass} role="separator">
        <span className={renterOptionalDividerLineClass} aria-hidden />
        <span className="whitespace-nowrap">Optional · helps landlords match you</span>
        <span className={renterOptionalDividerLineClass} aria-hidden />
      </div>

      <ProfileSetupSection
        id="renter-section-about"
        sectionNum="05"
        icon="bio"
        title="About you"
        subtitle="A short intro for landlords"
        status="optional"
        summary={aboutHasContent ? 'A short intro and the languages you speak' : undefined}
        expanded={expanded === 'about'}
        onToggle={() => toggleSection('about')}
      >
        <RenterProfileAboutSection profile={profile} userId={userId} onSaved={handleRefresh} />
      </ProfileSetupSection>

      <ProfileSetupSection
        id="renter-section-prefs"
        sectionNum="06"
        icon="prefs"
        title="Living preferences"
        subtitle="Budget, room type, move-in"
        status="optional"
        summary={
          prefsHasContent
            ? 'Budget, room type, move-in and lifestyle'
            : 'Budget, room type, move-in & lifestyle — optional details'
        }
        expanded={expanded === 'prefs'}
        onToggle={() => toggleSection('prefs')}
      >
        <RenterProfileLivingPreferencesSection profile={profile} userId={userId} onSaved={handleRefresh} />
      </ProfileSetupSection>

      {children}
    </div>
  )
}
