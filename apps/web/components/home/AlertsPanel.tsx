"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Megaphone, Plus } from "lucide-react";
import { ButtonEl } from "@/components/ui/primitives";
import { AlertCard } from "@/components/alerts/AlertCard";
import type { Alert } from "@/lib/alerts/types";

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg} 0 0;
  background: ${({ theme }) => theme.color.bgAlt};
  padding: 20px 16px 28px;
  margin: 8px -16px -40px;

  @media (min-width: 720px) {
    border-radius: ${({ theme }) => theme.radius.lg};
    margin: 8px 0 0;
    padding: 22px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1.12rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
`;

const SeeAll = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
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
  gap: 12px;
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 34px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.muted};

  svg {
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 32ch;
    font-size: 0.88rem;
    line-height: 1.5;
  }
`;

/**
 * Band 4 — a preview of the road-alerts feed, mirroring the panel that occupies
 * the bottom of the mobile home screen. The full feed lives at `/alerts`.
 */
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
    <Panel>
      <Head>
        <h2>Road alerts</h2>
        <ButtonEl type="button" $compact $variant="light" onClick={onPost}>
          <Plus size={16} strokeWidth={2.6} /> Post
        </ButtonEl>
        <SeeAll href="/alerts">
          See all <ArrowRight size={15} strokeWidth={2.6} />
        </SeeAll>
      </Head>

      {alerts.length === 0 ? (
        <Empty>
          <Megaphone size={26} strokeWidth={2} />
          <b>Quiet out there</b>
          <p>No alerts reported nearby. Post one if you spot something.</p>
        </Empty>
      ) : (
        <List>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} viewerId={viewerId} />
          ))}
        </List>
      )}
    </Panel>
  );
}
