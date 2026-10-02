import styled from "styled-components";
import { preload } from "react-dom";
import { themes } from "@/lib/theme";
import { Reveal } from "../../anim/Reveal";
import { TrickleHeading } from "../TrickleHeading";
import { HeroSearch } from "../search/HeroSearch";
import { PulseDot } from "../primitives";

/** The landing is always dark, so it reads the dark theme's M3 roles. */
const c = themes.dark.color;

const POSTER = "/home/nairobi-hero.jpg";

const HeroShell = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: clamp(28px, 5vw, 56px);
  padding: 120px clamp(16px, 5vw, 72px) clamp(28px, 4vw, 48px);
  /* Static photo; the scrim below keeps the headline and search legible. */
  background:
    url("${POSTER}") center / cover no-repeat,
    ${c.background};

  @media (max-width: 900px) {
    padding-top: 104px;
  }
  /* Leaves room under the search for the floating support button. */
  @media (max-width: 640px) {
    padding-bottom: calc(88px + env(safe-area-inset-bottom));
  }
`;

const HeroTop = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;

  @media (max-width: 640px) {
    gap: 22px;
  }
`;

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  /* Keeps the headline and the search legible over moving footage. */
  background: linear-gradient(
    180deg,
    ${c.background}cc 0%,
    ${c.background}59 42%,
    ${c.background}f2 100%
  );
`;

const HeroCopy = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 30px;
  max-width: 760px;

  @media (max-width: 640px) {
    gap: 18px;
  }
`;

const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${c.secondaryContainer};

  span:last-child {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${c.onSecondaryContainer};
  }
`;

const Display = styled(TrickleHeading)`
  margin: 0;
  font-weight: 700;
  font-size: clamp(48px, 8vw, 132px);
  line-height: 0.9;
  letter-spacing: -0.01em;
  color: ${c.onSurface};
  text-wrap: balance;

  & span {
    display: inline-block;
  }
  & .accent-sage {
    color: ${c.primary};
  }
  & .accent-tan {
    color: ${c.tertiary};
  }
`;

const HeroLead = styled.p`
  margin: 0;
  max-width: 540px;
  font-size: clamp(17px, 1.35vw, 21px);
  line-height: 1.55;
  color: ${c.onSurfaceVariant};
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.5);
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 12px;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-start;
    margin-top: 16px;
  }
`;

const BtnGreen = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 36px;
  border-radius: 999px;
  /* Filled-tonal: the quieter of the two actions, next to the primary Search. */
  background: ${c.secondaryContainer};
  color: ${c.onSecondaryContainer};
  font-size: 17px;
  font-weight: 700;
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(1.15);
  }

  @media (max-width: 640px) {
    flex: 0 0 auto;
    padding: 14px 26px;
    font-size: 15px;
  }
`;

const HeroStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 26px;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
  /* The stats band further down repeats these; on a phone they only crowd the fold. */
  @media (max-width: 640px) {
    display: none;
  }
`;

const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: ${c.onSurface};
  }
  span {
    font-size: 13px;
    color: ${c.onSurfaceVariant};
  }
`;

const HeroDivider = styled.div`
  width: 1px;
  height: 34px;
  background: ${c.outlineVariant};
`;

export function Hero() {
  // CSS backgrounds are found late; preloading gets the poster painting sooner.
  preload(POSTER, { as: "image", fetchPriority: "high" });

  return (
    <HeroShell id="top">
      <Scrim aria-hidden />
      <HeroTop>
        <HeroCopy>
          <LivePill>
            <PulseDot />
            <span>Share the ride · Save more</span>
          </LivePill>

          <Display
            parts={[
              { text: "Ride." },
              { text: "Share.", className: "accent-sage" },
              { text: "Connect.", className: "accent-tan" },
            ]}
          />

          <Reveal stagger={0.12} delay={0.55}>
            <HeroLead>
              Make every journey count. Share the ride. Split the cost. Meet
              people going your way.
            </HeroLead>
            <HeroActions>
              <BtnGreen href="#download">Offer a ride</BtnGreen>
            </HeroActions>
          </Reveal>
        </HeroCopy>

        <Reveal delay={0.5}>
          <HeroStats>
            <HeroStat>
              <b>KES 1,000</b>
              <span>cheapest shared seat</span>
            </HeroStat>
            <HeroDivider />
            <HeroStat>
              <b>42</b>
              <span>towns connected</span>
            </HeroStat>
          </HeroStats>
        </Reveal>
      </HeroTop>

      <HeroSearch />
    </HeroShell>
  );
}
