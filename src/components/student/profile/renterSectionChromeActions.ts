/** Props for section forms when mobile hub drill-in owns Cancel · Save in AppActionBar. */
export type RenterSectionChromeActionsProps = {
  /** Hide in-page Save; parent action bar triggers form.requestSubmit(). */
  actionsInChrome?: boolean
  /** Called after a save attempt — false on validation/write failure, true on success. */
  onSaveAttemptEnd?: (ok: boolean) => void
}
