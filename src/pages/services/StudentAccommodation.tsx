import ServicePageLayout from '../../components/ServicePageLayout'

export default function StudentAccommodation() {
  return (
    <ServicePageLayout
      title="Student Accommodation"
      subtitle={"Verified listings near Sydney's top universities"}
      relatedMode="rent"
    >
      <p>
        Finding the right place to live is one of the most important parts of student life. At Quni Living, we&apos;ve
        made it simple — browse studios, shared rooms, apartments and houses all within reach of your campus.
      </p>
      <p>
        Every listing on our platform is reviewed before going live, so you can search with confidence. Filter by
        university, price range, room type and more to find your perfect match.
      </p>
    </ServicePageLayout>
  )
}
