import { Navigate } from 'react-router-dom'

/** Legacy URL — same Google-first signup as /signup (role chosen after sign-in on onboarding). */
export default function LandlordSignup() {
  return <Navigate to="/signup" replace />
}
