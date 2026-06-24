import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { clearQuniAccommodationVerificationRoute } from '../lib/quniAccommodationRoute'
import {
  deriveAccommodationRouteFromSituation,
  effectiveAccommodationRoute,
  RENTER_SITUATION_OPTIONS,
  type RenterSituation,
} from '../lib/renterSituation'
import { routeSectionClearPatch, routeSectionHasData } from '../lib/renterRouteSection'
import { routeSectionGroup, routeSectionTitle } from '../lib/renterProfileSection'
import type { StudentProfileRow } from '../lib/studentOnboarding'

function situationLabel(situation: RenterSituation): string {
  return RENTER_SITUATION_OPTIONS.find((o) => o.value === situation)?.label ?? situation
}

function crossRouteBoundary(
  from: 'student' | 'non_student' | null,
  to: 'student' | 'non_student' | null,
): boolean {
  return from != null && to != null && from !== to
}

function switchConfirmMessage(
  currentSituation: RenterSituation | null,
  nextSituation: RenterSituation,
  currentRoute: 'student' | 'non_student' | null,
  nextRoute: 'student' | 'non_student' | null,
  clearingRouteData: boolean,
): string {
  const nextLabel = situationLabel(nextSituation)
  if (currentSituation == null) {
    return `Choose "${nextLabel}" as your situation?`
  }
  if (clearingRouteData) {
    return `Switch to "${nextLabel}"? This will clear details you entered for ${situationLabel(currentSituation)}.`
  }
  if (!crossRouteBoundary(currentRoute, nextRoute)) {
    return `Switch your situation to "${nextLabel}"?`
  }
  if (nextRoute === 'student') {
    return `Switch to "${nextLabel}"? You'll verify as a student. Work-email details will be cleared.`
  }
  return `Switch to "${nextLabel}"? University email details will be cleared.`
}

export function useRenterSituationSave(opts: {
  userId: string | undefined
  profile: StudentProfileRow | null
  onAfterSave: () => Promise<void>
  onConfirmSwitch?: (args: {
    fromSituation: RenterSituation
    toSituation: RenterSituation
    routeSectionTitle: string
  }) => Promise<boolean>
}) {
  const { userId, profile, onAfterSave, onConfirmSwitch } = opts
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveSituation = useCallback(
    async (situation: RenterSituation, options?: { skipConfirm?: boolean }) => {
      if (!userId || busy || !profile) return false

      const currentSituation = profile.renter_situation ?? null
      if (currentSituation === situation) return true

      const currentRoute = effectiveAccommodationRoute(profile)
      const nextRoute = deriveAccommodationRouteFromSituation(situation)
      if (!nextRoute) return false

      const currentGroup = currentSituation != null ? routeSectionGroup(currentSituation) : null
      const nextGroup = routeSectionGroup(situation)
      const routeSectionChanges = currentGroup != null && currentGroup !== nextGroup
      const clearingRouteData =
        routeSectionChanges &&
        currentSituation != null &&
        routeSectionHasData(currentSituation, profile)

      if (!options?.skipConfirm && clearingRouteData && currentSituation != null) {
        const ok = onConfirmSwitch
          ? await onConfirmSwitch({
              fromSituation: currentSituation,
              toSituation: situation,
              routeSectionTitle: routeSectionTitle(currentSituation),
            })
          : window.confirm(
              switchConfirmMessage(
                currentSituation,
                situation,
                currentRoute,
                nextRoute,
                true,
              ),
            )
        if (!ok) return false
      }

      setError(null)
      setBusy(true)
      try {
        const patch: Record<string, unknown> = {
          renter_situation: situation,
          accommodation_verification_route: nextRoute,
        }

        if (currentSituation != null && clearingRouteData) {
          Object.assign(patch, routeSectionClearPatch(currentSituation))
        }

        if (currentRoute != null && crossRouteBoundary(currentRoute, nextRoute)) {
          if (nextRoute === 'non_student') {
            patch.uni_email = null
            patch.uni_email_verified = false
            patch.uni_email_verified_at = null
          } else {
            patch.work_email = null
            patch.work_email_verified = false
            patch.work_email_verified_at = null
          }
        }

        const { error: upErr } = await withSentryMonitoring('useRenterSituationSave/save', () =>
          supabase.from('student_profiles').update(patch).eq('user_id', userId),
        )
        if (upErr) throw upErr

        const { error: metaErr } = await supabase.auth.updateUser({
          data: { role: 'renter', accommodation_verification_route: nextRoute },
        })
        if (metaErr) throw metaErr

        clearQuniAccommodationVerificationRoute()
        await onAfterSave()
        return true
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not save your situation.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [busy, onAfterSave, onConfirmSwitch, profile, userId],
  )

  return { saveSituation, busy, error, setError }
}
