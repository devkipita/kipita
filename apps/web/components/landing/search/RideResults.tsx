"use client";

import styled, { keyframes } from "styled-components";
import { ArrowRight, Star, Users } from "lucide-react";
import { nocturne } from "../nocturne";
import {
  formatKes,
  formatWhen,
  type Ride,
  type SearchOutcome,
} from "@/lib/rides";
import type { SearchPhase } from "./useRideSearch";

const rise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -320px 0; }
  100% { background-position: 320px 0; }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ResultHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${nocturne.sage};
  }

  span {
    font-size: 14px;
    color: ${nocturne.muted3};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 16px;
`;

const Card = styled.article<{ $i: number }>`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-radius: 22px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  animation: ${rise} 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: ${({ $i }) => $i * 0.06}s;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: ${nocturne.green};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: ${nocturne.greenDeep};
  color: ${nocturne.sage};
  font-size: 14px;
  font-weight: 700;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Who = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  b {
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.cream};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: ${nocturne.muted3};
  }

  svg {
    color: ${nocturne.tan};
  }
`;

const Route = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RouteCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  small {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${nocturne.muted3};
  }
  b {
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RouteArrow = styled.div`
  flex: 1;
  height: 1px;
  position: relative;
  background: repeating-linear-gradient(
    to right,
    ${nocturne.line} 0 6px,
    transparent 6px 12px
  );

  svg {
    position: absolute;
    right: -2px;
    top: 50%;
    transform: translateY(-50%);
    color: ${nocturne.green};
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid ${nocturne.line2};
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  b {
    font-size: 18px;
    font-weight: 700;
    color: ${nocturne.lime};
  }
  span {
    font-size: 12px;
    color: ${nocturne.muted3};
  }
`;

const Seats = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.sage};
  font-size: 12px;
  font-weight: 600;
`;

/* ── Skeletons ── */
const SkelCard = styled.div`
  height: 176px;
  border-radius: 22px;
  border: 1px solid ${nocturne.line};
  background: linear-gradient(
    90deg,
    ${nocturne.surface} 0px,
    #1d1d1d 160px,
    ${nocturne.surface} 320px
  );
  background-size: 640px 100%;
  animation: ${shimmer} 1.15s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ── Empty state ── centered, minimal copy. Sage/tan palette only (no lime),
   per the design direction. */
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  max-width: 560px;
  margin: 0 auto;
  padding: 20px 16px;
  animation: ${rise} 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const EmptyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(158, 197, 162, 0.32);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${nocturne.sage};

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${nocturne.sage};
  }
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: clamp(30px, 4.2vw, 52px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};

  .from {
    color: ${nocturne.sage};
  }
  .to {
    color: ${nocturne.tan};
  }
  svg {
    color: ${nocturne.muted3};
    vertical-align: middle;
    margin: 0 4px;
  }
`;

const EmptyLead = styled.p`
  margin: 0;
  max-width: 38ch;
  font-size: 16px;
  line-height: 1.55;
  color: ${nocturne.muted2};
`;

const RequestBtn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 15px 28px;
  border-radius: 999px;
  background: ${nocturne.sage};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: ${nocturne.tan};
    transform: translateY(-1px);
  }
`;

const EmptyNote = styled.span`
  font-size: 13px;
  color: ${nocturne.muted3};
`;

const DemoNote = styled.span`
  font-size: 12px;
  color: ${nocturne.muted3};
`;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function RideCard({ ride, i }: { ride: Ride; i: number }) {
  return (
    <Card $i={i}>
      <CardTop>
        <Avatar>
          {ride.driverAvatar ? (
            <img src={ride.driverAvatar} alt="" />
          ) : (
            initials(ride.driverName)
          )}
        </Avatar>
        <Who>
          <b>{ride.driverName}</b>
          <span>
            <Star size={13} fill="currentColor" strokeWidth={0} />
            {ride.driverRating > 0 ? ride.driverRating.toFixed(1) : "New"}
            {ride.driverTrips > 0 ? ` · ${ride.driverTrips} trips` : ""}
          </span>
        </Who>
      </CardTop>

      <Route>
        <RouteCol>
          <small>From</small>
          <b>{ride.from}</b>
        </RouteCol>
        <RouteArrow>
          <ArrowRight size={16} />
        </RouteArrow>
        <RouteCol>
          <small>To</small>
          <b>{ride.to}</b>
        </RouteCol>
      </Route>

      <Foot>
        <Meta>
          <b>{formatKes(ride.price)}</b>
          <span>{formatWhen(ride.date, ride.time)}</span>
        </Meta>
        <Seats>
          <Users size={14} />
          {ride.seatsAvailable}{" "}
          {ride.seatsAvailable === 1 ? "seat" : "seats"}
        </Seats>
      </Foot>
    </Card>
  );
}

export function RideResults({
  phase,
  outcome,
  from,
  to,
}: {
  phase: SearchPhase;
  outcome: SearchOutcome | null;
  from: string;
  to: string;
}) {
  const route = `${from || "your town"} → ${to}`;

  if (phase === "searching") {
    return (
      <Panel>
        <ResultHead>
          <h3>Searching {route}…</h3>
        </ResultHead>
        <Grid>
          {[0, 1, 2].map((i) => (
            <SkelCard key={i} />
          ))}
        </Grid>
      </Panel>
    );
  }

  if (phase !== "settled" || !outcome) return null;

  if (outcome.status === "empty") {
    return (
      <Panel>
        <Empty>
          <EmptyBadge>
            <i />
            No rides yet
          </EmptyBadge>
          <EmptyTitle>
            Nothing on <span className="from">{from || "your town"}</span>
            <ArrowRight size={28} />
            <span className="to">{to}</span> yet
          </EmptyTitle>
          <EmptyLead>
            Be first on this route — request it and we&apos;ll match you with a
            driver heading your way.
          </EmptyLead>
          <RequestBtn href="#download">
            Request this ride
            <ArrowRight size={17} />
          </RequestBtn>
          <EmptyNote>You only pay once a driver accepts.</EmptyNote>
        </Empty>
      </Panel>
    );
  }

  const { rides } = outcome;
  const isDemo = outcome.status === "demo";

  return (
    <Panel>
      <ResultHead>
        <h3>
          {rides.length} {rides.length === 1 ? "ride" : "rides"} on {route}
        </h3>
        {isDemo ? <DemoNote>Sample rides · live results coming</DemoNote> : null}
      </ResultHead>
      <Grid>
        {rides.map((ride, i) => (
          <RideCard key={ride.id} ride={ride} i={i} />
        ))}
      </Grid>
    </Panel>
  );
}
