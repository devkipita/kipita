"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";

const WIDE = "@media (min-width: 900px)";
const SPLIT_MIN = 1180;
const MOB = "@media (max-width: 899px)";
const PEEK = 132;
const HALF = 0.42;

type Snap = "peek" | "half" | "full";

const SNAP_Y: Record<Snap, string> = {
  full: "0px",
  half: `${HALF * 100}%`,
  peek: `calc(100% - ${PEEK}px - var(--bottom-bar-space, 0px))`,
};

const Page = styled(ContentWidth)<{ $split: boolean }>`
  padding-block: 0 64px;
  padding-left: max(16px, var(--page-pad), env(safe-area-inset-left));
  padding-right: max(16px, var(--page-pad), env(safe-area-inset-right));
  background: ${nocturne.bg};

  ${WIDE} {
    display: grid;
    grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
    align-items: start;
    gap: 24px;
  }
  ${WIDE} {
    ${({ $split }) =>
      $split ? "grid-template-columns: minmax(320px, 440px) minmax(360px, 1fr) minmax(320px, 420px);" : ""}
  }
  ${MOB} {
    min-height: calc(100dvh - var(--topbar-h, 56px) - var(--bottom-bar-space, 0px));
    padding: 0;
  }
`;

const MapPane = styled.div`
  ${WIDE} {
    order: 2;
    position: sticky;
    top: calc(var(--topbar-h, 64px) + 16px);
    min-width: 0;
    height: calc(100dvh - var(--topbar-h, 64px) - 32px);
    margin-top: 16px;
    border-radius: 20px;
    overflow: hidden;
  }
  ${MOB} {
    position: fixed;
    z-index: 1;
    top: var(--topbar-h, 56px);
    left: 0;
    right: 0;
    bottom: var(--sheet-visible, 50dvh);
  }
`;

const MapTop = styled.div`
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;

  > * {
    pointer-events: auto;
    box-shadow: ${nocturne.panelShadow};
  }

  ${WIDE} {
    display: none;
  }
`;

const Dock = styled.aside`
  order: 3;
  position: sticky;
  top: calc(var(--topbar-h, 64px) + 16px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 12px;
  min-width: 0;
  max-height: calc(100dvh - var(--topbar-h, 64px) - 32px);
  margin-top: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 20px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Sheet = styled.div<{ $snap: Snap }>`
  ${WIDE} {
    order: 1;
    min-width: 0;
  }
  ${MOB} {
    position: fixed;
    z-index: 4;
    top: var(--topbar-h, 56px);
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    border-radius: 24px 24px 0 0;
    background: ${nocturne.bg};
    box-shadow: ${nocturne.panelShadow};
    transform: translate3d(0, ${({ $snap }) => SNAP_Y[$snap]}, 0);
    transition: transform ${dur.enter} ${ease.enter};
    touch-action: none;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Handle = styled.button`
  display: none;

  ${MOB} {
    display: grid;
    place-items: center;
    flex: none;
    width: 100%;
    height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;

    i {
      width: 44px;
      height: 5px;
      border-radius: 999px;
      background: ${nocturne.muted2};
    }
    &:focus-visible {
      outline: 3px solid ${nocturne.accent};
      outline-offset: -3px;
    }
  }
`;

const SheetBody = styled.div`
  ${MOB} {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    touch-action: pan-y;
    padding: 0 16px calc(24px + var(--bottom-bar-space, 0px));
  }
`;

function snapOffsets(height: number): Record<Snap, number> {
  const bar =
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-bar-space")) || 0;
  return { full: 0, half: height * HALF, peek: height - PEEK - bar };
}

export function useSplitLayout(): boolean {
  const [split, setSplit] = useState(false);
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setSplit(window.innerWidth >= 900 && entry.contentRect.width >= SPLIT_MIN);
    });
    observer.observe(main);
    return () => observer.disconnect();
  }, []);
  return split;
}

