import { HeroSection } from '../features/homepage/ui/HeroSection'
import { TrustMetrics } from '../features/homepage/ui/TrustMetrics'
import { PillarSpotlight } from '../features/homepage/ui/PillarSpotlight'
import { HowItWorksStepper } from '../features/homepage/ui/HowItWorksStepper'
import { FeaturedListings } from '../features/homepage/ui/FeaturedListings'
import { TrustSecuritySection } from '../features/homepage/ui/TrustSecuritySection'
import { EscrowCalculator } from '../features/homepage/ui/EscrowCalculator'
import { SellerCtaBanner } from '../features/homepage/ui/SellerCtaBanner'
import { TestimonialsSection } from '../features/homepage/ui/TestimonialsSection'

export function Home() {
  return (
    <div className="space-y-6 sm:space-y-10 pb-8 sm:pb-12">
      {/* Edge-to-Edge Hero Section */}
      <HeroSection />

      {/* Rest of Homepage Content Centered in Container */}
      <div className="mx-auto max-w-6xl px-3 sm:px-6 space-y-8 sm:space-y-12">
        <TrustMetrics />
        <PillarSpotlight />
        <HowItWorksStepper />
        <FeaturedListings />
        <TrustSecuritySection />
        <EscrowCalculator />
        <SellerCtaBanner />
        <TestimonialsSection />
      </div>
    </div>
  )
}
