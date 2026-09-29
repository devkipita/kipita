"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { CarProfile as CarFront, CaretLeft as ChevronLeft, CaretRight as ChevronRight, ArrowClockwise as RotateCw, UserFocus as UserRoundSearch } from "@/components/icons";
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .count {
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Pager = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 36px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  transition: border-color 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.outline};
  }

  @media (max-width: 660px) {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Arrow = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  & + &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 9px;
    bottom: 9px;
    width: 1px;
    background: ${({ theme }) => theme.color.outlineVariant};
  }

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryContainer};
      color: ${({ theme }) => theme.color.onPrimaryContainer};
    }
  }
  &:active:not(:disabled) {
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.onPrimary};
  }
  &:disabled {
    color: ${({ theme }) => theme.color.outlineVariant};
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -3px;
    border-radius: 999px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Dots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;

  @media (min-width: 661px) {
    display: none;
  }
`;

const Dot = styled.button<{ $active: boolean }>`
  position: relative;
  height: 6px;
  width: ${({ $active }) => ($active ? "22px" : "6px")};
  padding: 0;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primary : theme.color.outlineVariant};

  &::after {
    content: "";
    position: absolute;
    inset: -11px -5px;
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ theme, $active }) =>
        $active ? theme.color.primary : theme.color.onSurfaceVariant};
    }
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SeeAll = styled.button`
  border: none;
  background: transparent;
  padding: 6px 4px;
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  color: ${({ theme }) => theme.color.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const Rail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 3 * 14px) / 4);
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding-bottom: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    scroll-snap-align: start;
  }

  &:focus-visible {
    outline-offset: 4px;
  }

  @media (max-width: 1199px) {
    grid-auto-columns: calc((100% - 2 * 14px) / 3);
  }
  @media (max-width: 899px) {
    grid-auto-columns: calc((100% - 14px) / 2);
  }
  @media (max-width: 660px) {
    grid-auto-columns: 86%;
  }
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1199px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 899px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 660px) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Mirrors RideCard row for row — avatar beside two lines, the "when" line, two
 * route towns, a rule, then amenities and the price. Same container, same
 * padding, same gaps, so nothing shifts when the real cards land.
 */
const Skeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .bar {
    border-radius: ${({ theme }) => theme.radius.xs};
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.surfaceContainer} 0px,
      ${({ theme }) => theme.color.surfaceContainerHigh} 160px,
      ${({ theme }) => theme.color.surfaceContainer} 320px
    );
    background-size: 640px 100%;
    animation: ${shimmer} 1.15s linear infinite;
  }

  .who {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.md};
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    flex: none;
  }
  .who-copy {
    display: grid;
    gap: 5px;
    flex: 1;
  }

  .journey {
    display: grid;
    gap: ${({ theme }) => theme.space.sm};
  }
  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};
    padding-top: ${({ theme }) => theme.space.md};
    border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  }
  .foot-left {
    display: grid;
    gap: ${({ theme }) => theme.space.sm};
    flex: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
    }
  }
`;

function CardSkeleton() {
  return (
    <Skeleton aria-hidden="true">
      <div className="who">
        <div className="bar avatar" />
        <div className="who-copy">
          <div className="bar" style={{ height: 15, width: "62%" }} />
          <div className="bar" style={{ height: 12, width: "38%" }} />
        </div>
      </div>

      <div className="journey">
        <div className="bar" style={{ height: 17, width: "56%" }} />
        <div className="bar" style={{ height: 14, width: "72%" }} />
        <div className="bar" style={{ height: 14, width: "64%" }} />
      </div>

      <div className="foot">
        <div className="foot-left">
          <div className="bar" style={{ height: 14, width: "42%" }} />
          <div className="bar" style={{ height: 12, width: "56%" }} />
        </div>
        <div className="bar" style={{ height: 24, width: 96 }} />
      </div>
    </Skeleton>
  );
}