export function MapSheet({
  map,
  mapTop,
  aside,
  children,
  expandLabel = "Show all details",
}: {
  map: (padding: google.maps.Padding | undefined) => ReactNode;
  mapTop?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  expandLabel?: string;
}) {
  const split = useSplitLayout();
  const [snap, setSnap] = useState<Snap>("half");
  const [mobile, setMobile] = useState(false);
  const [padding, setPadding] = useState<google.maps.Padding | undefined>(undefined);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const dragged = useRef(false);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => {
      setMobile(mq.matches);
      if (!mq.matches) {
        setPadding({ top: 72, right: 72, bottom: 72, left: 72 });
        return;
      }
      const el = sheetRef.current;
      if (!el || snapRef.current === "full") return;
      const visible = el.offsetHeight - snapOffsets(el.offsetHeight)[snapRef.current];
      document.documentElement.style.setProperty("--sheet-visible", `${Math.round(visible - 20)}px`);
      setPadding({ top: 80, right: 64, left: 40, bottom: 40 });
    };
    const settle = setTimeout(sync, 320);
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      clearTimeout(settle);
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [snap]);

  const asideBeside = Boolean(aside) && split;

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--sheet-visible");
    },
    [],
  );

  function dragTo(dy: number) {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    d.dy = dy;
    if (Math.abs(dy) > 4) dragged.current = true;
    const offsets = snapOffsets(el.offsetHeight);
    const raw = offsets[snapRef.current] + dy;
    const y = raw < 0 ? raw / 4 : Math.min(raw, offsets.peek + 40);
    el.style.transition = "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  function dragEnd() {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transition = "";
    el.style.transform = "";
    if (!dragged.current) return;
    const current = snapRef.current;
    const offsets = snapOffsets(el.offsetHeight);
    const order: Snap[] = ["full", "half", "peek"];
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    const at = order.indexOf(current);
    if (Math.abs(velocity) > 0.11) {
      setSnap(order[Math.min(2, Math.max(0, at + (velocity > 0 ? 1 : -1)))]);
      return;
    }
    const y = offsets[current] + d.dy;
    setSnap(order.reduce((best, s) => (Math.abs(offsets[s] - y) < Math.abs(offsets[best] - y) ? s : best), current));
  }

  const dragEndRef = useRef(dragEnd);
  const dragToRef = useRef(dragTo);
  dragEndRef.current = dragEnd;
  dragToRef.current = dragTo;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !mobile) return;
    let startY = 0;
    let t0 = 0;
    let active = false;
    let decided = false;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      t0 = performance.now();
      active = false;
      decided = false;
    };
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (!decided && Math.abs(dy) > 6) {
        decided = true;
        active = snapRef.current !== "full" || (body.scrollTop <= 0 && dy > 0);
        if (active) {
          dragged.current = false;
          drag.current = { y: startY, t: t0, dy: 0 };
        }
      }
      if (active) {
        e.preventDefault();
        dragToRef.current(dy);
      }
    };
    const onEnd = () => {
      if (active) dragEndRef.current();
      active = false;
    };
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
  }, [mobile]);

  return (
    <Page $max={asideBeside ? 1600 : 1320} $split={asideBeside}>
      <MapPane data-map-pane>
        {mapTop ? <MapTop>{mapTop}</MapTop> : null}
        {map(padding)}
      </MapPane>
      {asideBeside ? <Dock aria-label="Ride tasks">{aside}</Dock> : null}
      <Sheet ref={sheetRef} $snap={snap}>
        <Handle
          type="button"
          aria-label={snap === "full" ? "Show the map" : expandLabel}
          aria-expanded={snap === "full"}
          onPointerDown={(e) => {
            dragged.current = false;
            drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) dragTo(e.clientY - d.y);
          }}
          onPointerUp={dragEnd}
          onPointerCancel={dragEnd}
          onClick={() => {
            if (!dragged.current) setSnap((s) => (s === "full" ? "half" : "full"));
          }}
        >
          <i aria-hidden />
        </Handle>
        <SheetBody ref={bodyRef}>
          {children}
        </SheetBody>
      </Sheet>
    </Page>
  );
}
