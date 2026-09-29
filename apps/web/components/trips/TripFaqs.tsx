"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowOut } from "@/components/icons";
import { TRIP_FAQS } from "@/lib/trips/copy";

const Panel = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  overflow: hidden;
`;

const Question = styled.details`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  }

  /* Title: display face, full-strength ink. */
  summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    min-height: 72px;
    padding: 18px 24px;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 1.4rem;
    font-weight: 500;
    letter-spacing: -0.022em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
  }
  summary:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }

  summary svg {
    flex: none;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    transition: transform 0.22s ease, color 0.22s ease;
  }
  summary:hover svg {
    color: ${({ theme }) => theme.color.primary};
  }
  /* The same arrow, turned a quarter — the state changes without swapping mark. */
  &[open] summary svg {
    transform: rotate(90deg);
    color: ${({ theme }) => theme.color.primary};
  }

  /* Body: text face, lighter weight, one tonal step down. */
  p {
    margin: 0;
    padding: 0 24px 24px;
    font-family: ${({ theme }) => theme.font};
    font-size: 1rem;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.7;
    max-width: 64ch;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }

  @media (prefers-reduced-motion: reduce) {
    summary svg {
      transition: none;
    }
  }
`;

/* The one place the outward arrow belongs: this genuinely leaves the page. */
const More = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 15px 18px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.primary};
  border-radius: ${({ theme }) => theme.radius.xs};

  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
`;

export function TripFaqs() {
  return (
    <Panel>
      {TRIP_FAQS.map((f) => (
        <Question key={f.q}>
          <summary>
            {f.q}
            <ArrowOut size={30} />
          </summary>
          <p>{f.a}</p>
        </Question>
      ))}
      <More href="/help#faq">
        All help articles <ArrowOut size={16} />
      </More>
    </Panel>
  );
}
