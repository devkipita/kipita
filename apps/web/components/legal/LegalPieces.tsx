"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";
import { ArrowRight, CaretDown } from "@/components/icons";

const SectionBlock = styled.section`
  padding: 34px 0 6px;
  border-top: 1px solid ${nocturne.line2};
  margin-top: 34px;

  &:first-of-type {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
`;

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <SectionBlock aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </SectionBlock>
  );
}

export const Lead = styled.p`
  && {
    font-size: clamp(1.1rem, 2.2vw, 1.3rem);
    line-height: 1.6;
    color: ${nocturne.muted};
    margin-bottom: 26px;
  }
`;

const CalloutCard = styled.div`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin: 26px 0;
  padding: 22px;
  border: 1px solid ${nocturne.line2};
  border-radius: 18px;
  background: ${nocturne.surface2};

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
`;

const CalloutIcon = styled.span`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.sage};
`;

const CalloutBody = styled.div`
  h3 {
    margin: 2px 0 6px;
    font-size: 1.05rem;
  }

  p {
    margin: 0 0 10px;
    font-size: 0.97rem;
  }
`;

const CalloutLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${nocturne.accent};
  text-decoration: none;

  @media (hover: hover) {
    &:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }
`;

export function Callout({
  icon,
  title,
  children,
  href,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <CalloutCard>
      <CalloutIcon aria-hidden>{icon}</CalloutIcon>
      <CalloutBody>
        <h3>{title}</h3>
        <p>{children}</p>
        {href && action ? (
          <CalloutLink href={href}>
            {action}
            <ArrowRight size={15} />
          </CalloutLink>
        ) : null}
      </CalloutBody>
    </CalloutCard>
  );
}

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
  margin: 22px 0 26px;
`;

const PointCard = styled.div`
  padding: 20px;
  border: 1px solid ${nocturne.line2};
  border-radius: 16px;
  background: ${nocturne.surface};

  span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    margin-bottom: 14px;
    border-radius: 12px;
    background: ${nocturne.surface3};
    color: ${nocturne.sage};
  }

  h3 {
    margin: 0 0 6px;
    font-size: 1rem;
  }

  p {
    margin: 0;
    font-size: 0.94rem;
    line-height: 1.6;
  }
`;

export function Point({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <PointCard>
      <span aria-hidden>{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </PointCard>
  );
}

export const DataTable = styled.table`
  width: 100%;
  margin: 20px 0 26px;
  border-collapse: collapse;
  font-size: 0.95rem;

  caption {
    text-align: left;
    padding-bottom: 10px;
    font-size: 0.9rem;
    color: ${nocturne.muted3};
  }

  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 12px 14px 12px 0;
    border-bottom: 1px solid ${nocturne.line2};
    color: ${nocturne.muted};
    line-height: 1.6;
  }

  th {
    color: ${nocturne.cream};
    font-weight: 600;
    white-space: nowrap;
  }

  thead th {
    font-size: 0.82rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted3};
  }

  @media (max-width: 560px) {
    th,
    td {
      padding-right: 10px;
    }

    th {
      white-space: normal;
    }
  }
`;

const Details = styled.details`
  border-bottom: 1px solid ${nocturne.line2};

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 2px;
    cursor: pointer;
    list-style: none;
    font-size: 1.02rem;
    font-weight: 600;
    color: ${nocturne.cream};
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary svg {
    flex: none;
    color: ${nocturne.muted2};
    transition: transform ${dur.medium1}ms ${ease.standard};
  }

  &[open] summary svg {
    transform: rotate(180deg);
  }

  summary:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
    border-radius: 10px;
  }

  div {
    padding: 0 2px 20px;
  }

  div p:last-child {
    margin-bottom: 0;
  }
`;

export function Faq({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <Details>
      <summary>
        {question}
        <CaretDown size={18} />
      </summary>
      <div>{children}</div>
    </Details>
  );
}

export const Note = styled.p`
  && {
    margin: 22px 0 0;
    padding: 16px 18px;
    border-left: 3px solid ${nocturne.green};
    border-radius: 0 12px 12px 0;
    background: ${nocturne.surface2};
    font-size: 0.95rem;
    color: ${nocturne.muted2};
  }
`;
