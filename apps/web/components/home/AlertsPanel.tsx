"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Megaphone, Plus } from "@/components/icons";
import { ButtonEl } from "@/components/ui/primitives";
import { AlertCard } from "@/components/alerts/AlertCard";
import { HOME_COPY } from "@/lib/home/copy";
import type { Alert } from "@/lib/alerts/types";

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
`;

const SeeAll = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  color: ${({ theme }) => theme.color.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 4px;
  color: ${({ theme }) => theme.color.textSoft};

  svg {
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
    margin: 2px 0 0;
    max-width: 44ch;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.5;
  }
`;

export function AlertsPanel({
  alerts,
  viewerId,
  onPost,
}: {
  alerts: Alert[];
  viewerId: string | null;
  onPost: () => void;
}) {
  return (
    <section>
      <Head>
        <h2>{HOME_COPY.alertsTitle}</h2>
        <ButtonEl type="button" $compact $variant="light" onClick={onPost}>
          <Plus size={16} /> Post
        </ButtonEl>
        <SeeAll href="/alerts">
          {HOME_COPY.alertsSeeAll} <ArrowRight size={15} />
        </SeeAll>
      </Head>

      {alerts.length === 0 ? (
        <Empty>
          <Megaphone size={24} />
          <span>
            <b>{HOME_COPY.emptyAlerts}</b>
            <p>{HOME_COPY.emptyAlertsBody}</p>
          </span>
        </Empty>
      ) : (
        <List>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} viewerId={viewerId} />
          ))}
        </List>
      )}
    </section>
  );
}
