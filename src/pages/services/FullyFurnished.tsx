import ServicePageLayout from '../../components/ServicePageLayout'
import Seo from '../../components/Seo'

export default function FullyFurnished() {
  return (
    <>
      <Seo
        title="Fully furnished student accommodation"
        description="Move-in ready furnished student rentals — furniture, linen, and essentials. Browse on Quni Living, Australia."
        canonicalPath="/services/fully-furnished"
      />
    <ServicePageLayout
      title="Fully Furnished Units"
      subtitle="Move in ready — everything included"
      relatedMode="furnished"
    >
      <p>
        Our fully furnished listings include everything a student needs from day one — furniture, linen, kitchen
        essentials and in many cases bills and WiFi. Perfect for international students or anyone who wants a
        hassle-free move-in experience.
      </p>
      <p>Filter by &quot;Furnished&quot; on our listings page to find properties ready to go.</p>
    </ServicePageLayout>
    </>
  )
}
