"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import styled from "styled-components";
import { AnimatePresence, m } from "motion/react";
import { spring, tween } from "@/lib/motion";

const DOCK_W = 400;
const ASIDE_W = 320;
const COL_GAP = 32;

type Dock = {
  slot: HTMLElement | null;
  dock: (open: boolean) => void;
};

const DockContext = createContext<Dock>({ slot: null, dock: () => undefined });

export function useAlertsDock() {
  return useContext(DockContext);
}

const Page = styled.div`
  display: flex;
  align-items: flex-start;
  width: 100%;
`;

const Grid = styled(m.div)`
  display: grid;
  flex: 1;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) ${ASIDE_W}px;
  gap: ${COL_GAP}px;
  align-items: start;
  max-width: 1000px;
  margin: 0 auto;
  padding-inline: var(--page-pad);

  @media (max-width: 1199px) {
    grid-template-columns: minmax(0, 1fr);
    max-width: 640px;
  }
`;
const Main = styled(m.div)`
  min-width: 0;
`;

const Side = styled(m.aside)`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 16px);
  padding-top: 16px;

  @media (max-width: 1199px) {
    display: none;
  }
`;

const DockColumn = styled(m.aside)`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 16px);
  display: flex;
  flex-direction: column;
  width: ${DOCK_W}px;
  height: calc(100dvh - var(--sticky-top, 0px) - var(--topbar-h, 64px) - 32px);
  min-height: 480px;
  flex: none;
  margin: 16px 16px 0 0;
  overflow: hidden;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

export function AlertsColumns({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  const [docked, setDocked] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const dock = useCallback((open: boolean) => setDocked(open), []);

  const value = useMemo(() => ({ slot, dock }), [slot, dock]);

  return (
    <DockContext.Provider value={value}>
      <Page>
        <Grid layout="position" transition={spring.morph}>
          <Main layout="position" transition={spring.morph}>
            {children}
          </Main>
          <Side layout="position" aria-label="Search, trending roads and posting rules" transition={spring.morph}>
            {aside}
          </Side>
        </Grid>
        <AnimatePresence>
          {docked && (
            <DockColumn
              key="dock"
              ref={setSlot}
              aria-label="Replies"
              initial={{ clipPath: "inset(0px 0px 0px 100% round 16px)" }}
              animate={{ clipPath: "inset(0px 0px 0px 0% round 16px)", transition: spring.morph }}
              exit={{ clipPath: "inset(0px 0px 0px 100% round 16px)", transition: tween.exit }}
            />
          )}
        </AnimatePresence>
      </Page>
    </DockContext.Provider>
  );
}
