"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { ArrowClockwise, MapPin, SealCheck, X } from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Chip, IconAction } from "@/components/ui/Chip";
import { shortName } from "@kipita/shared";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { isDisplayableImage, truncateWords, wasEdited } from "@/lib/alerts/meta";
import type { Alert } from "@/lib/alerts/types";
import { CategoryBadge } from "./CategoryBadge";
import { AlertActions } from "./AlertActions";
import { AlertEditor } from "./AlertEditor";
import { AlertOwnerMenu } from "./AlertOwnerMenu";
import { VerifiedMark } from "./VerifiedMark";
import { AnonAvatar } from "./AnonAvatar";
import { ClearedTag } from "./ClearedTag";
import { useIsUnseenAlert } from "@/lib/alerts/unseen";
import { alertStatus } from "@/lib/alerts/status";

const Shell = styled.article`
  position: relative;
  overflow: clip;
  border-radius: 16px;
  background: ${nocturne.surface};
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:has(.title:hover) {
      box-shadow: inset 0 0 0 999px color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:has(.title:active) {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    &:has(.title:active) {
      transform: none;
    }
  }
`;

const Media = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  max-height: 320px;
  width: 100%;
  background: ${nocturne.surface3};

  &[data-cleared="true"] img {
    filter: grayscale(0.9);
  }
  img {
    object-fit: cover;
  }
`;

const Inner = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;

  .meta {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .owner {
    position: relative;
    z-index: 1;
    margin: -4px -8px -4px 0;
  }
`;

const Place = styled.div`
  display: grid;
  gap: 4px;

  h3 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .road {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: ${nocturne.muted};

    svg {
      flex: none;
    }
  }
`;

const TitleLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  border-radius: 4px;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    transition: background-color ${dur.state} ${ease.standard};
  }
  &:focus-visible {
    outline: none;
  }
  &:focus-visible::after {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
  }
  &:active::after {
    background-color: color-mix(in oklab, ${nocturne.cream} 4%, transparent);
  }
`;

const Text = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 22px;
  color: ${nocturne.cream};
  overflow-wrap: anywhere;
  white-space: pre-line;

  &[data-cleared="true"] {
    color: ${nocturne.muted};
  }
`;

const NewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  flex: none;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
`;

const Author = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${nocturne.muted};

  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Foot = styled.div`
  position: relative;
  z-index: 1;
  padding-top: 16px;
`;


const Outgoing = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 13px;
  color: ${nocturne.muted};

  .sending {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .failed {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    color: ${nocturne.danger};
  }
`;

function splitPlace(location: string) {
  const [place, ...rest] = location.split(",");
  return { place: place.trim() || location, road: rest.join(",").trim() };
}

function storageHosted(url: string) {
  return /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url);
}

export function AlertCard({
  alert,
  viewerId,
  onChange,
  onRequireAuth,
  onDeleted,
  onDeleteFailed,
  onReply,
  onSeen,
  outgoing,
}: {
  alert: Alert;
  viewerId: string | null;
  onChange?: (next: Alert) => void;
  onRequireAuth?: () => void;
  onDeleted?: (id: string) => void;
  onDeleteFailed?: (alert: Alert, message: string) => void;
  onReply?: (alert: Alert) => void;
  onSeen?: (id: string) => void;
  outgoing?: {
    state: "sending" | "failed";
    error?: string;
    preview: string | null;
    onRetry: () => void;
    onDiscard: () => void;
  };
}) {
  const [editing, setEditing] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const seenRef = useRef(onSeen);

  useEffect(() => {
    seenRef.current = onSeen;
  });

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seenRef.current?.(alert.id);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [alert.id]);
  const { body } = truncateWords(alert.content);
  const href = `/alerts/${alert.id}`;
  const author = shortName(alert.user?.full_name);
  const image = outgoing?.preview ?? (isDisplayableImage(alert.image_url) ? alert.image_url : null);
  const mine = viewerId != null && alert.user_id === viewerId;
  const edited = wasEdited(alert);
  const unseen = useIsUnseenAlert(alert.id);
  const cleared = alertStatus(alert) === "cleared";
  const { place, road } = splitPlace(alert.location);

  const view = editing ? (
    <Inner>
      <AlertEditor
        alert={alert}
        onCancel={() => setEditing(false)}
        onSaved={(next) => {
          onChange?.(next);
          setEditing(false);
        }}
      />
    </Inner>
  ) : (
    <>
      {image && (
        <Media data-cleared={cleared}>
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            unoptimized={Boolean(outgoing?.preview) || !storageHosted(image)}
          />
        </Media>
      )}
      <Inner>
        <Head>
          <CategoryBadge category={alert.category} />
          {cleared && <ClearedTag />}
          {unseen && <NewBadge title="You haven't opened this alert yet">New</NewBadge>}
          <span className="meta">
            <time dateTime={alert.created_at}>{shortRelativeTime(alert.created_at)}</time>
            {edited && " · Edited"}
          </span>
          {mine && !outgoing && (
            <span className="owner">
              <AlertOwnerMenu
                alertId={alert.id}
                createdAt={alert.created_at}
                onEdit={() => {
                  setEditing(true);
                }}
                onDeleted={() => onDeleted?.(alert.id)}
                onDeleteFailed={(message) => onDeleteFailed?.(alert, message)}
              />
            </span>
          )}
        </Head>

        <Place>
          <h3>
            {outgoing ? (
              place
            ) : (
            <TitleLink
              className="title"
              href={href}
              onClick={(e) => {
                if (!onReply || e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onReply(alert);
              }}
            >
              {place}
            </TitleLink>
            )}
          </h3>
          {road && (
            <span className="road">
              <MapPin size={16} aria-hidden />
              {road}
            </span>
          )}
        </Place>

        <Text data-cleared={cleared}>{body}</Text>

        <Author>
          <AnonAvatar id={alert.user?.id} size={24} />
          <span className="name">{author}</span>
          <VerifiedMark verified={alert.user?.is_verified} />
          {alert.user?.trusted_reporter && (
            <SealCheck size={16} weight="fill" aria-label="Trusted reporter" />
          )}
        </Author>


        <Foot>
          {outgoing ? (
            <Outgoing>
              {outgoing.state === "sending" ? (
                <span className="sending" role="status">
                  <ButtonOrb job="committing" on="surface" /> Posting
                </span>
              ) : (
                <>
                  <span className="failed" role="alert">
                    {outgoing.error ?? "Not posted"}
                  </span>
                  <Chip type="button" $tone="primary" onClick={outgoing.onRetry}>
                    <ArrowClockwise size={16} aria-hidden />
                    Retry posting
                  </Chip>
                  <IconAction type="button" onClick={outgoing.onDiscard} aria-label="Discard alert" title="Discard alert">
                    <X size={20} aria-hidden />
                  </IconAction>
                </>
              )}
            </Outgoing>
          ) : (
            <AlertActions
              alert={alert}
              viewerId={viewerId}
              onChange={onChange}
              onRequireAuth={onRequireAuth}
              onComment={onReply ? () => onReply(alert) : undefined}
            />
          )}
        </Foot>
      </Inner>
    </>
  );

  return (
    <Shell ref={shellRef}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={editing ? "edit" : "view"}
          initial={{ opacity: 0, filter: "blur(2px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: tween.enter }}
          exit={{ opacity: 0, transition: tween.exit }}
        >
          {view}
        </m.div>
      </AnimatePresence>
    </Shell>
  );
}
