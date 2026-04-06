import { useEffect } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { isAdminUser } from '../../lib/adminEmails'

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/bookings', label: 'Bookings', end: false },
  { to: '/admin/enquiries', label: 'Enquiries', end: false },
  { to: '/admin/landlord-leads', label: 'Landlord leads', end: false },
  { to: '/admin/properties', label: 'Properties', end: false },
  { to: '/admin/students', label: 'Students', end: false },
  { to: '/admin/landlords', label: 'Landlords', end: false },
  { to: '/admin/apps', label: 'Apps', end: false },
  { to: '/admin/payments', label: 'Payments', end: false },
  { to: '/admin/knowledge-base', label: 'Knowledge base', end: false },
] as const

function navClassName(isActive: boolean) {
  return [
    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ].join(' ')
}

export default function AdminLayout() {
  const { user, signOut } = useAuthContext()
  const navigate = useNavigate()

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Admin'

  useEffect(() => {
    if (!user) return
    if (!isAdminUser(user)) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  if (user && !isAdminUser(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-[#E8E0CC] bg-[#FEF9E4] shadow-sm">
        <div className="border-b border-[#E8E0CC] bg-[#FEF9E4] px-5 py-5">
          <Link to="/admin" className="block">
            <img src="/quni-logo.png" alt="Quni" className="h-9 w-auto max-w-full object-contain" />
            <p className="text-xs font-medium text-gray-500 mt-0.5">Admin</p>
          </Link>
        </div>
        <div className="px-2 pb-1">
          <Link
            to="/"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
          >
            View homepage
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navClassName(isActive)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[#E8E0CC] p-4 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col pl-56">
        <div className="flex-1 px-6 py-8 lg:px-10 max-w-[1600px] w-full">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
