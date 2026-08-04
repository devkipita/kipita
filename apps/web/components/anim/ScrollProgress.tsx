"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";

const Bar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  width: 100%;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.primary},
    ${({ theme }) => theme.color.tan}
  );
  transform: scaleX(0);
  transform-origin: 0 50%;
  z-index: 100;
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

/** Thin brand-green bar at the top that fills with scroll progress. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      el.style.transform = `scaleX(${p})`;
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <Bar ref={ref} aria-hidden />;
}
