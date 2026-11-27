"use client";

import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { ArrowClockwise, CaretRight, SealCheck, Star } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { RollingNumber } from "@/components/ui/Counter";
import { Drawer, DrawerBody } from "@/components/ui/Drawer";
import { Shimmer } from "@/components/ui/Shimmer";
import { NoReviewsArt } from "@/components/trips/TripsArt";
import { createClient } from "@/lib/supabase/client";
import { fetchReviews, shortName, type ReviewSummary } from "@/lib/ratings/reviews";
import { dur, ease, nocturne } from "@/lib/nocturne";

export type CardPerson = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  total_trips?: number | null;
};

const CardButton = styled.button`
  position: relative;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  padding: 20px;
  border: 0;
  border-radius: 20px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${nocturne.accent};
  }
`;

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  .avatar {
    flex: none;
  }
  .who {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(20px, 2.4vw, 26px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .verified {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.muted};

    &[data-on="true"] {
      color: ${nocturne.accent};
    }
  }
`;

const Stats = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;

  div {
    display: grid;
    gap: 2px;
    min-width: 0;
    padding: 12px 16px;
    border-radius: 16px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
  }
  dt {
    order: 2;
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
  dd {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 22px;
    font-weight: 800;
    line-height: 28px;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};

    svg {
      color: ${nocturne.star};
    }
  }
`;

const Summary = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px 24px;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .score {
    display: grid;
    justify-items: start;
    gap: 4px;
  }
  .big {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .based {
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.muted};
  }

  @media (max-width: 380px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Stars = styled.span`
  display: inline-flex;
  gap: 2px;
  color: ${nocturne.star};
`;

const Bars = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) 24px;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
  .track {
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    overflow: hidden;
  }
  .n {
    text-align: right;
  }
`;

const Fill = styled.span<{ $share: number }>`
  display: block;
  height: 100%;
  border-radius: inherit;
  background: ${nocturne.star};
  transform: scaleX(${({ $share }) => $share});
  transform-origin: left;
  transition: transform ${dur.enter} ${ease.enter};
`;

const List = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Item = styled.li`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: ${nocturne.surface};

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
  }
  .name {
    font-weight: 700;
    color: ${nocturne.cream};
  }
  time {
    font-size: 13px;
    color: ${nocturne.muted};
  }
  p {
    margin: 4px 0 0;
    font-size: 15px;
    line-height: 22px;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 24px 8px;
  text-align: center;

  .art {
    width: 100%;
    max-width: 220px;
  }
  h3 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    max-width: 32ch;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
`;

const Retry = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-top: 8px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    min-height: 48px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

function StarRow({ score, size = 16 }: { score: number; size?: 16 | 20 }) {
  return (
    <Stars aria-label={`${score} out of 5`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} weight={n <= Math.round(score) ? "fill" : "regular"} aria-hidden />
      ))}
    </Stars>
  );
}

function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

type Load = { state: "loading" } | { state: "error"; error: string } | { state: "ready"; data: ReviewSummary };

export function PersonCard({ person, label, role }: { person: CardPerson; label: string; role: "driver" | "passenger" }) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const name = person.full_name?.trim() || (role === "driver" ? "Kipita driver" : "Kipita passenger");
  const first = name.split(" ")[0];
  const trips = person.total_trips ?? 0;

  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoad({ state: "loading" });
      const result = await fetchReviews(createClient(), person.id);
      if (result.ok) setLoad({ state: "ready", data: result.data });
      else if (!quiet) setLoad({ state: "error", error: result.error });
    },
    [person.id],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ratings:${person.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ratings", filter: `to_user_id=eq.${person.id}` },
        () => void refresh(true),
      )
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [person.id, refresh]);

  const summary = load.state === "ready" ? load.data : null;

  return (
    <>
      <CardButton type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="top">
          <span>{label}</span>
          <span className="more">
            See reviews <CaretRight size={16} aria-hidden />
          </span>
        </span>
        <Identity>
          <Avatar className="avatar" name={name} src={person.avatar_url} size={56} />
          <span className="who">
            <b>{name}</b>
            <span className="verified" data-on={person.is_verified ? "true" : "false"}>
              <SealCheck size={16} weight={person.is_verified ? "fill" : "regular"} aria-hidden />
              {person.is_verified ? (role === "driver" ? "Verified driver" : "Verified") : "Not yet verified"}
            </span>
          </span>
        </Identity>
        <Stats>
          <div>
            <dt>
              {summary ? (summary.count > 0 ? `${summary.count} ${summary.count === 1 ? "review" : "reviews"}` : "No reviews yet") : "Reviews"}
            </dt>
            <dd>
              {load.state === "loading" ? (
                <Shimmer $w="56px" $h="20px" $r="6px" />
              ) : summary?.average != null ? (
                <>
                  <Star size={20} weight="fill" aria-hidden />
                  <RollingNumber value={summary.average} decimals={1} />
                </>
              ) : (
                "New"
              )}
            </dd>
          </div>
          <div>
            <dt>{trips === 1 ? "trip on Kipita" : "trips on Kipita"}</dt>
            <dd>
              <RollingNumber value={trips} />
            </dd>
          </div>
        </Stats>
      </CardButton>

      <Drawer open={open} onClose={() => setOpen(false)} title={`Reviews for ${first}`} side fill>
        <DrawerBody>
          {load.state === "loading" ? (
            <List aria-hidden>
              {[0, 1, 2].map((i) => (
                <Item key={i}>
                  <Shimmer $w="40px" $h="40px" $r="50%" />
                  <span>
                    <Shimmer $w="45%" $h="14px" $r="6px" />
                    <Shimmer $w="85%" $h="12px" $r="6px" />
                  </span>
                </Item>
              ))}
            </List>
          ) : load.state === "error" ? (
            <Empty role="alert">
              <h3>Reviews didn&apos;t load</h3>
              <p>{load.error}</p>
              <Retry type="button" onClick={() => void refresh()}>
                <ArrowClockwise size={20} aria-hidden /> Load reviews again
              </Retry>
            </Empty>
          ) : load.data.count === 0 ? (
            <Empty>
              <div className="art">
                <NoReviewsArt />
              </div>
              <h3>No reviews yet</h3>
              <p>
                {role === "driver"
                  ? `No reviews yet.`
                  : `No reviews yet.`}
              </p>
            </Empty>
          ) : (
            <>
              <Summary aria-label="Rating summary">
                <div className="score">
                  <span className="big">{load.data.average?.toFixed(1)}</span>
                  <StarRow score={load.data.average ?? 0} size={20} />
                  <span className="based">
                    {load.data.count} {load.data.count === 1 ? "review" : "reviews"}
                  </span>
                </div>
                <Bars>
                  {([5, 4, 3, 2, 1] as const).map((s) => {
                    const n = load.data.byScore[s];
                    return (
                      <li key={s} aria-label={`${s} stars: ${n}`}>
                        <span>{s}</span>
                        <span className="track">
                          <Fill $share={n / load.data.count} />
                        </span>
                        <span className="n">{n}</span>
                      </li>
                    );
                  })}
                </Bars>
              </Summary>
              <List>
                {load.data.reviews.map((r) => (
                  <Item key={r.id}>
                    <Avatar name={r.author?.full_name ?? "Kipita rider"} src={r.author?.avatar_url ?? null} size={40} />
                    <div>
                      <div className="head">
                        <span className="name">{shortName(r.author?.full_name)}</span>
                        <StarRow score={r.score} />
                        <time dateTime={r.created_at}>{reviewDate(r.created_at)}</time>
                      </div>
                      {r.comment ? <p>{r.comment}</p> : null}
                    </div>
                  </Item>
                ))}
              </List>
            </>
          )}
        </DrawerBody>
      </Drawer>
    </>
  );
}
