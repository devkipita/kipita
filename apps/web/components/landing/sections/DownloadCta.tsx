import styled from "styled-components";
import Image from "next/image";
import appSearch from "../../../public/landing/app-search.png";
import appHome from "../../../public/landing/app-home.png";
import appRides from "../../../public/landing/app-rides.png";
import { nocturne } from "../nocturne";
import { dur, ease } from "@/lib/motion";
import { Reveal } from "../../anim/Reveal";
import { Eyebrow, H2 } from "../primitives";
import { WaitlistForm } from "../WaitlistForm";
import { AppleIcon, AndroidIcon } from "../icons";

const Download = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: ${nocturne.surface};
  overflow: hidden;

  @media (max-width: 640px) {
    padding: 72px 18px;
  }
`;

const DownloadGrid = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  gap: clamp(40px, 6vw, 90px);
  align-items: center;
`;

const DownloadCopy = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: flex-start;
`;

const DownloadLead = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: ${nocturne.muted2};
`;

const StoreRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;

  @media (max-width: 640px) {
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
`;

const StoreBtn = styled.a<{ $variant: "light" | "soft" }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 16px 28px;
  border: 1px solid transparent;
  border-radius: 999px;
  transition:
    background ${dur.short4}ms ${ease.standard},
    border-color ${dur.short4}ms ${ease.standard},
    color ${dur.short4}ms ${ease.standard},
    transform ${dur.short3}ms ${ease.emphasized},
    box-shadow ${dur.medium2}ms ${ease.emphasizedDecelerate};

  svg {
    flex: none;
    transition: transform ${dur.medium3}ms ${ease.emphasized};
  }

  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 26px -12px rgba(8, 28, 20, 0.45);
    }
    &:hover svg {
      transform: scale(1.14) rotate(-6deg);
    }
  }
  &:active {
    transform: scale(0.98);
    box-shadow: none;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }

  @media (max-width: 640px) {
    width: min(100%, 340px);
    justify-content: center;
    padding: 18px 24px;
  }

  @media (max-width: 420px) {
    width: 100%;
    max-width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition:
      background ${dur.short4}ms ${ease.standard},
      color ${dur.short4}ms ${ease.standard};

    svg {
      transition: none;
    }
    &:hover,
    &:active,
    &:hover svg {
      transform: none;
    }
  }

  ${({ $variant }) =>
    $variant === "light"
      ? `
        background: ${nocturne.cream};
        color: ${nocturne.bg};
        &:hover { background: ${nocturne.sage}; color: ${nocturne.greenDeep}; }
      `
      : `
        background: ${nocturne.sage};
        color: ${nocturne.greenDeep};
        &:hover { background: ${nocturne.green}; color: ${nocturne.onGreen}; }
      `}
`;

const StoreLabel = styled.span`
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;

  small {
    font-size: 14px;
    font-weight: 500;
    opacity: 0.9;
  }
  b {
    font-family: var(--font-dm), system-ui, sans-serif;
    font-size: 17px;
    font-weight: 700;
  }
`;

const Phones = styled.div`
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  min-height: clamp(340px, 56vw, 520px);
`;

const Phone = styled(Image)<{ $pos: "left" | "right" | "center" }>`
  flex: none;
  height: auto;
  border-radius: 26px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  ${({ $pos }) =>
    $pos === "center"
      ? `
        width: clamp(132px, 34vw, 250px);
        border-radius: 30px;
        border: 1px solid ${nocturne.green};
        z-index: 2;
        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
      `
      : $pos === "left"
        ? `
          width: clamp(104px, 27vw, 210px);
          transform: translateY(26px) rotate(-5deg);
          margin-right: clamp(-46px, -7vw, -24px);
        `
        : `
          width: clamp(104px, 27vw, 210px);
          transform: translateY(26px) rotate(5deg);
          margin-left: clamp(-46px, -7vw, -24px);
        `}
`;

export function DownloadCta() {
  return (
    <Download id="download">
      <DownloadGrid>
        <DownloadCopy stagger={0.1}>
          <Eyebrow $tone="lime">In build · launching soon</Eyebrow>
          <H2>
            Put Kipita
            <br />
            in your pocket.
          </H2>
          <DownloadLead>
            We&apos;re finishing the app now. Join the waitlist and you&apos;ll
            get it the day it lands on the store — iOS and Android, same week.
          </DownloadLead>
          <StoreRow>
            <StoreBtn href="#contact" $variant="light">
              <AppleIcon size={30} />
              <StoreLabel>
                <small>Coming to</small>
                <b>App Store</b>
              </StoreLabel>
            </StoreBtn>
            <StoreBtn href="#contact" $variant="soft">
              <AndroidIcon size={30} />
              <StoreLabel>
                <small>Coming to</small>
                <b>Google Play</b>
              </StoreLabel>
            </StoreBtn>
          </StoreRow>
          <WaitlistForm />
        </DownloadCopy>

        <Reveal delay={0.1}>
          <Phones>
            <Phone
              src={appSearch}
              alt="Kipita search screen"
              sizes="(max-width: 640px) 27vw, 210px"
              $pos="left"
            />
            <Phone
              src={appHome}
              alt="Kipita home screen"
              sizes="(max-width: 640px) 34vw, 250px"
              $pos="center"
            />
            <Phone
              src={appRides}
              alt="Kipita rides screen"
              sizes="(max-width: 640px) 27vw, 210px"
              $pos="right"
            />
          </Phones>
        </Reveal>
      </DownloadGrid>
    </Download>
  );
}
