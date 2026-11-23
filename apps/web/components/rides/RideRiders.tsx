"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styled, { css } from "styled-components";
import { Drawer } from "@/components/ui/Drawer";
import { CaretRight, ChatCircle, NavigationArrow, Star } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { RollingNumber } from "@/components/ui/Counter";
import { Shimmer } from "@/components/ui/Shimmer";
import { createClient } from "@/lib/supabase/client";
import { useShareLocation } from "@/lib/trips/live";
import { formatCurrency } from "@/lib/trips/format";
import { dur, ease, nocturne } from "@/lib/nocturne";

const ChatPanel = dynamic(() => import("@/components/trips/ChatSheet"), { ssr: false });
const AS_DRIVER = "driver" as const;

type Rider = {
  bookingId: string;
  seats: number;
  name: string;
  avatarUrl: string | null;
  fare: number;
  payout: number | null;
  myScore: number | null;
};

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; riders: Rider[] };

const PaidTile = styled.section`
  display: grid;
  gap: 4px;
  padding: 20px;
  border-radius: 20px;
  background: ${({ theme }) => theme.tone.amber.bg};
  color: ${({ theme }) => theme.tone.amber.on};

  small {
    font-size: 13px;
    font-weight: 700;
  }
  .amount {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(32px, 3.6vw, 40px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .note {
    font-size: 14px;
    line-height: 20px;
  }
`;

const RidersCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 20px;
  border-radius: 20px;
  background: ${nocturne.surface};

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const List = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .who {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  b {
    font-weight: 700;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  small {
    font-size: 13px;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
`;

const RiderLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 12px 12px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: inherit;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .who {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  b {
    font-weight: 700;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  small {
    font-size: 13px;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
  > svg {
    flex: none;
    color: ${nocturne.muted};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerHigh};
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
`;

const RateTag = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};
  font-size: 14px;
  font-weight: 700;

  svg {
    color: ${nocturne.star};
  }
`;

const Rated = styled.span`
  display: grid;
  flex: none;
  justify-items: end;
  gap: 2px;

  small {
    font-size: 12px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
  .stars {
    display: inline-flex;
    gap: 2px;
    color: ${nocturne.star};
  }
`;

const pill = css`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
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
`;

const ShareButton = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ theme, $on }) => ($on ? nocturne.green : theme.tone.green.bg)};
  color: ${({ theme, $on }) => ($on ? nocturne.onGreen : theme.tone.green.on)};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
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
`;

const MessageButton = styled.button`
  ${pill}
  border: 0;
  font-family: inherit;
  cursor: pointer;
`;

async function loadRiders(tripId: string, viewerId: string, live: boolean): Promise<Rider[] | null> {
  const supabase = createClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, seats_booked, total_price, passenger:users!passenger_id ( full_name, avatar_url )")
    .eq("trip_id", tripId)
    .eq("status", live ? "in_progress" : "completed")
    .order("created_at", { ascending: true });
  if (error) return null;
  const ids = (bookings ?? []).map((b) => b.id as string);
  if (ids.length === 0) return [];

  const [payouts, ratings] = live
    ? [{ data: [] as { booking_id: string; amount: number }[] }, { data: [] as { booking_id: string; score: number }[] }]
    : await Promise.all([
    supabase.from("wallet_transactions").select("booking_id, amount").eq("type", "payout").in("booking_id", ids),
    supabase.from("ratings").select("booking_id, score").eq("from_user_id", viewerId).in("booking_id", ids),
  ]);
  const paid = new Map<string, number>();
  for (const p of payouts.data ?? []) paid.set(p.booking_id as string, Number(p.amount));
  const scored = new Map<string, number>();
  for (const r of ratings.data ?? []) scored.set(r.booking_id as string, Number(r.score));

  return (bookings ?? []).map((b) => {
    const person = (Array.isArray(b.passenger) ? b.passenger[0] : b.passenger) as
      | { full_name: string | null; avatar_url: string | null }
      | null;
    return {
      bookingId: b.id as string,
      seats: Number(b.seats_booked ?? 1),
      fare: Number(b.total_price ?? 0),
      name: person?.full_name?.trim() || "Passenger",
      avatarUrl: person?.avatar_url ?? null,
      payout: paid.get(b.id as string) ?? null,
      myScore: scored.get(b.id as string) ?? null,
    };
  });
}

function ShareMine({ tripId }: { tripId: string }) {
  const { state, retry } = useShareLocation(tripId, true);
  if (state !== "denied" && state !== "failed") return null;
  return (
    <ShareButton type="button" onClick={retry} $on={false}>
      <NavigationArrow size={20} weight="bold" aria-hidden />
      {state === "denied" ? "Allow location so passengers can see you" : "Location didn't send. Try again"}
    </ShareButton>
  );
}

export function RideRiders({ tripId, viewerId, live = false }: { tripId: string; viewerId: string; live?: boolean }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [chatWith, setChatWith] = useState<Rider | null>(null);
  const [shownChat, setShownChat] = useState<Rider | null>(null);
  const asked = useSearchParams()?.get("chat") ?? null;

  if (chatWith && chatWith !== shownChat) setShownChat(chatWith);

  useEffect(() => {
    if (!asked || load.state !== "ready") return;
    const hit = load.riders.find((r) => r.bookingId === asked);
    if (hit) setChatWith(hit);
    window.history.replaceState(null, "", window.location.pathname);
  }, [asked, load]);

  useEffect(() => {
    let alive = true;
    void loadRiders(tripId, viewerId, live).then((riders) => {
      if (!alive) return;
      setLoad(riders ? { state: "ready", riders } : { state: "error" });
    });
    return () => {
      alive = false;
    };
  }, [tripId, viewerId, live]);

  if (live) {
    const riders = load.state === "ready" ? load.riders : [];
    const fares = riders.reduce((sum, r) => sum + r.fare, 0);
    return (
      <>
        <ShareMine tripId={tripId} />
        <PaidTile aria-label="Paid for this ride">
          <small>Paid for this ride</small>
          {load.state === "loading" ? (
            <Shimmer $w="160px" $h="36px" $r="8px" />
          ) : (
            <b className="amount">
              <span>KES</span>
              <RollingNumber value={fares} />
            </b>
          )}
          {load.state === "ready" && riders.length > 0 ? (
            <span className="note">
              From <RollingNumber value={riders.length} /> {riders.length === 1 ? "passenger" : "passengers"} on board. It reaches your wallet, less the
              Kipita fee, when there is no dispute.
            </span>
          ) : null}
        </PaidTile>
        <RidersCard aria-label="On the road with you">
          <h2>On the road with you</h2>
          {load.state === "loading" ? (
            <List aria-hidden>
              {[0, 1].map((i) => (
                <Row key={i}>
                  <Shimmer $w="40px" $h="40px" $r="50%" />
                  <Shimmer $w="55%" $h="14px" $r="6px" />
                </Row>
              ))}
            </List>
          ) : load.state === "error" ? (
            <p role="alert">Passengers didn&apos;t load. Reload the page to try again.</p>
          ) : riders.length === 0 ? (
            <p>No passengers are on board.</p>
          ) : (
            <List>
              {riders.map((r) => (
                <Row key={r.bookingId}>
                  <Avatar name={r.name} src={r.avatarUrl} size={40} />
                  <span className="who">
                    <b>{r.name}</b>
                    <small>
                      {r.seats} {r.seats === 1 ? "seat" : "seats"} · on board
                    </small>
                  </span>
                  <MessageButton
                    type="button"
                    aria-label={`Message ${r.name}`}
                    aria-expanded={chatWith?.bookingId === r.bookingId}
                    onClick={() => setChatWith(r)}
                  >
                    <ChatCircle size={20} aria-hidden />
                    Message
                  </MessageButton>
                </Row>
              ))}
            </List>
          )}
        </RidersCard>
        <Drawer
          open={chatWith !== null}
          onClose={() => setChatWith(null)}
          title={chatWith ? chatWith.name : "Messages"}
          side
          fill
        >
          {shownChat ? (
            <ChatPanel
              key={shownChat.bookingId}
              open={chatWith !== null}
              bookingId={shownChat.bookingId}
              me={viewerId}
              otherName={shownChat.name}
              otherAvatar={shownChat.avatarUrl}
              role={AS_DRIVER}
              status="in_progress"
            />
          ) : null}
        </Drawer>
      </>
    );
  }

  const riders = load.state === "ready" ? load.riders : [];
  const paidOut = riders.reduce((sum, r) => sum + (r.payout ?? 0), 0);
  const onHold = riders.filter((r) => r.payout == null).length;
  const paidFares = riders.filter((r) => r.payout != null).reduce((sum, r) => sum + r.fare, 0);
  const fee = Math.max(0, paidFares - paidOut);

  return (
    <>
      <PaidTile aria-label="Paid out">
        <small>Paid out to your wallet</small>
        {load.state === "loading" ? (
          <Shimmer $w="160px" $h="36px" $r="8px" />
        ) : (
          <b className="amount">
            <span>KES</span>
            <RollingNumber value={paidOut} />
          </b>
        )}
        {load.state === "ready" && paidOut > 0 ? (
          <span className="note">
            From {formatCurrency(paidFares)} in fares{fee > 0 ? `, less ${formatCurrency(fee)} Kipita fee` : ""}
          </span>
        ) : null}
        {load.state === "ready" && onHold > 0 ? (
          <span className="note">
            {onHold} {onHold === 1 ? "fare is" : "fares are"} still on hold
          </span>
        ) : null}
      </PaidTile>

      <RidersCard aria-label="Who rode with you">
        <h2>Who rode with you</h2>
        {load.state === "loading" ? (
          <List aria-hidden>
            {[0, 1].map((i) => (
              <Row key={i}>
                <Shimmer $w="40px" $h="40px" $r="50%" />
                <Shimmer $w="55%" $h="14px" $r="6px" />
              </Row>
            ))}
          </List>
        ) : load.state === "error" ? (
          <p role="alert">Passengers didn&apos;t load. Reload the page to try again.</p>
        ) : riders.length === 0 ? (
          <p>No one finished this ride with you.</p>
        ) : (
          <List>
            {riders.map((r) => {
              const first = r.name.split(" ")[0];
              return (
                <li key={r.bookingId}>
                  <RiderLink
                    href={`/trips/${r.bookingId}`}
                    aria-label={
                      r.myScore
                        ? `${r.name}, you rated ${first} ${r.myScore} out of 5. Open trip`
                        : `Rate ${r.name}`
                    }
                  >
                    <Avatar name={r.name} src={r.avatarUrl} size={40} />
                    <span className="who">
                      <b>{r.name}</b>
                      <small>
                        {r.payout != null ? `${formatCurrency(r.payout)} to you` : "On hold"} · {r.seats}{" "}
                        {r.seats === 1 ? "seat" : "seats"}
                      </small>
                    </span>
                    {r.myScore ? (
                      <Rated aria-hidden>
                        <small>You rated</small>
                        <span className="stars">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={16} weight={n <= (r.myScore ?? 0) ? "fill" : "regular"} />
                          ))}
                        </span>
                      </Rated>
                    ) : (
                      <RateTag aria-hidden>
                        <Star size={16} weight="fill" />
                        Rate
                      </RateTag>
                    )}
                    <CaretRight size={20} aria-hidden />
                  </RiderLink>
                </li>
              );
            })}
          </List>
        )}
      </RidersCard>
    </>
  );
}
