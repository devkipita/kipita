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
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 600;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
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
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;

  @media (max-width: 559px) {
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

const spin = keyframes`to { transform: rotate(360deg); }`;

const Refreshing = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.color.textSoft};

  svg {
    animation: ${spin} 0.9s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
  }
`;

const Dots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;

  @media (min-width: 560px) {
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

const GAP = "var(--card-gap, 16px)";

const Rail = styled.div<{ $wide?: boolean }>`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: ${({ $wide }) =>
    $wide
      ? `calc((100% - ${GAP}) / 2)`
      : `calc((100% - 3 * ${GAP}) / 4)`};
  gap: ${GAP};
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--page-pad);
  scroll-behavior: smooth;
  padding: clamp(10px, 3vw, 34px) var(--page-pad) ${({ theme }) => theme.space.lg};
  margin: -6px calc(-1 * var(--page-pad)) -10px;
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

  @media (max-width: 1359px) {
    grid-auto-columns: ${({ $wide }) =>
      $wide ? `calc((100% - ${GAP}) / 2)` : `calc((100% - 2 * ${GAP}) / 3)`};
  }
  @media (max-width: 999px) {
    grid-auto-columns: ${({ $wide }) =>
      $wide ? "92%" : `calc((100% - ${GAP}) / 2)`};
  }
  @media (max-width: 559px) {
    grid-auto-columns: ${({ $wide }) => ($wide ? "94%" : "min(88%, 340px)")};
  }
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

const Grid = styled.div<{ $wide?: boolean }>`
  display: grid;
  grid-template-columns: repeat(${({ $wide }) => ($wide ? 2 : 4)}, minmax(0, 1fr));
  gap: ${({ $wide }) => ($wide ? 34 : 24)}px ${GAP};
  padding-top: ${({ $wide }) => ($wide ? 34 : 0)}px;
  margin-top: ${({ $wide }) => ($wide ? -6 : 0)}px;

  @media (max-width: 1359px) {
    grid-template-columns: repeat(${({ $wide }) => ($wide ? 2 : 3)}, minmax(0, 1fr));
  }
  @media (max-width: 999px) {
    grid-template-columns: ${({ $wide }) =>
      $wide ? "1fr" : "repeat(2, minmax(0, 1fr))"};
  }
  @media (max-width: 559px) {
    grid-template-columns: 1fr;
  }
`;

const Skeleton = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  overflow: hidden;

  .bar {
    border-radius: ${({ theme }) => theme.radius.xxs};
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.elevatedInset} 0px,
      ${({ theme }) => theme.color.surfaceVariant} 160px,
      ${({ theme }) => theme.color.elevatedInset} 320px
    );
    background-size: 640px 100%;
    animation: ${shimmer} 1.15s linear infinite;
  }

  .media {
    aspect-ratio: 16 / 9;
    border-radius: 0;
  }
  .body {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: ${({ theme }) => theme.space.lg};
  }
  .facts {
    display: grid;
    gap: 7px;
    margin-top: ${({ theme }) => theme.space.md};
  }
  .fact {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
  }
  .glyph {
    width: 22px;
    height: 22px;
    flex: none;
  }
  .who {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
    margin-top: ${({ theme }) => theme.space.md};
  }
  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    flex: none;
  }
  .who-copy {
    display: grid;
    gap: 5px;
    flex: 1;
  }
  .chips {
    display: flex;
    gap: 6px;
    margin: ${({ theme }) => theme.space.md} 0;
  }
  .fare {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.sm};
    margin-top: auto;
    padding-top: ${({ theme }) => theme.space.md};
    border-top: 1px solid ${({ theme }) => theme.color.outlineVariant};
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
    }
  }
`;

const WideSkeleton = styled.div`
  display: grid;
  grid-template-columns: minmax(96px, 25%) 1fr;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  overflow: hidden;

  .bar {
    border-radius: ${({ theme }) => theme.radius.xxs};
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.elevatedInset} 0px,
      ${({ theme }) => theme.color.surfaceVariant} 160px,
      ${({ theme }) => theme.color.elevatedInset} 320px
    );
    background-size: 640px 100%;
    animation: ${shimmer} 1.15s linear infinite;
  }

  .face {
    border-radius: 0;
    min-height: 178px;
  }
  .body {
    display: flex;
    flex-direction: column;
    padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.lg}
      ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xxl};
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};
  }
  .who {
    display: grid;
    gap: 6px;
    flex: 1;
  }
  .facts {
    display: flex;
    gap: ${({ theme }) => theme.space.md};
    margin-top: ${({ theme }) => theme.space.md};
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};
    margin-top: auto;
    padding-top: ${({ theme }) => theme.space.md};
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
    }
  }
