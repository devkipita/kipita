import type { Profile } from "@/lib/auth/types";
import { fetchPopularRoutes } from "@/lib/landing.server";
import { landingFonts } from "./fonts";
import { ImagePreload } from "./ImagePreload";
import {
  driverImage,
  mpesaImage,
  phoneImages,
  routeCardImage,
} from "./imageSpecs";
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

export async function KipitaLanding({
  profile,
}: {
  profile: Profile | null;
}) {
  const routes = await fetchPopularRoutes(3);

  return (
    <Root className={landingFonts}>
      <ImagePreload
        images={[
          mpesaImage,
          ...routes.map((r) => routeCardImage(r.image)),
          driverImage,
          phoneImages.left,
          phoneImages.center,
          phoneImages.right,
        ]}
      />
      <LandingNav profile={profile} />
      <main id="main">
        <RideSearchProvider>
          <Hero />
          <TrustStrip />
        </RideSearchProvider>
        <RideSteps />
        <PopularRoutes routes={routes} />
        <DriverCta />
        <DownloadCta />
        <SupportContact />
      </main>
      <LandingFooter />
      <AppBottomNav />
    </Root>
  );
}