const Center = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 26px 4px;
  color: ${({ theme }) => theme.color.textSoft};

  svg.big {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 2px 0 10px;
    max-width: 65ch;
    font-size: ${({ theme }) => theme.type.body};
    line-height: 1.45;
  }
`;

export type CarouselPhase = "ready" | "searching" | "error";

export function RideCarousel({
  mode,
  phase,
  items,
  onPost,
  onRetry,
  hoveredId = null,
  onHoverChange,
}: {
  mode: AppMode;
  phase: CarouselPhase;
  items: HomeItem[];
  onPost: () => void;
  onRetry: () => void;
  hoveredId?: string | null;
  onHoverChange?: (id: string | null) => void;
}) {
  const copy = ROLE_COPY[mode];
  const railRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [pages, setPages] = useState(1);
  const [page_, setPage] = useState(0);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    const width = el.clientWidth || 1;
    setPages(Math.max(1, Math.ceil(el.scrollWidth / width)));
    setPage(Math.round(el.scrollLeft / width));
  }, []);

  useEffect(() => {
    if (expanded) return;
    sync();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [expanded, sync, items.length]);

  function page(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  function goToPage(index: number) {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  const showTools = phase === "ready" && items.length > 0;

  return (
    <section>
      <Head>
        <h2>{copy.carouselTitle}</h2>
        {showTools && (
          <Tools>
            {items.length > 4 && (
              <SeeAll type="button" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Show less" : `See all ${items.length}`}
              </SeeAll>
            )}
            {!expanded && (
              <Pager>
                <Arrow
                  type="button"
                  onClick={() => page(-1)}
                  disabled={atStart}
                  aria-label="Previous rides"
                >
                  <ChevronLeft size={16} weight="bold" />
                </Arrow>
                <Arrow
                  type="button"
                  onClick={() => page(1)}
                  disabled={atEnd}
                  aria-label="More rides"
                >
                  <ChevronRight size={16} weight="bold" />
                </Arrow>
              </Pager>
            )}
          </Tools>
        )}
      </Head>

      {phase === "searching" && (
        <Grid aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </Grid>
      )}

      {phase === "error" && (
        <Center>
          <RotateCw className="big" size={26} />
          <span>
            <b>We couldn&rsquo;t load these</b>
            <p>Check your connection and try again.</p>
            <ButtonEl type="button" $compact $variant="ghost" onClick={onRetry}>
              Try again
            </ButtonEl>
          </span>
        </Center>
      )}

      {phase === "ready" &&
        (items.length === 0 ? (
          <Center>
            {mode === "driver" ? (
              <UserRoundSearch className="big" size={28} />
            ) : (
              <CarFront className="big" size={28} />
            )}
            <span>
              <b>{copy.emptyTitle}</b>
              <p>{copy.emptyBody}</p>
              <ButtonEl type="button" $compact onClick={onPost}>
                {copy.postAction}
              </ButtonEl>
            </span>
          </Center>
        ) : expanded ? (
          <Grid>
            {items.map((item) => (
              <RideCard
                key={item.id}
                item={item}
                hovered={hoveredId === item.id}
                onHoverChange={onHoverChange}
              />
            ))}
          </Grid>
        ) : (
          <>
            <Rail
              ref={railRef}
              tabIndex={0}
              role="group"
              aria-label={`${copy.carouselTitle}, ${items.length} results. Scroll horizontally.`}
            >
              {items.map((item) => (
                <RideCard
                  key={item.id}
                  item={item}
                  hovered={hoveredId === item.id}
                  onHoverChange={onHoverChange}
                />
              ))}
            </Rail>

            {pages > 1 && (
              <Dots role="tablist" aria-label="Ride pages">
                {Array.from({ length: pages }, (_, i) => (
                  <Dot
                    key={i}
                    type="button"
                    role="tab"
                    $active={i === page_}
                    aria-selected={i === page_}
                    aria-label={`Page ${i + 1} of ${pages}`}
                    onClick={() => goToPage(i)}
                  />
                ))}
              </Dots>
            )}
          </>
        ))}
    </section>
  );
}