`;

const FACT_WIDTHS = ["58%", "38%", "66%"];

function CardSkeleton({ $wide }: { $wide?: boolean }) {
  if ($wide) {
    return (
      <WideSkeleton aria-hidden="true">
        <div className="bar face" />
        <div className="body">
          <div className="head">
            <div className="who">
              <div className="bar" style={{ height: 18, width: "56%" }} />
              <div className="bar" style={{ height: 12, width: "42%" }} />
            </div>
            <div className="bar" style={{ height: 26, width: 108, borderRadius: 999 }} />
          </div>
          <div className="bar" style={{ height: 17, width: "62%", marginTop: 14 }} />
          <div className="facts">
            <div className="bar" style={{ height: 14, width: 78 }} />
            <div className="bar" style={{ height: 14, width: 66 }} />
          </div>
          <div className="foot">
            <div className="bar" style={{ height: 22, width: 128, borderRadius: 999 }} />
            <div className="bar" style={{ height: 14, width: 94 }} />
          </div>
        </div>
      </WideSkeleton>
    );
  }

  return (
    <Skeleton aria-hidden="true">
      <div className="bar media" />
      <div className="body">
        <div className="bar" style={{ height: 19, width: "86%" }} />

        <div className="facts">
          {FACT_WIDTHS.map((width) => (
            <div className="fact" key={width}>
              <div className="bar glyph" />
              <div className="bar" style={{ height: 13, width }} />
            </div>
          ))}
        </div>

        <div className="who">
          <div className="bar avatar" />
          <div className="who-copy">
            <div className="bar" style={{ height: 13, width: "58%" }} />
            <div className="bar" style={{ height: 11, width: "34%" }} />
          </div>
        </div>

        <div className="chips">
          <div className="bar" style={{ height: 22, width: 68, borderRadius: 999 }} />
          <div className="bar" style={{ height: 22, width: 80, borderRadius: 999 }} />
        </div>

        <div className="fare">
          <div className="bar" style={{ height: 25, width: 112 }} />
          <div className="bar" style={{ height: 11, width: 52 }} />
        </div>
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
  refreshing = false,
  items,
  onPost,
  onRetry,
  hoveredId = null,
  onHoverChange,
}: {
  mode: AppMode;
  phase: CarouselPhase;
  refreshing?: boolean;
  items: HomeItem[];
  onPost: () => void;
  onRetry: () => void;
  hoveredId?: string | null;
  onHoverChange?: (id: string | null) => void;
}) {
  const shown: AppMode =
    items.length > 0
      ? items[0].kind === "request"
        ? "driver"
        : "passenger"
      : mode;
  const copy = ROLE_COPY[shown];
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
  const wide = shown === "driver";
  const perPage = wide ? 2 : 4;

  return (
    <section>
      <Head>
        <h2>{copy.carouselTitle}</h2>
        {showTools && (
          <Tools>
            {refreshing && (
              <Refreshing aria-label="Updating results">
                <RotateCw size={15} />
              </Refreshing>
            )}
            {items.length > perPage && (
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
        <Grid aria-busy $wide={wide}>
          {Array.from({ length: perPage }, (_, i) => (
            <CardSkeleton key={i} $wide={wide} />
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
          <Grid $wide={wide}>
            {items.map((item, i) => (
              <RideCard
                key={item.id}
                item={item}
                index={i}
                hovered={hoveredId === item.id}
                onHoverChange={onHoverChange}
              />
            ))}
          </Grid>
        ) : (
          <>
            <Rail
              ref={railRef}
              $wide={wide}
              tabIndex={0}
              role="group"
              aria-label={`${copy.carouselTitle}, ${items.length} results. Scroll horizontally.`}
            >
              {items.map((item, i) => (
                <RideCard
                  key={item.id}
                  item={item}
                  index={i}
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


