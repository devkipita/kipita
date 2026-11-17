"use client";

import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";

export const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

export const HeroFrame = styled.div`
  view-transition-name: morph-hero;
`;

export const Wrap = styled(ContentWidth)`
  padding-block: 0 56px;
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 960px) {
    padding-bottom: calc(44px + var(--bottom-bar-space, 0px));
  }
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 352px;
  align-items: start;
  gap: clamp(28px, 4vw, 64px);
  margin-top: clamp(28px, 4vh, 44px);

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 34px;
  }
`;

export const MainCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const SideCol = styled.div`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 960px) {
    position: static;
    order: -1;
  }
`;

export const Band = styled.div`
  margin-top: clamp(24px, 3.2vh, 34px);
  padding-top: clamp(22px, 3vh, 30px);
  border-top: 1.5px solid ${RULE};

  &:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }
`;

export const BookPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(22px, 2.6vw, 28px);
  border-radius: 20px;
  background: ${nocturne.surface2};
`;
