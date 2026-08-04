"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styled from "styled-components";
import { nocturne, float } from "./nocturne";

const Carousel = styled.div`
  position: relative;
  width: 100%;
  border-radius: 34px;
  overflow: hidden;
  background: #8caf50;
  animation: ${float} 7s ease-in-out infinite;
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.55);
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Slide 0 stays in flow to set the card's height; GSAP drives the crossfade.
   Slides 1–2 overlay it via source order (badge + dots come after, so they
   stay on top without needing z-index). */
const CarSlide = styled.img`
  display: block;
  width: 100%;
  height: auto;
`;

const CarSlideAbs = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
`;

const CarSeats = styled.span`
  position: absolute;
  left: 20px;
  top: 20px;
  padding: 9px 18px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.lime};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CarDots = styled.div`
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  gap: 8px;
  z-index: 3;
`;

const CarDot = styled.button<{ $active?: boolean }>`
  width: 30px;
  height: 8px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${({ $active }) => ($active ? nocturne.greenDeep : "rgba(20, 57, 42, 0.3)")};
  transition: background 0.3s ease;
`;

const SLIDES = [
  { src: "/landing/car-hero.jpg", ground: "#8CAF50", label: "Green" },
  { src: "/landing/car-gold.jpg", ground: "#CAA88A", label: "Gold" },
  { src: "/landing/car-purple.jpg", ground: "#AD7DB6", label: "Purple" },
];

const INTERVAL = 4200;

/**
 * Auto-advancing hero carousel. Matches the design's motion exactly: the
 * outgoing slide fades + slides left, the incoming one fades + slides in from
 * the right, and the card's "ground" colour tweens between slides — all on a
 * gentle vertical float (CSS `float` keyframes).
 */
export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLImageElement | null)[]>([]);
  const prev = useRef(0);
  const reduced = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const start = () => {
    stop();
    if (reduced.current) return;
    timer.current = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      INTERVAL,
    );
  };

  // Kick off autoplay once (respecting reduced-motion).
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate whenever the active slide changes.
  useEffect(() => {
    const wrap = wrapRef.current;
    const from = prev.current;
    const to = active;
    prev.current = to;

    const nextEl = slides.current[to];
    const prevEl = slides.current[from];

    if (reduced.current) {
      slides.current.forEach((s, k) => s && gsap.set(s, { opacity: k === to ? 1 : 0, xPercent: 0 }));
      if (wrap) wrap.style.backgroundColor = SLIDES[to].ground;
      return;
    }

    if (from === to) {
      if (nextEl) gsap.set(nextEl, { opacity: 1, xPercent: 0 });
      return;
    }

    if (wrap) {
      gsap.to(wrap, {
        backgroundColor: SLIDES[to].ground,
        duration: 0.7,
        ease: "power2.inOut",
      });
    }
    if (prevEl) {
      gsap.to(prevEl, { opacity: 0, xPercent: -8, duration: 0.7, ease: "power2.inOut" });
    }
    if (nextEl) {
      gsap.fromTo(
        nextEl,
        { opacity: 0, xPercent: 8 },
        { opacity: 1, xPercent: 0, duration: 0.7, ease: "power2.inOut" },
      );
    }
  }, [active]);

  const go = (n: number) => {
    setActive(n);
    start(); // restart the timer so a manual pick doesn't jump immediately
  };

  return (
    <Carousel ref={wrapRef}>
      {SLIDES.map((s, i) => {
        const Slide = i === 0 ? CarSlide : CarSlideAbs;
        return (
          <Slide
            key={s.src}
            ref={(el: HTMLImageElement | null) => {
              slides.current[i] = el;
            }}
            src={s.src}
            alt="A Kipita shared ride"
          />
        );
      })}

      <CarSeats>3 seats free</CarSeats>

      <CarDots>
        {SLIDES.map((s, i) => (
          <CarDot
            key={s.label}
            aria-label={s.label}
            onClick={() => go(i)}
            $active={i === active}
          />
        ))}
      </CarDots>
    </Carousel>
  );
}
