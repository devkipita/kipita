"use client";

import styled from "styled-components";
import {
  Busy,
  Shimmer,
  SkeletonCard,
  SkeletonStack,
  SrOnly,
} from "./Shimmer";

const Wrap = styled.div`
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 24px var(--page-pad, 20px) 64px;
`;

const Title = styled.h1`
  margin: 0 0 6px;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
`;

const Lead = styled.p`
  margin: 0 0 22px;
  font-size: 16px;
  color: ${({ theme }) => theme.color.muted};
`;

const SectionTitle = styled.h2`
  margin: 26px 0 12px;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

export function RouteSkeleton({
  title,
  lead,
  sections,
}: {
  title: string;
  lead?: string;
  sections: { heading?: string; cards: number; cardHeight?: string }[];
}) {
  return (
    <Busy>
      <Wrap>
        <SrOnly>Loading {title}</SrOnly>
        <Title>{title}</Title>
        {lead ? <Lead>{lead}</Lead> : null}
        {sections.map((section, i) => (
          <div key={i}>
            {section.heading ? (
              <SectionTitle>{section.heading}</SectionTitle>
            ) : null}
            <SkeletonStack $gap="14px" aria-hidden>
              {Array.from({ length: section.cards }, (_, c) => (
                <SkeletonCard key={c} $h={section.cardHeight} />
              ))}
            </SkeletonStack>
          </div>
        ))}
        <Shimmer $w="34%" $h="14px" $mb="0" aria-hidden style={{ marginTop: 22 }} />
      </Wrap>
    </Busy>
  );
}
