/** Red asterisk for a question that must be answered before publish or accept. */
export function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {' '}
      *
    </span>
  )
}
