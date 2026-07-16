import { useMemo, useState } from 'react'

/** Throwaway probe — must make CI Rules of Hooks step fail. Do not merge. */
export default function DeliberatelyBrokenHooksProbe({ loading }: { loading: boolean }) {
  const [x] = useState(0)
  if (loading) return null
  const y = useMemo(() => x + 1, [x])
  return <div>{y}</div>
}
