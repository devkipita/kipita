"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import {
  ArrowRight,
  CalendarSolid,
  ClockSolid,
  Lightning,
  Star,
  Users,
  VerifiedBadge,
} from "@/components/icons";
import { initials, resolveAvatarSrc } from "@/components/profile/Avatar";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { formatRideDate, formatRideTime } from "@/lib/ride-detail";
import { tierFor, urgencyFor, type UrgencyLevel } from "@/lib/home/standing";
import type { HomeRequest } from "@/lib/home/search";
import type { ToneName } from "@/lib/theme";
import { RideAmenities } from "./RideAmenities";

const MAX_AMENITIES = 3;

const rise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  50%      { box-shadow: 0 0 0 5px transparent; opacity: 0.82; }
`;

const sheen = keyframes`
  from { transform: translateX(-120%) skewX(-18deg); }
  to   { transform: translateX(320%) skewX(-18deg); }
`;

const Card = styled(Link)<{ $index: number }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(96px, 25%) 1fr;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  cursor: pointer;

  animation: ${rise} ${({ theme }) => theme.motion.duration.long1}
    ${({ theme }) => theme.motion.easing.emphasizedDecelerate} backwards;
  animation-delay: ${({ $index }) => Math.min($index, 5) * 70}ms;

  transition:
    background ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    border-radius ${({ theme }) => theme.motion.duration.short3}
      ${({ theme }) => theme.motion.easing.standard},
    transform ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized},
    box-shadow ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized};

  &:hover {
    background: ${({ theme }) => theme.color.elevatedHover};
    box-shadow: ${({ theme }) => theme.elevation[3]};
    transform: translateY(-3px);
  }
  &:hover .face img {
    transform: scale(1.05);
  }
  &:hover .act svg {
    transform: translateX(4px);
  }
  &:hover .sheen {
    animation: ${sheen} ${({ theme }) => theme.motion.duration.extraLong1}
      ${({ theme }) => theme.motion.easing.emphasized};
  }
  &:active {
    border-radius: ${({ theme }) => theme.radius.sm};
    transform: translateY(0) scale(0.985);
    box-shadow: ${({ theme }) => theme.elevation[1]};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(100px, 30%) 1fr;
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: background ${({ theme }) => theme.motion.duration.short4} linear;
    &:hover,
    &:active {
      transform: none;
      border-radius: ${({ theme }) => theme.radius.md};
    }
    &:hover .face img,
    &:hover .act svg {
      transform: none;
    }
    &:hover .sheen {
      animation: none;
    }
  }
`;

const Face = styled.div<{ $tone: ToneName }>`
  position: relative;
  overflow: hidden;
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform ${({ theme }) => theme.motion.duration.long2}
      ${({ theme }) => theme.motion.easing.emphasized};
  }
  .initials {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.title};
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .sheen {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.24),
      transparent
    );
    transform: translateX(-120%) skewX(-18deg);
    pointer-events: none;
  }

  @media (max-width: 430px) {
    aspect-ratio: 16 / 9;
  }
`;

const Shell = styled.div`
  position: relative;
  display: flex;
  min-width: 0;

  > a {
    flex: 1;
    min-width: 0;
  }
  &:hover .newarc {
    transform: rotate(-7deg) scale(1.07);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover .newarc {
      transform: none;
    }
  }
`;

const NewArc = styled.span`
  position: absolute;
  top: -32px;
  left: -18px;
  z-index: 4;
  width: 128px;
  height: 66px;
  pointer-events: none;
  transform-origin: 32% 82%;
  transition: transform ${({ theme }) => theme.motion.duration.medium4}
    ${({ theme }) => theme.motion.easing.spring};

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  text {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 21px;
    font-weight: 800;
    letter-spacing: 0.22em;
    fill: ${({ theme }) => theme.accent.lime.bold.bg};
    stroke: ${({ theme }) => theme.tone.lime.on};
    stroke-width: 5;
    paint-order: stroke;
    stroke-linejoin: round;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: ${({ theme }) => theme.space.lg};

  @media (max-width: 560px) {
    padding: ${({ theme }) => theme.space.md};
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  min-width: 0;

  .who {
    flex: 1 1 150px;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 600;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .name b {
    min-width: 0;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name svg {
    flex: none;
    color: ${({ theme }) => theme.color.info};
    --badge-knockout: ${({ theme }) => theme.color.elevated};
  }
  .trust {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 3px;
    font-size: ${({ theme }) => theme.type.micro};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    white-space: nowrap;
  }
  .trust svg {
    flex: none;
    color: ${({ theme }) => theme.color.warning};
  }
  .trust b {
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .tier {
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Seats = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 6px 12px 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.tone.lime.bg};
  color: ${({ theme }) => theme.tone.lime.on};
  box-shadow: inset 0 0 0 1.5px rgba(1, 51, 48, 0.24);
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;

  svg {
    flex: none;
  }
`;

