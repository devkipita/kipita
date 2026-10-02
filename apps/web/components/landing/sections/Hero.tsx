import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { TrickleHeading } from "../TrickleHeading";
import { HeroSearch } from "../search/HeroSearch";
import { PulseDot } from "../primitives";

const HeroShell = styled.section`
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: clamp(32px, 5vw, 56px);
  padding: 120px clamp(16px, 5vw, 72px) clamp(28px, 4vw, 48px);
  /* Gradient keeps the headline legible; the colour shows until the photo loads. */
  background:
    linear-gradient(
      180deg,
      rgba(8, 16, 12, 0.74) 0%,
      rgba(8, 16, 12, 0.36) 40%,
      rgba(8, 16, 12, 0.88) 100%
    ),
    url("/home/nairobi-hero.jpg") center / cover no-repeat,
    ${nocturne.bg};

  @media (max-width: 900px) {
    padding-top: 116px;
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
`;

const Credit = styled.a`
  position: absolute;
  right: clamp(16px, 5vw, 72px);
  bottom: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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
    gap: 24px;
  }
`;

const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  border: 1px solid ${nocturne.green};

  span:last-child {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${nocturne.sage};
  }
`;

const Display = styled(TrickleHeading)`
  margin: 0;
  font-weight: 700;
  font-size: clamp(40px, 6.6vw, 112px);
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
  text-wrap: balance;

  & span {
    display: inline-block;
  }
  & .accent-sage {
    color: ${nocturne.sage};
  }
  & .accent-tan {
    color: ${nocturne.tan};
  }
`;

const HeroLead = styled.p`
  margin: 0;
  max-width: 540px;
  font-size: clamp(17px, 1.35vw, 21px);
  line-height: 1.55;
  color: ${nocturne.muted};
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 12px;

  @media (max-width: 640px) {
    width: 100%;
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
  }

  @media (max-width: 420px) {
    gap: 10px;
  }
`;

const BtnGreen = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 36px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.lime};
  font-size: 17px;
  font-weight: 700;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.green};
  }

  @media (max-width: 640px) {
    flex: 1 1 0;
    min-width: 0;
    padding: 16px 18px;
    font-size: 15px;
  }

  @media (max-width: 420px) {
    padding: 14px 14px;
    font-size: 14px;
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
`;

const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  span {
    font-size: 13px;
    color: ${nocturne.muted3};
  }
`;

const HeroDivider = styled.div`
  width: 1px;
  height: 34px;
  background: rgba(255, 255, 255, 0.22);
`;

export function Hero() {
  return (
    <HeroShell id="top">
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

      <Credit
        href="https://commons.wikimedia.org/wiki/File:Nairobi_skyline_from_Gem_Hotel.jpg"
        target="_blank"
        rel="noopener noreferrer"
      >
        Photo: Daniel Case, CC BY-SA 4.0
      </Credit>
    </HeroShell>
  );
}
