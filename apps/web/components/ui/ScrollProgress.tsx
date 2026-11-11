"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

const Rail = styled.div`
  position: fixed;
  z-index: 60;
  top: var(--sticky-top, 0px);
  left: 0;
  right: 0;
  height: 3px;
  background: color-mix(in oklab, var(--n-accent) 16%, transparent);
  pointer-events: none;

  i {
    display: block;
    height: 100%;
    transform: scaleX(0);
    transform-origin: 0 50%;
    background: linear-gradient(
      90deg,
      ${nocturne.accent},
      ${nocturne.ctaBg}
    );
    will-change: transform;
  }
`;

export function ScrollProgress() {
  const fill = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = fill.current;
      if (!el) return;

      const scrolled = window.scrollY;
      const height =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? Math.min(1, Math.max(0, scrolled / height)) : 0;
      el.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <Rail aria-hidden>
      <i ref={fill} />
    </Rail>
  );
}
