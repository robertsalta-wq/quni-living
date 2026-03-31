import { useLocation } from 'react-router-dom'
import Seo from './Seo'
import { isSeoPrivatePath } from '../lib/site'

/**
 * Applies noindex to dashboard, booking, onboarding, and admin routes so crawl budget
 * stays on public marketing and listing pages.
 */
export default function SeoPrivateRoutes() {
  const { pathname } = useLocation()
  if (!isSeoPrivatePath(pathname)) return null
  return (
    <Seo
      title={pathname.startsWith('/admin') ? 'Admin' : 'Account'}
      noindex
      description="Sign in to access your Quni Living account, bookings, or dashboard."
    />
  )
}
