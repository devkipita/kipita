"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import {
  Camera,
  CaretRight,
  Eye,
  Heart,
  Megaphone,
  Prohibit,
  Users,
  TrendUp,
} from "@/components/icons";
import { RollingNumber } from "@/components/ui/Counter";
import { OPEN_ALERT_EVENT } from "@/lib/alerts/meta";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const AsidePanel = styled.section`
  display: grid;
  gap: 2px;
  margin-bottom: 16px;
  padding: 4px;
  border-radius: 16px;
  background: ${nocturne.surface};
`;

export const AsideHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 12px 8px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const pressRow = css`
  border-radius: 12px;
  color: ${nocturne.cream};
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    background-color: color-mix(in oklab, ${nocturne.cream} 12%, transparent);
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

const RoadLink = styled(Link)`
  ${pressRow}
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px;

  .text {
    min-width: 0;
  }
  b {
    display: block;
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    display: block;
    overflow: hidden;
    font-size: 13px;
    line-height: 20px;
    color: ${nocturne.muted};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > svg {
    color: ${nocturne.muted};
  }
`;

const Count = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.warningContainer};
  color: ${({ theme }) => theme.color.onWarningContainer};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const Rules = styled.ul`
  display: grid;
  margin: 0;
  padding: 0 4px 8px;
  list-style: none;
`;

const Rule = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  &.stop svg {
    color: ${nocturne.danger};
  }
`;

const POSTING_RULES = [
  { key: "kind", icon: Heart, text: "Be kind to everyone on the road" },
  { key: "stop", icon: Prohibit, text: "No insults, hate or threats" },
  { key: "true", icon: Eye, text: "Only share what you saw yourself" },
  { key: "private", icon: Camera, text: "Keep faces and private plates out" },
  { key: "ads", icon: Megaphone, text: "No adverts or spam" },
] as const;

export function PostingGuide() {
  return (
    <AsidePanel aria-labelledby="alerts-guide">
      <AsideHeading id="alerts-guide">
        <Users size={20} aria-hidden />
        Keep it respectful
      </AsideHeading>
      <Rules>
        {POSTING_RULES.map((r) => {
          const Icon = r.icon;
          return (
            <Rule key={r.key} className={r.key === "stop" ? "stop" : undefined}>
              <Icon size={20} aria-hidden />
              {r.text}
            </Rule>
          );
        })}
      </Rules>
    </AsidePanel>
  );
}


export type TrendingRoad = {
  road: string;
  count: number;
  blurb: string | null;
  alertId: string;
};

export function AlertsAside({ trending }: { trending: TrendingRoad[] }) {
  return (
    <>
      {trending.length > 0 && (
        <AsidePanel aria-labelledby="alerts-trending">
          <AsideHeading id="alerts-trending">
            <TrendUp size={20} aria-hidden />
            What&rsquo;s happening on the roads
          </AsideHeading>
          {trending.map((t) => (
            <RoadLink
              key={t.road}
              href={`/alerts/${t.alertId}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                window.dispatchEvent(new CustomEvent(OPEN_ALERT_EVENT, { detail: t.alertId }));
              }}
              aria-label={`${t.road}, ${t.count} ${t.count === 1 ? "alert" : "alerts"}`}
            >
              <span className="text">
                <b>{t.road}</b>
                {t.blurb && <small>{t.blurb}</small>}
              </span>
              <Count>
                <RollingNumber value={t.count} /> {t.count === 1 ? "alert" : "alerts"}
              </Count>
              <CaretRight size={16} aria-hidden />
            </RoadLink>
          ))}
        </AsidePanel>
      )}

      <PostingGuide />
    </>
  );
}
