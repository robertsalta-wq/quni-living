import { Link } from 'react-router-dom'

const STORY_IMAGE =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800'

export default function About() {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-white">
      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-12 sm:py-16 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">About Quni Living</h1>
          <p className="mt-4 text-base sm:text-lg text-white max-w-3xl mx-auto leading-relaxed">
            We&apos;re on a mission to make student accommodation simpler, safer and more affordable across Australia.
          </p>
        </div>
      </section>

      <section className="max-w-site mx-auto px-6 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="space-y-4 text-gray-700 leading-relaxed order-2 lg:order-1">
            <h2 className="font-display text-2xl font-bold text-gray-900">Our Story</h2>
            <p>
              Quni Living was founded with a simple idea — finding student accommodation shouldn&apos;t be stressful. We
              connect students with verified landlords across Sydney, making it easy to find a home near your university.
            </p>
            <p>
              Whether you&apos;re a domestic student moving out for the first time or an international student arriving in
              Australia, Quni Living is here to help you settle in and focus on what matters — your studies.
            </p>
          </div>
          <div className="order-1 lg:order-2 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <img src={STORY_IMAGE} alt="" className="w-full h-full object-cover aspect-[4/3] lg:aspect-auto lg:min-h-[320px]" />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20">
          <h2 className="font-display text-2xl font-bold text-gray-900 text-center mb-10">Why choose Quni</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Verified Listings',
                body: 'Every property is reviewed before going live',
              },
              {
                title: 'Near Your University',
                body: "Listings near Sydney's top universities",
              },
              {
                title: 'Simple Booking',
                body: 'Enquire and book entirely online',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20">
          <h2 className="font-display text-2xl font-bold text-center mb-10">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            {[
              {
                title: 'Student First',
                body: 'Everything we do is designed around the student experience',
              },
              {
                title: 'Transparency',
                body: 'No hidden fees, no surprises',
              },
              {
                title: 'Community',
                body: 'Building connections between students and landlords',
              },
            ].map((v) => (
              <div key={v.title}>
                <h3 className="font-display text-lg font-bold mb-2">{v.title}</h3>
                <p className="text-sm text-white/95 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-site mx-auto px-6 py-14 md:py-16 text-center">
        <h2 className="font-display text-xl font-bold text-gray-900">Our Team</h2>
        <p className="mt-2 text-gray-600">Coming soon</p>
      </section>

      <section className="bg-white border-t border-gray-100">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 max-w-xl mx-auto">
            Ready to find your perfect student home?
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/listings"
              className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-6 py-3 text-sm font-medium hover:opacity-95 transition-opacity"
            >
              Browse listings
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg border-2 border-gray-900 text-gray-900 px-6 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
