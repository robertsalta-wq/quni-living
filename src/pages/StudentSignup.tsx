import { Navigate } from 'react-router-dom'

/** Legacy URL — same Google-first signup as /signup (role chosen after sign-in on onboarding). */
export default function StudentSignup() {
  return <Navigate to="/signup" replace />
}
