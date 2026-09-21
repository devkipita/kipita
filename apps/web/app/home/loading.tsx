"use client";

import styled, { keyframes } from "styled-components";

/**
 * Streaming skeleton for `/home`. The page is fully dynamic, so without this
 * the first paint is a blank screen while auth and the initial queries resolve.
 */

const shimmer = keyframes`
  0%   { background-position: -320px 0; }
  100% { background-position: 320px 0; }
`;

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 70px clamp(16px, 4vw, 28px) 48px;
  display: flex;
  flex-direction: column;
  gap: 26px;
`;

const Block = styled.div<{ $h: number }>`
  height: ${({ $h }) => $h}px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.surface2} 0px,
    ${({ theme }) => theme.color.line} 160px,
    ${({ theme }) => theme.color.surface2} 320px
  );
  background-size: 640px 100%;
  animation: ${shimmer} 1.15s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export default function HomeLoading() {
  return (
    <Page>
      <Wrap aria-busy aria-label="Loading your home page">
        <Block $h={44} />
        <Block $h={280} />
        <Block $h={208} />
        <Block $h={150} />
      </Wrap>
    </Page>
  );
}
