import { Navigate } from 'react-router-dom'

/** Prefer unified /signup — deep-link role for email flow */
export default function LandlordSignup() {
  return <Navigate to="/signup?role=landlord" replace />
}
