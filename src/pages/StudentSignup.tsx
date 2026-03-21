import { Navigate } from 'react-router-dom'

/** Prefer unified /signup — deep-link role for email flow */
export default function StudentSignup() {
  return <Navigate to="/signup?role=student" replace />
}
