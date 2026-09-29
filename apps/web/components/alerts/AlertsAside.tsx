"use client";

import Link from "next/link";
import styled from "styled-components";
import {
  ArrowRight,
  CaretRight as ChevronRight,
  TrendUp as TrendingUp,
} from "@/components/icons";
import { AlertsSearch } from "./AlertsSearch";

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  margin-bottom: 16px;
  overflow: hidden;

  > h2 {
    margin: 0;
    padding: 14px 16px 10px;
    font-size: 1.02rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  > h2 svg {
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Row = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 16px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
  }

  b {
    display: block;
    font-size: 0.92rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    display: block;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.textSoft};
  }
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Question = styled.details`
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};

  summary {
    list-style: none;
    cursor: pointer;
    padding: 12px 16px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary svg {
    flex: none;
    color: ${({ theme }) => theme.color.textSoft};
    transition: transform 0.18s ease;
  }
  &[open] summary svg {
    transform: rotate(90deg);
  }
  p {
    margin: 0;
    padding: 0 16px 14px;
    font-size: 0.86rem;
    line-height: 1.5;
    max-width: 65ch;
    color: ${({ theme }) => theme.color.textSoft};
  }

  @media (prefers-reduced-motion: reduce) {
    summary svg {
      transition: none;
    }
  }
`;

const Foot = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.primary};

  &:hover {
    text-decoration: underline;
  }
`;

export type TrendingRoad = {
  road: string;
  count: number;
  blurb: string | null;
  alertId: string;
};

export type AsideFaq = {
  id: string;
  question: string;
  answer: string;
};

export function AlertsAside({
  trending,
  faqs,
}: {
  trending: TrendingRoad[];
  faqs: AsideFaq[];
}) {
  return (
    <>
      <AlertsSearch />

      {trending.length > 0 && (
        <Panel>
          <h2>
            <TrendingUp size={17} />
            What’s happening on the roads
          </h2>
          {trending.map((t) => (
            <Row key={t.road} href={`/alerts/${t.alertId}`}>
              <span>
                <b>{t.road}</b>
                <small>
                  {t.count} {t.count === 1 ? "alert" : "alerts"}
                  {t.blurb ? ` · ${t.blurb}` : ""}
                </small>
              </span>
              <ArrowRight size={15} />
            </Row>
          ))}
        </Panel>
      )}

      {faqs.length > 0 && (
        <Panel>
          <h2>Good to know</h2>
          {faqs.map((f) => (
            <Question key={f.id}>
              <summary>
                {f.question}
                <ChevronRight size={16} />
              </summary>
              <p>{f.answer}</p>
            </Question>
          ))}
          <Foot href="/help#faq">
            More answers <ArrowRight size={14} />
          </Foot>
        </Panel>
      )}
    </>
  );
}
