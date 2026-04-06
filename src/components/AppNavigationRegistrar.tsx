import { useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerAppNavigate } from '../lib/appNavigate'

/** Bridges native deep links (outside React) to React Router. */
export default function AppNavigationRegistrar() {
  const navigate = useNavigate()
  useLayoutEffect(() => {
    registerAppNavigate(navigate)
  }, [navigate])
  return null
}
