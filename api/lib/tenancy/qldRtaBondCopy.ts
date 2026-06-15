/** RTA Queensland - boarders and lodgers guidance (prefer over bare section numbers in UI). */
export const QLD_RTA_BOARDERS_LODGERS_URL = 'https://www.rta.qld.gov.au/renting/boarders-and-lodgers'

export const QLD_RTA_RENTAL_BOND_URL = 'https://www.rta.qld.gov.au/starting-a-tenancy/rental-bond'

export const QLD_RTA_WEB_SERVICES_URL = 'https://www.rta.qld.gov.au/rta-web-services/online-bond-lodgement'

export const QLD_RTA_HOME_URL = 'https://www.rta.qld.gov.au/'

/** Shared lodgement steps after bond is received or paid (QLD scheme properties). */
export const QLD_RTA_LODGEMENT_STEPS = [
  'Record bond receipt on Quni (this is not RTA lodgement).',
  'Lodge with RTA Web Services (Queensland Digital Identity required) or paper Form 2 — see rta.qld.gov.au.',
  'Once payment clears, RTA issues an Acknowledgement of Rental Bond (bond number) to both parties — keep this confirmation.',
] as const

export function qldRtaLodgementStepsHtml(): string {
  const items = QLD_RTA_LODGEMENT_STEPS.map(
    (s) => `<li style="margin-bottom:6px;">${escapeHtml(s)}</li>`,
  ).join('')
  return `<p style="font-size:14px;margin:12px 0 6px;"><strong>QLD — after bond is received or paid:</strong></p>
<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.5;">${items}</ol>
<p style="font-size:13px;color:#555;margin-top:8px;">Not lodging bond within 10 days, or keeping it in a personal account, is an offence under Queensland law. A bond is not compulsory — rent in advance is a lawful alternative.</p>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
