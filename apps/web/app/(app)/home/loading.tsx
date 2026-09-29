"use client";

import styled, { keyframes } from "styled-components";

const shimmer = keyframes`
  0%   { background-position: -320px 0; }
  100% { background-position: 320px 0; }
`;

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const MapBand = styled.div`
  width: 100%;
  height: clamp(200px, 26vh, 320px);
  background: ${({ theme }) => theme.color.bgAlt};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  @media (max-width: 859px) {
    height: 112px;
  }
`;

const Wrap = styled.div`
  max-width: 920px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 28px) 56px;
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const Block = styled.div<{ $h: number; $w?: string; $round?: boolean }>`
  height: ${({ $h }) => $h}px;
  width: ${({ $w }) => $w ?? "100%"};
  border-radius: ${({ theme, $round }) =>
    $round ? theme.radius.pill : theme.radius.md};
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

const Dock = styled(Block)`
  margin-top: -34px;

  @media (max-width: 860px) {
    margin-top: -22px;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
`;

export default function HomeLoading() {
  return (
    <Page aria-busy aria-label="Loading your home page">
      <MapBand />
      <Wrap>
        <Dock $h={60} $round />
        <Block $h={52} $w="min(320px, 70%)" />
        <Row>
          <Block $h={176} />
          <Block $h={176} />
          <Block $h={176} />
        </Row>
        <Row>
          <Block $h={150} />
          <Block $h={150} />
        </Row>
        <Block $h={140} />
      </Wrap>
    </Page>
  );
}
