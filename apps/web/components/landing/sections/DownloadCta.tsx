import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { Eyebrow, H2 } from "../primitives";
import { WaitlistForm } from "../WaitlistForm";
import { AppleIcon, AndroidIcon } from "../icons";

const Download = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: ${nocturne.surface};
  overflow: hidden;
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

const StoreBtn = styled.a<{ $variant: "light" | "outline" }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  border-radius: 999px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  @media (max-width: 640px) {
    width: min(100%, 340px);
    justify-content: center;
    padding: 18px 24px;
  }

  @media (max-width: 420px) {
    width: 100%;
    max-width: 100%;
  }

  ${({ $variant }) =>
    $variant === "light"
      ? `
        background: ${nocturne.cream};
        color: ${nocturne.greenDeep};
        &:hover { background: ${nocturne.sage}; }
      `
      : `
        background: transparent;
        border: 1px solid #3a3a3a;
        color: ${nocturne.cream};
        &:hover { border-color: ${nocturne.sage}; color: ${nocturne.sage}; }
      `}
`;

const StoreLabel = styled.span`
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;

  small {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.7;
  }
  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
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

const Phone = styled.img<{ $pos: "left" | "right" | "center" }>`
  flex: none;
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
              <AppleIcon size={30} fill="#14392A" />
              <StoreLabel>
                <small>Coming to</small>
                <b>App Store</b>
              </StoreLabel>
            </StoreBtn>
            <StoreBtn href="#contact" $variant="outline">
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
              src="/landing/app-search.png"
              alt="Kipita search screen"
              $pos="left"
            />
            <Phone
              src="/landing/app-home.png"
              alt="Kipita home screen"
              $pos="center"
            />
            <Phone
              src="/landing/app-rides.png"
              alt="Kipita rides screen"
              $pos="right"
            />
          </Phones>
        </Reveal>
      </DownloadGrid>
    </Download>
  );
}
