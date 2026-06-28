type BannerProps = {
  message: string | null
}

export function RenterProfileSectionErrorBanner({ message }: BannerProps) {
  if (!message) return null
  return (
    <p className="renter-profile-section-error" style={{ gridColumn: '1 / -1' }} role="alert">
      {message}
    </p>
  )
}

type FieldErrorProps = {
  id: string
  message?: string
}

export function RenterProfileFieldErrorMsg({ id, message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p id={id} className="renter-profile-field-error" role="alert">
      {message}
    </p>
  )
}

export function RenterProfileSaveHint({ message }: BannerProps) {
  if (!message) return null
  return <p className="renter-profile-save-hint">{message}</p>
}

export function RenterProfileWriteError({ message }: BannerProps) {
  if (!message) return null
  return (
    <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
      {message}
    </p>
  )
}
