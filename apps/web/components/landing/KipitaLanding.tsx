import type { Profile } from "@/lib/auth/types";
import { landingFonts } from "./fonts";
import { Root } from "./primitives";
import { LandingNav } from "./sections/LandingNav";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { RideRequests } from "./sections/RideRequests";
import { RoadAlerts } from "./sections/RoadAlerts";
import { StatsBand } from "./sections/StatsBand";
import { DownloadCta } from "./sections/DownloadCta";
import { SupportContact } from "./sections/SupportContact";
import { LandingFooter } from "./sections/LandingFooter";

/* ══════════════════════════════════════════════════════════════
   Kipita Landing — "nocturne" dark theme. Each section lives in its
   own file under ./sections; shared styled primitives are in
   ./primitives, curated copy in ./data, and the live ride-search
   (the "How it works" centrepiece) in ./search.
   ══════════════════════════════════════════════════════════════ */
export function KipitaLanding({ profile }: { profile: Profile | null }) {
  return (
    <Root className={landingFonts}>
      <LandingNav profile={profile} />
      <Hero />
      <HowItWorks />
      <RideRequests />
      <RoadAlerts />
      <StatsBand />
      <DownloadCta />
      <SupportContact />
      <LandingFooter />
    </Root>
  );
}
