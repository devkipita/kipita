"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const DIGIT_HEIGHT = "1em";
const DIGIT_WIDTH = "1ch";
const DIGIT_REPEAT = 20;
const DIGIT_TRIM = "0.045ch";

const CounterRoot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 0;
  min-width: 0;
  max-width: 100%;
  min-height: 1em;
  padding-inline: ${DIGIT_TRIM};
  white-space: nowrap;
  font-variant-numeric: tabular-nums lining-nums;
`;

const DigitViewport = styled.span`
  position: relative;
  width: ${DIGIT_WIDTH};
  height: ${DIGIT_HEIGHT};
  overflow: hidden;
  flex: 0 0 ${DIGIT_WIDTH};
  margin-inline: calc(${DIGIT_TRIM} * -1);
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  );
`;

const DigitTrack = styled.span<{ $position: number; $duration: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  transform: translate3d(
    0,
    ${({ $position }) => `calc(${$position * -1} * ${DIGIT_HEIGHT})`},
    0
  );
  transition: transform ${({ $duration }) => $duration}ms
    cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
`;

const Digit = styled.span`
  width: ${DIGIT_WIDTH};
  height: ${DIGIT_HEIGHT};
  flex: 0 0 ${DIGIT_HEIGHT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: inherit;
  line-height: 1;
  transform: translateZ(0);
  backface-visibility: hidden;
`;

const StaticChar = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 1;
  margin-inline: calc(${DIGIT_TRIM} * -0.35);
  white-space: nowrap;
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

type RollingNumberProps = {
  value: number;
  decimals?: number;
  duration?: number;
  ariaLabel?: string;
};

function DigitWheel({
  position,
  duration,
  targetOffset,
}: {
  position: number;
  duration: number;
  targetOffset: string;
}) {
  const digits = Array.from({ length: DIGIT_REPEAT }, (_, index) => index % 10);

  return (
    <DigitViewport aria-hidden="true">
      <DigitTrack
        $position={position}
        $duration={duration}
        data-digit-track
        data-target-offset={targetOffset}
      >
        {digits.map((digit, index) => (
          <Digit key={index}>{digit}</Digit>
        ))}
      </DigitTrack>
    </DigitViewport>
  );
}

function buildFormattedValue(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function RollingNumber({
  value,
  decimals = 0,
  duration = 1600,
  ariaLabel,
}: RollingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const formattedValue = buildFormattedValue(value, decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        setHasStarted(true);
        observer.disconnect();
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <CounterRoot ref={ref} aria-label={ariaLabel}>
      {Array.from(formattedValue).map((char, index) => {
        if (!/\d/.test(char)) {
          return (
            <StaticChar key={`${char}-${index}`} aria-hidden="true">
              {char}
            </StaticChar>
          );
        }

        const position = Number(char);
        const targetOffset = `calc(${position * -1} * ${DIGIT_HEIGHT})`;

        return (
          <DigitWheel
            key={`${char}-${index}`}
            position={hasStarted ? position : 0}
            duration={hasStarted ? duration : 0}
            targetOffset={hasStarted ? targetOffset : "0px"}
          />
        );
      })}
      <SrOnly>{ariaLabel ?? formattedValue}</SrOnly>
    </CounterRoot>
  );
}

export default RollingNumber;
