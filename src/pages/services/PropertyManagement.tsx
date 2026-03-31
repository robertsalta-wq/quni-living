import ServicePageLayout from '../../components/ServicePageLayout'
import Seo from '../../components/Seo'

export default function PropertyManagement() {
  return (
    <>
      <Seo
        title="Property management for landlords"
        description="List and manage student accommodation with Quni Living — enquiries, bookings, and your landlord dashboard in one place."
        canonicalPath="/services/property-management"
      />
    <ServicePageLayout
      title="Property Management"
      subtitle="List, manage and grow your rental portfolio with Quni Living"
      relatedMode="rent"
      extraCta={{ label: 'List your property', to: '/signup' }}
    >
      <p>
        Quni Living gives landlords everything they need to manage student properties online. Create listings, receive
        enquiries, confirm bookings and track your portfolio — all from your landlord dashboard.
      </p>
      <p>
        Our platform is built for the student rental market, connecting you directly with verified students looking for
        quality accommodation near their university.
      </p>
    </ServicePageLayout>
    </>
  )
}
