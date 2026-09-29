"use client";

import styled from "styled-components";
import { Check } from "@/components/icons";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
`;

const Dot = styled.span<{ $state: "done" | "active" | "todo" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 8px;
  border-radius: 999px;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  flex: ${({ $state }) => ($state === "active" ? "0 0 34px" : "0 0 8px")};
  width: ${({ $state }) => ($state === "active" ? "34px" : "8px")};
  background: ${({ theme, $state }) =>
    $state === "todo" ? theme.color.line : theme.color.primary};
`;

const Meta = styled.span`
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.color.muted};
`;

/** Slim animated progress rail for the multi-step signup journey. */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <Wrap>
      {Array.from({ length: total }, (_, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return <Dot key={i} $state={state} aria-hidden />;
      })}
      <Meta>
        Step {Math.min(current + 1, total)} of {total}
      </Meta>
    </Wrap>
  );
}

export { Check as StepCheck };
