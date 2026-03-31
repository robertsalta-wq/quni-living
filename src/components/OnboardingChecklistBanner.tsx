import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  buildLandlordOnboardingSteps,
  buildStudentOnboardingSteps,
  isLandlordChecklistFullyComplete,
  isProfileDashboardOnboardingComplete,
  isStudentChecklistFullyComplete,
  landlordChecklistFraction,
  readOnboardingCompleteLocal,
  readOnboardingDismissedUserId,
  studentChecklistFraction,
  writeOnboardingCompleteLocal,
  writeOnboardingDismissed,
  type ChecklistStep,
  type LandlordProfileRow,
  type StudentProfileRow,
} from '../lib/onboardingChecklist'

type Role = 'student' | 'landlord'

type Props = {
  role: Role
  userId: string
  studentProfile: StudentProfileRow | null
  landlordProfile: LandlordProfileRow | null
  onRefresh: () => void | Promise<void>
}

function StepRow({ step }: { step: ChecklistStep }) {
  const label = step.optional ? `${step.label} (optional)` : step.label
  return (
    <div className="flex flex-wrap items-center gap-3 py-2.5 border-b border-stone-200/60 last:border-0">
      <span className="shrink-0 w-6 h-6 flex items-center justify-center" aria-hidden>
        {step.complete ? (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-4 h-4 rounded-full border-2 border-stone-400" />
        )}
      </span>
      <span
        className={`flex-1 min-w-[12rem] text-sm ${step.complete ? 'text-stone-600' : 'text-stone-900 font-medium'}`}
      >
        {label}
      </span>
      {!step.complete && step.href && step.actionLabel && (
        <Link
          to={step.href}
          className="shrink-0 text-sm font-semibold text-[#FF6F61] hover:text-[#e85d52] underline-offset-2 hover:underline"
        >
          {step.actionLabel}
        </Link>
      )}
    </div>
  )
}

export default function OnboardingChecklistBanner({
  role,
  userId,
  studentProfile,
  landlordProfile,
  onRefresh,
}: Props) {
  const steps: ChecklistStep[] =
    role === 'student'
      ? buildStudentOnboardingSteps(studentProfile)
      : buildLandlordOnboardingSteps(landlordProfile)

  const isFullyComplete =
    role === 'student' ? isStudentChecklistFullyComplete(steps) : isLandlordChecklistFullyComplete(steps)

  const dbOnboardingDone = isProfileDashboardOnboardingComplete(role, studentProfile, landlordProfile)

  const { done, total, pct } =
    role === 'student' ? studentChecklistFraction(steps) : landlordChecklistFraction(steps)

  const [celebrating, setCelebrating] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [userDismissed, setUserDismissed] = useState(() => readOnboardingDismissedUserId() === userId)

  const persistStartedRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (dbOnboardingDone && userId) writeOnboardingCompleteLocal(userId)
  }, [dbOnboardingDone, userId])

  useEffect(() => {
    setUserDismissed(readOnboardingDismissedUserId() === userId)
  }, [userId])

  useLayoutEffect(() => {
    if (!isSupabaseConfigured || !userId) return
    if (!isFullyComplete || dbOnboardingDone) return

    const table = role === 'student' ? 'student_profiles' : 'landlord_profiles'

    if (readOnboardingCompleteLocal(userId)) {
      if (!persistStartedRef.current) {
        persistStartedRef.current = true
        void supabase
          .from(table)
          .update({ onboarding_complete: true })
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) console.error('onboarding_complete update:', error)
            void Promise.resolve(onRefreshRef.current())
          })
      }
      return
    }

    if (persistStartedRef.current) return
    persistStartedRef.current = true
    writeOnboardingCompleteLocal(userId)
    setCelebrating(true)
    void supabase
      .from(table)
      .update({ onboarding_complete: true })
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) console.error('onboarding_complete update:', error)
        void Promise.resolve(onRefreshRef.current())
      })
  }, [dbOnboardingDone, isFullyComplete, userId, role])

  useEffect(() => {
    if (!celebrating) return
    setFadeOut(false)
    const fadeT = window.setTimeout(() => setFadeOut(true), 4500)
    const endT = window.setTimeout(() => {
      setCelebrating(false)
      setFadeOut(false)
    }, 5000)
    return () => {
      window.clearTimeout(fadeT)
      window.clearTimeout(endT)
    }
  }, [celebrating])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return
    const table = role === 'student' ? 'student_profiles' : 'landlord_profiles'
    const channel = supabase
      .channel(`onboarding-checklist-${table}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => {
          void Promise.resolve(onRefreshRef.current())
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, role])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void Promise.resolve(onRefreshRef.current())
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  const localOnboardingDone = readOnboardingCompleteLocal(userId)
  const showSuccessBanner = isFullyComplete && (!localOnboardingDone || celebrating)

  if (showSuccessBanner) {
    return (
      <div
        className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium text-emerald-900 transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundColor: '#F0FDF4',
          borderLeftWidth: 4,
          borderLeftColor: '#22C55E',
        }}
        role="status"
      >
        Your account is fully set up. You&apos;re ready to go! ✓
      </div>
    )
  }

  if (isFullyComplete && localOnboardingDone && !celebrating) return null

  if (userDismissed) return null

  function dismiss() {
    writeOnboardingDismissed(userId)
    setUserDismissed(true)
  }

  return (
    <div
      className="mb-6 rounded-xl border border-stone-200/80 shadow-sm overflow-hidden"
      style={{ backgroundColor: '#FEF9E4', borderLeftWidth: 4, borderLeftColor: '#FF6F61' }}
    >
      <div className="px-4 sm:px-5 pt-4 pb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">Complete your account setup</h2>
          <p className="text-sm text-stone-600 mt-0.5">
            {done} of {total} steps complete
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-900/5 transition-colors"
          aria-label="Dismiss checklist for this session"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-4 sm:px-5 pb-1">
        <div className="h-2 rounded-full bg-stone-200/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: '#FF6F61' }}
          />
        </div>
      </div>
      <div className="px-4 sm:px-5 pb-4 pt-1">{steps.map((s) => <StepRow key={s.id} step={s} />)}</div>
    </div>
  )
}
