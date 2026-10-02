"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  CarProfile as CarFront,
  ArrowClockwise as RotateCw,
  UserFocus as UserRoundSearch,
} from "@/components/icons";
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

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.space.lg};
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
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
            <div
              className="bar"
              style={{ height: 26, width: 108, borderRadius: 999 }}
            />
          </div>
          <div
            className="bar"
            style={{ height: 17, width: "62%", marginTop: 14 }}
          />
          <div className="facts">
            <div className="bar" style={{ height: 14, width: 78 }} />
            <div className="bar" style={{ height: 14, width: 66 }} />
          </div>
          <div className="foot">
            <div
              className="bar"
              style={{ height: 22, width: 128, borderRadius: 999 }}
            />
            <div className="bar" style={{ height: 14, width: 94 }} />
          </div>
        </div>
      </WideSkeleton>
    );
  }

  return (
    <Skeleton aria-hidden="true">
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
          <div
            className="bar"
            style={{ height: 22, width: 68, borderRadius: 999 }}
          />
          <div
            className="bar"
            style={{ height: 22, width: 80, borderRadius: 999 }}
          />
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

const PAGE_SIZE = 6;

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
  const [visible, setVisible] = useState(PAGE_SIZE);

  // A new search or mode swaps the result set; start from the first page again.
  const firstId = items[0]?.id;
  useEffect(() => setVisible(PAGE_SIZE), [firstId, items.length]);

  const showTools = phase === "ready" && items.length > 0;
  const wide = shown === "driver";
  const shownItems = items.slice(0, visible);
  const remaining = items.length - shownItems.length;

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
            <span className="count">{items.length} available</span>
          </Tools>
        )}
      </Head>

      {phase === "searching" && (
        <Column aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} $wide={wide} />
          ))}
        </Column>
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
        ) : (
          <>
            <Column>
              {shownItems.map((item, i) => (
                <RideCard
                  key={item.id}
                  item={item}
                  index={i % PAGE_SIZE}
                  hovered={hoveredId === item.id}
                  onHoverChange={onHoverChange}
                />
              ))}
            </Column>

            {remaining > 0 && (
              <MoreRow>
                <ButtonEl
                  type="button"
                  $variant="ghost"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  View more ({remaining} left)
                </ButtonEl>
              </MoreRow>
            )}
          </>
        ))}
    </section>
  );
}
