import ServicePageLayout from '../../components/ServicePageLayout'

export default function LandlordPartnerships() {
  return (
    <ServicePageLayout
      title="Landlord Partnerships"
      subtitle="Reach thousands of students looking for quality accommodation"
      relatedMode="newest"
      extraCta={{ label: 'Become a partner', to: '/signup' }}
    >
      <p>
        Partner with Quni Living and get your properties in front of thousands of students across Sydney. Our platform
        is purpose-built for the student accommodation market, giving your listings maximum visibility during peak
        enrolment periods.
      </p>
      <p>
        We work with individual landlords and property managers to make listing and managing properties as
        straightforward as possible.
      </p>
    </ServicePageLayout>
  )
}
