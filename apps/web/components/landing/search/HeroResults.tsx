"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import { nocturne } from "../nocturne";
import { RideResults } from "./RideResults";
import { useSharedRideSearch } from "./RideSearchContext";

const Section = styled.section`
  /* Clears the fixed landing nav when scrolled into view. */
  scroll-margin-top: 84px;
  padding: clamp(40px, 6vw, 80px) clamp(16px, 5vw, 72px);
  background: ${nocturne.bg};
`;

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  h2 {
    margin: 0;
    font-size: clamp(28px, 3.4vw, 44px);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 16px;
    color: ${nocturne.muted};
  }
  b {
    font-weight: 600;
    color: ${nocturne.sage};
  }
`;

const Panel = styled.div`
  padding: clamp(16px, 2.4vw, 26px);
  border-radius: 28px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
`;

function dayText(when: { mode: "now" } | { mode: "schedule"; date: string }) {
  if (when.mode === "now") return "Today";
  return new Date(`${when.date}T00:00:00`).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Rides matching the hero search, shown as their own section under the hero. */
export function HeroResults() {
  const { phase, outcome, from, to, when, seats } = useSharedRideSearch();
  const ref = useRef<HTMLElement>(null);

  // Bring the results into view each time a search starts.
  useEffect(() => {
    if (phase !== "searching") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({
      behavior: calm ? "auto" : "smooth",
      block: "start",
    });
  }, [phase]);

  if (phase === "idle") return null;

  const route = [from.trim(), to.trim()].filter(Boolean).join(" → ");

  return (
    <Section ref={ref} id="results" aria-live="polite">
      <Inner>
        <Head>
          <h2>Available rides</h2>
          <p>
            <b>{route}</b> · {dayText(when)} · {seats}{" "}
            {seats === 1 ? "passenger" : "passengers"}
          </p>
        </Head>
        <Panel>
          <RideResults phase={phase} outcome={outcome} from={from} to={to} />
        </Panel>
      </Inner>
    </Section>
  );
}
