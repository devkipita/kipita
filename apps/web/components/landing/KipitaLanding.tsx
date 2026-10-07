import type { Profile } from "@/lib/auth/types";
import { landingFonts } from "./fonts";
import { Root } from "./primitives";
import { RideSearchProvider } from "./search/RideSearchContext";
import { HeroResults } from "./search/HeroResults";
import { LandingNav } from "./sections/LandingNav";
import { Hero } from "./sections/Hero";
import { TrustStrip } from "./sections/TrustStrip";
import { RideSteps } from "./sections/RideSteps";
import { PopularRoutes } from "./sections/PopularRoutes";
import { DriverCta } from "./sections/DriverCta";
import { DownloadCta } from "./sections/DownloadCta";
import { SupportContact } from "./sections/SupportContact";
import { LandingFooter } from "./sections/LandingFooter";
import { MobileNav } from "./sections/MobileNav";

export function KipitaLanding({ profile }: { profile: Profile | null }) {
  return (
    <Root className={landingFonts}>
      <LandingNav profile={profile} />
      <RideSearchProvider>
        <Hero />
        <HeroResults />
        <TrustStrip />
      </RideSearchProvider>
      <RideSteps />
      <PopularRoutes />
      <DriverCta />
      <DownloadCta />
      <SupportContact />
      <LandingFooter />
      <MobileNav />
    </Root>
  );
}
