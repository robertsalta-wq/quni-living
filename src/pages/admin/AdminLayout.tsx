import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { AdminShell } from '../../components/admin/Shell'

/**
 * Top-level layout for every `/admin/*` route.
 *
 * Guards the admin role check and renders the redesigned `AdminShell`
 * (sidebar + top bar + content slot). The legacy shell + `?redesign=1`
 * feature flag were retired in PR 7 - the Living Console layout is now the
 * single source of truth.
 */
export default function AdminLayout() {
  const { user, role } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    if (role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [user, role, navigate])

  if (user && role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-surface-2">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-admin-coral border-t-transparent" />
      </div>
    )
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
