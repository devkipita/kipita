"use client";

import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { MapPin } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Swap } from "@/components/anim/Swap";
import { Notice } from "@/components/ui/primitives";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { dur, ease, nocturne } from "@/lib/nocturne";
import {
  isDisplayableImage,
  truncateWords,
  wasEdited,
} from "@/lib/alerts/meta";
import type { Alert } from "@/lib/alerts/types";
import { CategoryBadge } from "./CategoryBadge";
import { AlertActions } from "./AlertActions";
import { AlertEditor } from "./AlertEditor";
import { AlertOwnerMenu } from "./AlertOwnerMenu";

const Shell = styled.article`
  position: relative;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  box-shadow: ${({ theme }) =>
    theme.mode === "dark" ? "none" : "0 1px 2px rgba(18,48,31,0.08), 0 6px 16px rgba(18,48,31,0.08)"};
  overflow: hidden;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard},
    transform ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      border-color: ${({ theme }) => theme.color.outline};
      box-shadow: ${({ theme }) =>
        theme.mode === "dark"
          ? "none"
          : "0 2px 4px rgba(18,48,31,0.1), 0 12px 28px rgba(18,48,31,0.14)"};
      transform: translateY(-1px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const Body = styled(Link)<{ $owned?: boolean }>`
  display: block;
  padding: ${({ theme, $owned }) =>
    $owned
      ? `${theme.space.lg} 56px ${theme.space.md} ${theme.space.lg}`
      : `${theme.space.lg} ${theme.space.lg} ${theme.space.md}`};
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
    font-size: 0.8rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Text = styled.p`
  margin: 0;
  font-size: 0.93rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSoft};
  overflow-wrap: anywhere;

  em {
    font-style: normal;
    font-weight: 700;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Foot = styled.div`
  padding: 0 16px 14px;
`;

const MediaFrame = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 290px;
  isolation: isolate;

  .photo {
    position: absolute;
    inset: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .scrim {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.45) 0%,
      rgba(0, 0, 0, 0.05) 42%,
      rgba(0, 0, 0, 0.78) 100%
    );
  }
`;

const MediaLink = styled(Link)`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 14px 6px;
  color: ${nocturne.onGreen};
  text-decoration: none;

  .top {
    display: block;
  }
  .bottom {
    display: block;
  }
  .where {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    opacity: 0.9;
  }
  .body {
    display: block;
    margin-top: 4px;
    font-size: 0.95rem;
    line-height: 1.5;
    font-weight: 600;
    overflow-wrap: anywhere;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
  }
`;

const MediaFoot = styled.div`
  padding: 0 14px 12px;
`;

const Stamp = styled.span`
  flex: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.muted};
`;

const Edited = styled.span`
  flex: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.muted};
`;

const OwnerSlot = styled.div<{ $onMedia?: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  border-radius: 999px;
  background: ${({ $onMedia }) => ($onMedia ? nocturne.surface : "transparent")};
`;

const EditWrap = styled.div`
  padding: 14px 14px 10px;
`;

const MenuError = styled(Notice)`
  margin: 0 16px 14px;
`;

export function AlertCard({
  alert,
  viewerId,
  onChange,
  onRequireAuth,
  onDeleted,
}: {
  alert: Alert;
  viewerId: string | null;
  onChange?: (next: Alert) => void;
  onRequireAuth?: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const { body, truncated } = truncateWords(alert.content);
  const href = `/alerts/${alert.id}`;
  const author = alert.user?.full_name?.trim() || "Kipita user";
  const hasImage = isDisplayableImage(alert.image_url);
  const mine = viewerId != null && alert.user_id === viewerId;
  const edited = wasEdited(alert);

  const ownerMenu = mine ? (
    <OwnerSlot $onMedia={hasImage}>
      <AlertOwnerMenu
        alertId={alert.id}
        createdAt={alert.created_at}
        onEdit={() => {
          setMenuError(null);
          setEditing(true);
        }}
        onDeleted={() => onDeleted?.(alert.id)}
        onError={setMenuError}
      />
    </OwnerSlot>
  ) : null;

  const errorNote = menuError ? <MenuError role="alert">{menuError}</MenuError> : null;

  let view;
  if (editing) {
    view = (
      <EditWrap>
        <AlertEditor
          alert={alert}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            onChange?.(next);
            setEditing(false);
          }}
        />
      </EditWrap>
    );
  } else if (hasImage) {
    view = (
      <>
        {ownerMenu}
        <MediaFrame>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={alert.image_url as string} alt="" />
          <span className="scrim" />
          <MediaLink href={href}>
            <span className="top">
              <CategoryBadge category={alert.category} solid />
            </span>
            <span className="bottom">
              <span className="where">
                <MapPin size={12} /> {alert.location} ·{" "}
                {shortRelativeTime(alert.created_at)}
                {edited && " · Edited"}
              </span>
              <span className="body">
                {body}
                {truncated && " Read more"}
              </span>
            </span>
          </MediaLink>
          <MediaFoot>
            <AlertActions
              alert={alert}
              viewerId={viewerId}
              onMedia
              onChange={onChange}
              onRequireAuth={onRequireAuth}
            />
          </MediaFoot>
        </MediaFrame>
        {errorNote}
      </>
    );
  } else {
    view = (
      <>
        {ownerMenu}
        <Body href={href} $owned={mine}>
          <Head>
            <Avatar name={author} src={alert.user?.avatar_url} size={38} />
            <div className="who">
              <div className="name" title={author}>
                {author}
              </div>
              <div className="where">
                <MapPin size={12} /> {alert.location}
              </div>
            </div>
            <CategoryBadge category={alert.category} />
            <Stamp>{shortRelativeTime(alert.created_at)}</Stamp>
            {edited && <Edited>· Edited</Edited>}
          </Head>
          <Text>
            {body}
            {truncated && <em> Read more</em>}
          </Text>
        </Body>
        <Foot>
          <AlertActions
            alert={alert}
            viewerId={viewerId}
            onChange={onChange}
            onRequireAuth={onRequireAuth}
          />
        </Foot>
        {errorNote}
      </>
    );
  }

  return (
    <Shell>
      <Swap id={editing ? "edit" : "view"}>{view}</Swap>
    </Shell>
  );
}
