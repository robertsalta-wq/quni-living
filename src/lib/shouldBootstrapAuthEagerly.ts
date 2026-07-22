/**
 * When true, load the live AuthProvider (and supabase) immediately.
 * Marketing homepage / public pages defer until idle so unused JS stays off the critical path.
 */
export function shouldBootstrapAuthEagerly(pathname: string = window.location.pathname): boolean {
  const path = pathname.split('?')[0]?.split('#')[0] ?? '/'
  if (
    path.startsWith('/auth/') ||
    path === '/login' ||
    path === '/signup' ||
    path === '/student-signup' ||
    path === '/landlord-signup' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path.startsWith('/student-') ||
    path.startsWith('/student/') ||
    path.startsWith('/landlord') ||
    path.startsWith('/admin') ||
    path.startsWith('/messages') ||
    path.startsWith('/booking') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/invite/') ||
    path.startsWith('/sample-agreements')
  ) {
    return true
  }

  // Returning session: supabase-js persists under sb-*-auth-token (and legacy variants).
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key === 'quni-auth-snapshot:v2') return true
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.includes('-auth-token') || key.startsWith('sb-')) return true
    }
  } catch {
    // private mode
  }

  return false
}
