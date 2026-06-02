export type StripeConnectRequirementItem = {
  kind: 'error' | 'due' | 'pending'
  label: string
  detail: string | null
}

export type StripeConnectRequirementsSummary = {
  items: StripeConnectRequirementItem[]
  hasErrors: boolean
  pendingCount: number
  readyToEnable: boolean
}
