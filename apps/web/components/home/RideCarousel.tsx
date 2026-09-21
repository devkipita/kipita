"use client";

import styled, { keyframes } from "styled-components";
import { CarFront, RotateCw, UserRoundSearch } from "lucide-react";
import { ButtonEl } from "@/components/ui/primitives";
import { ROLE_COPY } from "@/lib/home/labels";
import type { AppMode } from "@/lib/home/mode";
import type { HomeItem } from "@/lib/home/search";
import { RideCard } from "./RideCard";

const shimmer = keyframes`
  0%   { background-position: -320px 0; }
  100% { background-position: 320px 0; }
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 1.12rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
  span {
    font-size: 0.83rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

/* A scroll-snapping rail on phones, a grid once there's room for one. */
const Rail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(268px, 1fr);
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
  scrollbar-width: thin;

  > * {
    scroll-snap-align: start;
  }

  @media (min-width: 760px) {
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-auto-columns: auto;
    overflow-x: visible;
  }
`;

const Skeleton = styled.div`
  height: 208px;
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

const Center = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 40px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  color: ${({ theme }) => theme.color.muted};

  svg.big {
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    font-size: 1.02rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 38ch;
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

export type CarouselPhase = "ready" | "searching" | "error";

/**
 * Band 2 — available rides (passenger) or passenger requests (driver).
 *
 * The empty state is the entry point to the core loop: no results means the CTA
 * to post, exactly as on mobile.
 */
export function RideCarousel({
  mode,
  phase,
  items,
  onPost,
  onRetry,
}: {
  mode: AppMode;
  phase: CarouselPhase;
  items: HomeItem[];
  onPost: () => void;
  onRetry: () => void;
}) {
  const copy = ROLE_COPY[mode];

  return (
    <section>
      <Head>
        <h2>{copy.carouselTitle}</h2>
        {phase === "ready" && items.length > 0 && (
          <span>
            {items.length} {items.length === 1 ? "result" : "results"}
          </span>
        )}
      </Head>

      {phase === "searching" && (
        <Rail aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} />
          ))}
        </Rail>
      )}

      {phase === "error" && (
        <Center>
          <b>We couldn&apos;t load these</b>
          <p>Check your connection and try again.</p>
          <ButtonEl type="button" $compact $variant="ghost" onClick={onRetry}>
            <RotateCw size={16} strokeWidth={2.4} /> Retry
          </ButtonEl>
        </Center>
      )}

      {phase === "ready" &&
        (items.length === 0 ? (
          <Center>
            {mode === "driver" ? (
              <UserRoundSearch className="big" size={30} strokeWidth={2} />
            ) : (
              <CarFront className="big" size={30} strokeWidth={2} />
            )}
            <b>{copy.emptyTitle}</b>
            <p>{copy.emptyBody}</p>
            <ButtonEl type="button" $compact onClick={onPost}>
              {copy.postAction}
            </ButtonEl>
          </Center>
        ) : (
          <Rail>
            {items.map((item) => (
              <RideCard key={item.id} item={item} />
            ))}
          </Rail>
        ))}
    </section>
  );
}
