import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Parallax } from "../../anim/Parallax";
import { Reveal } from "../../anim/Reveal";
import { TrickleHeading } from "../TrickleHeading";
import { HeroCarousel } from "../HeroCarousel";
import { PulseDot } from "../primitives";

const HeroShell = styled.section`
  position: relative;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  align-items: center;
  gap: 40px;
  padding: 50px clamp(16px, 5vw, 72px) 80px;
  overflow: hidden;

  @media (max-width: 900px) {
    padding-top: 116px;
  }
`;

const HeroPattern = styled.div`
  position: absolute;
  inset: -10%;
  background-image: url("/landing/car-pattern-t.png");
  background-size: 520px;
  opacity: 0.13;
  pointer-events: none;
`;

const HeroPeopleLeft = styled(Parallax)`
  position: absolute;
  left: -70px;
  bottom: -40px;
  width: min(300px, 22vw);
  opacity: 0.5;
  pointer-events: none;

  @media (max-width: 900px) {
    display: none;
  }
`;

const HeroPeopleRight = styled(Parallax)`
  position: absolute;
  right: -50px;
  bottom: -60px;
  width: min(280px, 20vw);
  opacity: 0.35;
  pointer-events: none;

  @media (max-width: 900px) {
    display: none;
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
  font-size: clamp(44px, 8.4vw, 148px);
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

const BtnLime = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 36px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 17px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
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
  background: #2a2a2a;
`;

const HeroVisual = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(24px, 3vw, 40px);
`;

const HeroVisualInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function Hero() {
  return (
    <HeroShell id="top">
      <HeroPattern aria-hidden />
      <HeroPeopleLeft amount={40}>
        <img
          src="/landing/people-left.png"
          alt=""
          style={{ width: "100%", display: "block" }}
        />
      </HeroPeopleLeft>
      <HeroPeopleRight amount={30}>
        <img
          src="/landing/people-right.png"
          alt=""
          style={{ width: "100%", display: "block" }}
        />
      </HeroPeopleRight>

      <HeroCopy>
        <LivePill>
          <PulseDot />
          <span>Share the ride Â· Save more</span>
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
            <BtnLime href="#find">Find a ride</BtnLime>
            <BtnGreen href="#download">Offer a ride</BtnGreen>
          </HeroActions>
        </Reveal>
      </HeroCopy>

      <HeroVisual>
        <HeroVisualInner>
          <HeroCarousel />
        </HeroVisualInner>
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
      </HeroVisual>
    </HeroShell>
  );
}

