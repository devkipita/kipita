"use client";

import styled, { keyframes } from "styled-components";

const shimmer = keyframes`
  0%   { opacity: 0.55; }
  50%  { opacity: 0.9; }
  100% { opacity: 0.55; }
`;

const Wrap = styled.div`
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 28px 20px 64px;

  @media (max-width: 760px) {
    padding: 20px 16px 56px;
  }
`;

const Bar = styled.div<{ $w: string; $h: string; $mb?: string }>`
  width: ${({ $w }) => $w};
  height: ${({ $h }) => $h};
  margin-bottom: ${({ $mb }) => $mb ?? "14px"};
  border-radius: 10px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  animation: ${shimmer} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 24px;
`;

const Card = styled.div`
  height: 148px;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  animation: ${shimmer} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Wrap role="status" aria-busy="true" aria-live="polite">
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        Loading
      </span>
      <Bar $w="190px" $h="30px" $mb="18px" aria-hidden />
      <Bar $w="min(460px, 80%)" $h="16px" $mb="4px" aria-hidden />
      <Grid aria-hidden>
        {Array.from({ length: cards }, (_, i) => (
          <Card key={i} />
        ))}
      </Grid>
    </Wrap>
  );
}
