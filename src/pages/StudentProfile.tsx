import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isRenterRole } from '../lib/authProfile'
import { getValidAccessTokenForFunctions } from '../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../lib/readSupabaseFunctionInvokeError'
import { removeAllStudentVerificationDocuments } from '../lib/studentDocumentsStorage'
import type { Database } from '../lib/database.types'
import { RenterProfileSetup } from '../components/student/profile/RenterProfileSetup'
import { StudentDeleteAccountModal } from '../components/student/StudentDeleteAccountModal'
import { RenterDashboardTabShell } from '../components/student/RenterDashboardPageHeader'
import { dashboardDestructiveBtnClass, renterEditBtnClass } from '../lib/renterProfileFormClasses'
import { useIsMobile } from '../hooks/useIsMobile'
import { DashboardFatalError } from '../components/dashboard/DashboardFeedback'
import { studentDashboardTabPath } from '../lib/userDashboardNav'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

export default function StudentProfile() {
  const { user, profile: authProfile, role, signOut } = useAuthContext()
  const isMobile = useIsMobile()
  const authStudent =
    isRenterRole(role) && authProfile && 'id' in authProfile ? (authProfile as StudentRow) : null
  const [searchParams] = useSearchParams()
  const redirectToBookings = searchParams.get('tab') === 'bookings'

  const [profile, setProfile] = useState<StudentRow | null>(authStudent)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !authStudent)

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false)
  const [dangerZoneVisible, setDangerZoneVisible] = useState(false)
  const dangerZoneRef = useRef<HTMLElement>(null)

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!user?.id) return
    const background = opts?.background === true
    setLoadError(null)
    if (!background) setLoading(true)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) throw pErr
      const prof = profRaw as StudentRow | null
      if (!prof) {
        setProfile(null)
        setLoadError('No student profile found.')
        return
      }

      setProfile(prof)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      if (background) {
        console.error('Background profile refresh failed', e)
      } else {
        setLoadError(msg)
        setProfile(null)
      }
    } finally {
      if (!background) setLoading(false)
    }
  }, [user?.id])

  const refreshProfileData = useCallback(() => load({ background: true }), [load])

  useEffect(() => {
    if (authStudent) setProfile(authStudent)
  }, [authStudent])

  useEffect(() => {
    if (redirectToBookings) return
    void load({ background: Boolean(authStudent) })
  }, [load, authStudent, redirectToBookings])

  async function handleDeleteAccount() {
    if (!user?.id) return
    setDeleteAccountError(null)
    setDeleteAccountBusy(true)
    try {
      try {
        await removeAllStudentVerificationDocuments(supabase, user.id)
      } catch (e) {
        console.error('Student verification documents cleanup failed before account delete', e)
      }
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setDeleteAccountError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'delete-student-account',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setDeleteAccountError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setDeleteAccountError(String(data.error))
        return
      }
      await signOut()
    } finally {
      setDeleteAccountBusy(false)
    }
  }

  if (redirectToBookings) {
    return <Navigate to={studentDashboardTabPath('bookings')} replace />
  }

  if (loading) {
    return (
      <RenterDashboardTabShell activeTab="profile">
        <div className="flex min-h-[40vh] flex-1 items-center justify-center">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--quni-coral)', borderTopColor: 'transparent' }}
          />
        </div>
      </RenterDashboardTabShell>
    )
  }

  if (loadError || !profile) {
    return (
      <RenterDashboardTabShell activeTab="profile">
        <DashboardFatalError
          message={loadError ?? 'Profile unavailable.'}
          actionHref="/student-dashboard"
          actionLabel="Go to dashboard"
        />
      </RenterDashboardTabShell>
    )
  }

  return (
    <RenterDashboardTabShell activeTab="profile">
      {user?.id ? (
        <RenterProfileSetup
          profile={profile}
          userId={user.id}
          displayEmail={user.email ?? profile.email ?? ''}
          onRefresh={refreshProfileData}
          onProfilePatch={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
          variant={isMobile ? 'hub' : 'accordion'}
          onSignOut={() => void signOut()}
          onDeleteAccount={() => {
            setDeleteAccountError(null)
            setDeleteAccountOpen(true)
          }}
        >
          {!isMobile ? (
            <>
              <button
                type="button"
                id="toggle-student-danger-zone"
                aria-expanded={dangerZoneVisible}
                aria-controls="student-profile-danger-zone"
                onClick={() => {
                  setDangerZoneVisible((prev) => {
                    const next = !prev
                    if (next) {
                      window.setTimeout(() => {
                        dangerZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }, 0)
                    }
                    return next
                  })
                }}
                className={`${renterEditBtnClass} w-full justify-center`}
              >
                {dangerZoneVisible ? 'Hide account deletion' : 'Delete my account'}
              </button>

              {dangerZoneVisible ? (
                <section
                  ref={dangerZoneRef}
                  id="student-profile-danger-zone"
                  className="quni-card overflow-hidden font-sans"
                  style={{ padding: '20px' }}
                  aria-labelledby="danger-zone-heading"
                >
                  <h2
                    id="danger-zone-heading"
                    className="text-[var(--text-body-size)] font-semibold tracking-[-0.01em] text-[var(--quni-ink)]"
                  >
                    Danger zone
                  </h2>
                  <p style={{ marginTop: 8, fontSize: 'var(--text-body-sm-size)', color: 'var(--quni-ink-3)' }}>
                    Permanently delete your student account and all verification documents stored for your profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAccountError(null)
                      setDeleteAccountOpen(true)
                    }}
                    className={`${dashboardDestructiveBtnClass} mt-4 w-auto`}
                  >
                    Delete account
                  </button>
                </section>
              ) : null}
            </>
          ) : null}
        </RenterProfileSetup>
      ) : null}

      <StudentDeleteAccountModal
        open={deleteAccountOpen}
        onClose={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
        onDelete={handleDeleteAccount}
        deleting={deleteAccountBusy}
        error={deleteAccountError}
      />
    </RenterDashboardTabShell>
  )
}
