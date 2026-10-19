"use client";

import styled, { keyframes } from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { RULE } from "./controls";

const pulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(40px, 7vh, 88px) max(22px, calc((100% - 880px) / 2)) 140px;
  background: ${nocturne.bg};

  @media (min-width: 1240px) {
    padding-inline: max(22px, calc((100% - 1080px) / 2));
  }
  @media (min-width: 1600px) {
    padding-inline: max(22px, calc((100% - 1260px) / 2));
  }
  @media (max-width: 640px) {
    padding: 20px 18px calc(120px + env(safe-area-inset-bottom));
  }
`;

const Kicker = styled.h1`
  margin: 0 0 20px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0;
  color: ${nocturne.muted};
`;

const Sentence = styled.p`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(29px, 5vw, 58px);
  font-weight: 500;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: ${nocturne.muted};
  text-wrap: pretty;

  @media (min-width: 1400px) {
    font-size: clamp(58px, 4.4vw, 82px);
    line-height: 1.16;
  }
`;

const Slot = styled.span<{ $w: string }>`
  display: inline-block;
  width: ${({ $w }) => $w};
  height: 0.72em;
  margin-bottom: -0.06em;
  border-radius: 6px;
  background: ${nocturne.surface2};
  animation: ${pulse} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const EditorRule = styled.div`
  height: 1.5px;
  margin: clamp(34px, 5vh, 54px) 0 22px;
  background: ${RULE};
`;

const Label = styled.div`
  width: 170px;
  height: 17px;
  margin-bottom: 18px;
  border-radius: 6px;
  background: ${nocturne.surface2};
  animation: ${pulse} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.span<{ $w: string }>`
  width: ${({ $w }) => $w};
  height: 38px;
  border-radius: 8px;
  border: 1.5px solid ${RULE};
  background: ${nocturne.surface};
  animation: ${pulse} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const CHIPS = ["112px", "92px", "96px", "94px", "76px", "80px"];

export function PublishSkeleton() {
  return (
    <Page role="status" aria-busy="true">
      <SrOnly>Loading the publish page</SrOnly>
      <Kicker>Publish a ride</Kicker>

      <Sentence aria-hidden>
        I’m driving from <Slot $w="3.2em" /> to <Slot $w="2.8em" />.
      </Sentence>

      <EditorRule />
      <Label />
      <Chips>
        {CHIPS.map((w, i) => (
          <Chip key={i} $w={w} />
        ))}
      </Chips>
    </Page>
  );
}
