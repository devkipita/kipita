"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const Video = styled.video<{ $ready: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: ${({ $ready }) => ($ready ? 1 : 0)};
  transition: opacity 0.9s ease;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

type Connection = { saveData?: boolean; effectiveType?: string };

const SRC = { small: "/video/hero-480.mp4", large: "/video/hero-720.mp4" };

/**
 * Looping hero background. The poster in the section's own background paints
 * first, so this only fades in once enough of the video has buffered.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Start fetching only after the page has loaded, and never on a metered or
  // slow connection or for people who ask for reduced motion.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: Connection })
      .connection;
    const constrained =
      conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (constrained || calm) return;

    const small = window.matchMedia("(max-width: 640px)").matches;
    const start = () => setSrc(small ? SRC.small : SRC.large);
    const idle = (fn: () => void) =>
      "requestIdleCallback" in window
        ? window.requestIdleCallback(fn, { timeout: 1500 })
        : window.setTimeout(fn, 300);

    if (document.readyState === "complete") {
      idle(start);
      return;
    }
    const onLoad = () => idle(start);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Don't decode frames nobody can see.
  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  if (!src) return null;

  return (
    <Video
      ref={ref}
      data-hero-bg
      $ready={ready}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
      onError={() => setSrc(null)}
    />
  );
}
