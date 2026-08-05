"use client";

import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { nocturne } from "./nocturne";

const Track = styled.div`
  position: relative;
  margin-top: 44px;
  display: flex;
  justify-content: safe center;
  gap: 20px;
  overflow-x: auto;
  padding: 8px clamp(20px, 5vw, 72px) 28px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Controls = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 72px);
  display: flex;
  justify-content: center;
`;

const Dots = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? "34px" : "10px")};
  height: 10px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ $active }) =>
    $active ? nocturne.lime : "rgba(250, 248, 244, 0.18)"};
  box-shadow: ${({ $active }) =>
    $active ? "0 0 0 1px rgba(159, 232, 112, 0.24)" : "none"};
  transition:
    width 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &:hover {
    transform: translateY(-1px);
    background: ${({ $active }) =>
      $active ? nocturne.lime : "rgba(250, 248, 244, 0.3)"};
  }
`;

type RidesCarouselProps = {
  children: ReactNode;
};

export function RidesCarousel({ children }: RidesCarouselProps) {
  const count = Children.count(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const getCards = useCallback(() => {
    const track = trackRef.current;

    if (!track) return [] as HTMLElement[];

    return Array.from(
      track.querySelectorAll<HTMLElement>(":scope > article"),
    );
  }, []);

  const syncActive = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    const cards = getCards();

    if (!cards.length) return;

    const paddingLeft =
      Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const position = track.scrollLeft + paddingLeft;

    let nextActive = 0;
    let smallestDelta = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const delta = Math.abs(card.offsetLeft - position);

      if (delta < smallestDelta) {
        smallestDelta = delta;
        nextActive = index;
      }
    });

    setActive((current) => (current === nextActive ? current : nextActive));
  }, [getCards]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const card = getCards()[index] ?? null;

      if (!track || !card) return;

      const paddingLeft =
        Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;

      track.scrollTo({
        left: Math.max(0, card.offsetLeft - paddingLeft),
        behavior: "smooth",
      });
    },
    [getCards],
  );

  useEffect(() => {
    syncActive();

    const track = trackRef.current;

    if (!track) return;

    const handleScroll = () => syncActive();
    const resizeObserver = new ResizeObserver(() => syncActive());

    track.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(track);
    getCards().forEach((card) => resizeObserver.observe(card));

    return () => {
      track.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [children, getCards, syncActive]);

  return (
    <>
      <Track ref={trackRef}>{children}</Track>
      {count > 1 && (
        <Controls>
          <Dots aria-label="Available rides navigation">
            {Array.from({ length: count }, (_, index) => (
              <Dot
                key={`ride-dot-${index + 1}`}
                type="button"
                $active={index === active}
                onClick={() => scrollToIndex(index)}
                aria-label={`Show ride ${index + 1}`}
                aria-pressed={index === active}
              />
            ))}
          </Dots>
        </Controls>
      )}
    </>
  );
}
