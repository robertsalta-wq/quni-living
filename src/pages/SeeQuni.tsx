import Seo from '../components/Seo'
import LandlordDemoTour from '../components/demo/LandlordDemoTour'

export default function SeeQuni() {
  return (
    <>
      <Seo
        title="See how Quni works (example)"
        description="A 60-second example of letting a room on Quni. No sign-up."
        canonicalPath="/see-quni"
        noindex
      />
      <LandlordDemoTour />
    </>
  )
}
