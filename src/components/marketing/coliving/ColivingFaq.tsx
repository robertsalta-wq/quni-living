import { useId, useState, type ReactNode } from 'react'
import LandlordPartnershipLeadForm from '../../LandlordPartnershipLeadForm'

type FaqItem = {
  id: string
  question: string
  answer: ReactNode
}

const ITEMS: FaqItem[] = [
  {
    id: 'multi',
    question: 'Can I run multiple properties on one account?',
    answer: (
      <p>
        Yes. One dashboard across every property and every room - listings, applicants, agreements,
        and bonds in one place.
      </p>
    ),
  },
  {
    id: 'bond',
    question: 'Who holds the bond?',
    answer: (
      <p>
        The bond authority or you - whichever the arrangement and state require. Never Quni. Each
        bond is receipted on the correct path.
      </p>
    ),
  },
  {
    id: 'five-plus',
    question: 'What if a property has 5 or more residents?',
    answer: (
      <div className="space-y-4">
        <p>
          Properties with 5+ residents are not currently supported. Register interest below and we
          will follow up when that portfolio shape is available.
        </p>
        <div className="rounded-2xl bg-[#FF6F61] px-4 py-6 sm:px-6 sm:py-8">
          <p className="mb-4 text-center font-display text-xl font-bold text-white sm:text-2xl">
            Register interest
          </p>
          <LandlordPartnershipLeadForm />
        </div>
      </div>
    ),
  },
  {
    id: 'cost',
    question: 'What does it cost if a room doesn\'t fill?',
    answer: <p>Nothing. Free to list. You pay on acceptance - $99 Listing or 7% Managed.</p>,
  },
]

function FaqRow({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  const panelId = useId()
  return (
    <div className="border-b border-gray-100">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          <span className="font-display text-lg font-bold text-gray-900 sm:text-xl">{item.question}</span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]/10 text-[#FF6F61] transition-transform ${
              open ? 'rotate-45' : ''
            }`}
            aria-hidden
          >
            +
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        hidden={!open}
        className={`pb-5 text-sm leading-relaxed text-gray-600 sm:text-base ${open ? 'block' : 'hidden'}`}
      >
        {item.answer}
      </div>
    </div>
  )
}

export default function ColivingFaq() {
  const [openId, setOpenId] = useState<string | null>('multi')

  return (
    <section className="bg-[#FDF8F5]" aria-labelledby="coliving-faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6F61] sm:text-xs">
          FAQ
        </p>
        <h2
          id="coliving-faq-heading"
          className="mt-3 text-center font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
        >
          Straight answers
        </h2>
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm sm:px-6">
          {ITEMS.map((item) => (
            <FaqRow
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
