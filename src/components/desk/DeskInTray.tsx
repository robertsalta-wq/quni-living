import type { ReactNode } from 'react'

type DeskInTrayProps = {
  children: ReactNode
  className?: string
}

/** Slot 3 - wrapper for one piece of real proof. */
export default function DeskInTray({ children, className = '' }: DeskInTrayProps) {
  return <div className={className || undefined}>{children}</div>
}
