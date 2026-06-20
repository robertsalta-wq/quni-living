import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type VerificationChecklistFocus = 'students' | 'working-tenants' | 'landlords' | 'overview'

export const VERIFICATION_CHECKLIST_MODAL_TITLES: Record<VerificationChecklistFocus, string> = {
  students: 'What students verify',
  'working-tenants': 'What working tenants verify',
  landlords: 'What landlords set up',
  overview: "What you'll verify on Quni",
}

export const VERIFICATION_CHECKLIST_MODAL_SUBTITLE =
  'You can browse before you finish verification. Renting is free for renters; landlords pay $99 only when they accept a booking on Quni Listing.'

const TABLE_WRAP = 'overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm'
const TH =
  'border border-gray-100 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 sm:text-sm'
const TD = 'border border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700 align-top'

type VerificationStep = { step: string; what: ReactNode }

export function VerificationTable({ rows }: { rows: VerificationStep[] }) {
  return (
    <div className={TABLE_WRAP}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={TH} scope="col">
              Step
            </th>
            <th className={TH} scope="col">
              What it is
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.step}>
              <td className={`${TD} font-medium text-gray-900 whitespace-nowrap`}>{row.step}</td>
              <td className={TD}>{row.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STUDENT_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  { step: 'Verify your university email', what: 'We send a one-time code to your university address.' },
  { step: 'Photo ID', what: "A current passport or Australian driver's licence." },
  { step: 'Proof of enrolment', what: 'A recent enrolment confirmation letter or Confirmation of Enrolment (CoE).' },
]

const WORKING_TENANT_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  {
    step: 'Complete your profile',
    what: 'Your name, phone, budget, and move-in date. Required before you can send a booking request.',
  },
  { step: 'Photo ID', what: "A current passport or Australian driver's licence." },
  {
    step: 'Supporting document',
    what: 'A recent payslip, employment letter, or bank statement.',
  },
]

const LANDLORD_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  {
    step: 'Complete your profile',
    what: 'Your name, whether you\u2019re an individual, company or trust, your ABN, and contact details.',
  },
  {
    step: 'Agree to the terms',
    what: (
      <>
        <Link to="/terms" className="font-medium text-[#FF6F61] hover:underline">
          Terms of Use
        </Link>
        ,{' '}
        <Link to="/privacy" className="font-medium text-[#FF6F61] hover:underline">
          Privacy Policy
        </Link>
        , and the{' '}
        <Link to="/landlord-service-agreement" className="font-medium text-[#FF6F61] hover:underline">
          Landlord Service Agreement
        </Link>
        .
      </>
    ),
  },
  {
    step: 'Add a payment card',
    what: 'For the $99-per-accepted-booking fee. You are not charged until you accept a tenant.',
  },
  {
    step: 'Landlord insurance',
    what: 'Review cover options for loss of rent, tenant damage, and liability. Recommended before listing; not required.',
  },
  {
    step: 'Verify your identity',
    what: 'Confirmed securely through payment setup before your first acceptance.',
  },
]

export function VerificationStudentSection() {
  return (
    <div className="space-y-4">
      <VerificationTable rows={STUDENT_STEPS} />
      <p className="text-sm leading-relaxed text-gray-700">
        Required to request to book on student-only listings. You&apos;ll also complete a short profile with your
        university, course, phone, budget, and move-in date before your first request.
      </p>
    </div>
  )
}

export function VerificationWorkingTenantSection() {
  return (
    <div className="space-y-4">
      <VerificationTable rows={WORKING_TENANT_STEPS} />
      <p className="text-sm leading-relaxed text-gray-700">
        Complete your profile to request to book on listings open to non-students. Photo ID and a supporting document
        complete identity verification for landlords reviewing your application.
      </p>
      <p className="text-sm leading-relaxed text-gray-600">
        Work email verification is optional. It adds a badge to your profile but is not required to request to book.
      </p>
    </div>
  )
}

export function VerificationLandlordSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-900">List for free. Get verified renters. Accept in a tap.</p>
      <p className="text-sm leading-relaxed text-gray-700">Here is what you set up once on Quni Listing.</p>
      <VerificationTable rows={LANDLORD_STEPS} />
      <p className="text-sm leading-relaxed text-gray-700">
        Once that&apos;s done you can publish listings, receive booking requests from verified renters, and accept with
        the tenancy agreement and e-signing handled inside Quni.
      </p>
    </div>
  )
}

export function VerificationOverviewSection() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-gray-700">
      <p>
        Quni verifies both sides of every booking so renters and landlords always know they&apos;re dealing with a real,
        accountable person.
      </p>
      <div>
        <h3 className="font-display text-base font-bold text-gray-900">Students</h3>
        <p className="mt-2">
          University email, photo ID, and proof of enrolment. Required for student-only listings.
        </p>
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-gray-900">Working tenants</h3>
        <p className="mt-2">
          Profile, photo ID, and a supporting document (payslip, employment letter, or bank statement). Work email is
          optional.
        </p>
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-gray-900">Landlords</h3>
        <p className="mt-2">
          Profile, terms, insurance confirmation, a saved card for the $99 acceptance fee, and identity verification
          before your first acceptance.
        </p>
      </div>
    </div>
  )
}

export function VerificationChecklistModalBody({ focus }: { focus: VerificationChecklistFocus }) {
  if (focus === 'students') return <VerificationStudentSection />
  if (focus === 'working-tenants') return <VerificationWorkingTenantSection />
  if (focus === 'landlords') return <VerificationLandlordSection />
  return <VerificationOverviewSection />
}
