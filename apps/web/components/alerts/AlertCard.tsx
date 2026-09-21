"use client";

import Link from "next/link";
import styled from "styled-components";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { ALERT_META, isDisplayableImage, truncateWords } from "@/lib/alerts/meta";
import type { Alert } from "@/lib/alerts/types";
import { CategoryBadge } from "./CategoryBadge";
import { AlertEngagement } from "./AlertEngagement";

/**
 * One alert in the feed. Two layouts, as on mobile: an immersive media card
 * when the row has a usable photo, otherwise a comment-style row.
 *
 * The engagement bar is a SIBLING of the link, never a child — nesting buttons
 * inside an anchor is invalid and breaks keyboard navigation. Mobile's
 * AlertCard calls out the same constraint.
 */

const Shell = styled.article`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
`;

const Body = styled(Link)`
  display: block;
  padding: 16px 16px 10px;
  text-decoration: none;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  .who {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .where {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 1px;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Text = styled.p`
  margin: 0;
  font-size: 0.93rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSoft};

  em {
    font-style: normal;
    font-weight: 700;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Foot = styled.div`
  padding: 0 16px 14px;
`;

/* ── Media variant ── */

const Media = styled(Link)`
  position: relative;
  display: block;
  height: 220px;
  text-decoration: none;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.45) 0%,
      rgba(0, 0, 0, 0.05) 42%,
      rgba(0, 0, 0, 0.78) 100%
    );
  }
  .top {
    position: absolute;
    top: 14px;
    left: 14px;
  }
  /* Phrasing content only — this subtree lives inside an anchor. */
  .bottom {
    display: block;
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 58px;
    color: #fff;
  }
  .bottom .where {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    opacity: 0.86;
  }
  .bottom .body {
    display: block;
    margin-top: 4px;
    font-size: 0.95rem;
    line-height: 1.5;
    font-weight: 600;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
  }
`;

const MediaFoot = styled.div`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 12px;
  z-index: 1;
`;

const Stamp = styled.span`
  flex: none;
  font-size: 0.74rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.muted};
`;

export function AlertCard({
  alert,
  viewerId,
  onRequireAuth,
}: {
  alert: Alert;
  viewerId: string | null;
  onRequireAuth?: () => void;
}) {
  const meta = ALERT_META[alert.category] ?? ALERT_META.general;
  const { body, truncated } = truncateWords(alert.content);
  const href = `/alerts/${alert.id}`;
  const author = alert.user?.full_name?.trim() || meta.label;
  const hasImage = isDisplayableImage(alert.image_url);

  if (hasImage) {
    return (
      <Shell>
        <Media href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={alert.image_url as string} alt="" />
          <span className="scrim" />
          <span className="top">
            <CategoryBadge category={alert.category} solid />
          </span>
          <span className="bottom">
            <span className="where">
              <MapPin size={12} strokeWidth={2.6} /> {alert.location} ·{" "}
              {shortRelativeTime(alert.created_at)}
            </span>
            <span className="body">
              {body}
              {truncated && " Read more"}
            </span>
          </span>
        </Media>
        <MediaFoot>
          <AlertEngagement
            alert={alert}
            viewerId={viewerId}
            compact
            onMedia
            onRequireAuth={onRequireAuth}
          />
        </MediaFoot>
      </Shell>
    );
  }

  return (
    <Shell>
      <Body href={href}>
        <Head>
          <Avatar name={author} src={alert.user?.avatar_url} size={38} />
          <div className="who">
            <div className="name">{author}</div>
            <div className="where">
              <MapPin size={12} strokeWidth={2.6} /> {alert.location}
            </div>
          </div>
          <CategoryBadge category={alert.category} />
          <Stamp>{shortRelativeTime(alert.created_at)}</Stamp>
        </Head>
        <Text>
          {body}
          {truncated && <em> Read more</em>}
        </Text>
      </Body>
      <Foot>
        <AlertEngagement
          alert={alert}
          viewerId={viewerId}
          compact
          onRequireAuth={onRequireAuth}
        />
      </Foot>
    </Shell>
  );
}
