import { landingFonts } from "./fonts";
import { Root } from "./primitives";
import { RideSearchProvider } from "./search/RideSearchContext";
import { LandingNav } from "./sections/LandingNav";
import { Hero } from "./sections/Hero";
import { TrustStrip } from "./sections/TrustStrip";
import { RideSteps } from "./sections/RideSteps";
import { PopularRoutes } from "./sections/PopularRoutes";
import { DriverCta } from "./sections/DriverCta";
import { DownloadCta } from "./sections/DownloadCta";
import { SupportContact } from "./sections/SupportContact";
import { LandingFooter } from "./sections/LandingFooter";
import { AppBottomNav } from "@/components/nav/AppBottomNav";

export function KipitaLanding() {
  return (
    <Root className={landingFonts}>
      <LandingNav />
      <RideSearchProvider>
        <Hero />
        <TrustStrip />
      </RideSearchProvider>
      <RideSteps />
      <PopularRoutes />
      <DriverCta />
      <DownloadCta />
      <SupportContact />
      <LandingFooter />
      <AppBottomNav />
    </Root>
  );
}