const Route = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin: ${({ theme }) => theme.space.md} 0 ${({ theme }) => theme.space.sm};
  min-width: 0;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 600;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.color.onSurface};

  .town {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Facts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px ${({ theme }) => theme.space.md};
  min-width: 0;
`;

const Fact = styled.span<{ $hue: "date" | "time" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 500;
  color: ${({ theme }) => theme.color.onSurface};
  white-space: nowrap;

  svg {
    flex: none;
    color: ${({ theme, $hue }) =>
      $hue === "date" ? theme.color.info : theme.color.tertiary};
  }
`;

const TONE_BY_LEVEL: Record<UrgencyLevel, ToneName> = {
  soon: "peach",
  today: "amber",
  near: "blue",
  later: "surface",
};

const Countdown = styled.span<{ $level: UrgencyLevel }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 2px 9px 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $level }) => theme.tone[TONE_BY_LEVEL[$level]].bg};
  color: ${({ theme, $level }) => theme.tone[TONE_BY_LEVEL[$level]].on};
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 700;
  white-space: nowrap;

  svg {
    flex: none;
  }

  ${({ $level }) =>
    $level === "soon" &&
    css`
      animation: ${pulse} 1.8s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space.lg};
  min-width: 0;

  .chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1 1 58%;
    min-width: 0;
  }
  .none {
    font-size: ${({ theme }) => theme.type.micro};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Act = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  margin-left: auto;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  color: ${({ theme }) => theme.color.primary};

  svg {
    flex: none;
    transition: transform ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized};
  }
`;

export function RequestCard({
  item,
  index = 0,
  hovered = false,
  onHoverChange,
}: {
  item: HomeRequest;
  index?: number;
  hovered?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const arcId = useId();
  const person = item.person;
  const name = person?.full_name?.trim() || "Kipita passenger";
  const photo = resolveAvatarSrc(person?.avatar_url);

  const date = formatRideDate(item.preferred_date) ?? "Flexible";
  const time = formatRideTime(item.preferred_time);

  const seats = item.seats_needed;
  const seatLabel = `${seats} ${seats === 1 ? "seat" : "seats"} wanted`;

  const rating = person?.rating && person.rating > 0 ? person.rating : null;
  const trips = person?.total_trips ?? 0;
  const tier = tierFor(trips);

  const wants = item.preferences ?? {};
  const hasWants = Object.values(wants).some(Boolean);

  const [countdown, setCountdown] = useState<ReturnType<typeof urgencyFor>>(null);
  useEffect(() => {
    const tick = () =>
      setCountdown(urgencyFor(item.preferred_date, item.preferred_time, new Date()));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [item.preferred_date, item.preferred_time]);

  return (
    <Shell>
      {tier.key === "new" && (
        <NewArc className="newarc" aria-hidden="true">
          <svg viewBox="0 0 128 66">
            <path id={arcId} d="M 10 60 A 54 54 0 0 1 118 60" fill="none" />
            <text>
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                NEW
              </textPath>
            </text>
          </svg>
        </NewArc>
      )}
      <Card
      href={`/ride/${item.id}?kind=request`}
      $index={index}
      data-hovered={hovered ? "true" : "false"}
      onMouseEnter={() => onHoverChange?.(item.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(item.id)}
      onBlur={() => onHoverChange?.(null)}
      aria-label={
        `${name}, ${tier.name}, wants ${seatLabel} from ${item.from_location} ` +
        `to ${item.to_location}, ${date}${time ? `, ${time}` : ""}`
      }
    >
      <Face className="face" $tone={tier.tone}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className="initials">{initials(name)}</span>
        )}
        <span className="sheen" aria-hidden="true" />
      </Face>

      <Body>
        <Head>
          <span className="who">
            <span className="name">
              <b>{name}</b>
              {person?.is_verified && (
                <>
                  <VerifiedBadge size={16} />
                  <VisuallyHidden>Verified</VisuallyHidden>
                </>
              )}
            </span>
            <span className="trust">
              <Star size={12} weight="fill" aria-hidden="true" />
              {rating ? <b>{rating.toFixed(1)}</b> : <b>Unrated</b>}
              {tier.key !== "new" && <span className="tier">· {tier.name}</span>}
              {trips > 0 && <span>· {trips} trips</span>}
            </span>
          </span>
          <Seats>
            <Users size={12} />
            {seatLabel}
          </Seats>
        </Head>

        <Route>
          <span className="town">{item.from_location}</span>
          <ArrowRight size={15} aria-hidden="true" />
          <span className="town">{item.to_location}</span>
        </Route>

        <Facts>
          <Fact $hue="date">
            <CalendarSolid size={15} />
            <VisuallyHidden>Travelling</VisuallyHidden>
            {date}
          </Fact>
          {time && (
            <Fact $hue="time">
              <ClockSolid size={15} />
              <VisuallyHidden>Around</VisuallyHidden>
              {time}
            </Fact>
          )}
          {countdown && (
            <Countdown $level={countdown.level}>
              <Lightning size={11} weight="fill" />
              {countdown.label}
            </Countdown>
          )}
        </Facts>

        <Foot>
          <div className="chips">
            {hasWants ? (
              <RideAmenities preferences={wants} max={MAX_AMENITIES} />
            ) : (
              <span className="none">No preferences set</span>
            )}
          </div>
          <Act className="act">
            Offer a seat
            <ArrowRight size={15} aria-hidden="true" />
          </Act>
        </Foot>
      </Body>
      </Card>
    </Shell>
  );
}
