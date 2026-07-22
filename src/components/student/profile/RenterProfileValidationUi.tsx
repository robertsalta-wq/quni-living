import {
  renterFieldErrorClass,
  renterSaveHintClass,
  renterSectionErrorClass,
  renterWriteErrorClass,
} from '../../../lib/renterProfileFormClasses'

type BannerProps = {
  message: string | null
}

export function RenterProfileSectionErrorBanner({ message }: BannerProps) {
  if (!message) return null
  return (
    <p className={renterSectionErrorClass} role="alert">
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
    <p id={id} className={renterFieldErrorClass} role="alert">
      {message}
    </p>
  )
}

export function RenterProfileSaveHint({ message }: BannerProps) {
  if (!message) return null
  return <p className={renterSaveHintClass}>{message}</p>
}

export function RenterProfileWriteError({ message }: BannerProps) {
  if (!message) return null
  return (
    <p className={renterWriteErrorClass} role="alert">
      {message}
    </p>
  )
}
