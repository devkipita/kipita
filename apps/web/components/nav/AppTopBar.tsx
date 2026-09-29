"use client";

import styled from "styled-components";
import { List as Hamburger } from "@/components/icons";
import { Brand } from "@/components/ui/Brand";
import { Z } from "@/lib/z";
import { TOPBAR_H } from "@/lib/nav/rail";

const Bar = styled.header`
  position: relative;
  z-index: ${Z.appTopBar};
  height: ${TOPBAR_H}px;
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  align-items: center;
  padding: 0 6px;
  background: transparent;

  @media (min-width: 900px) {
    display: none;
  }
`;

const Centre = styled.div`
  display: flex;
  justify-content: center;
  min-width: 0;
`;

const MenuButton = styled.button`
  flex: none;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;

  &:active {
    background: ${({ theme }) => theme.color.surface2};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
`;

export function AppTopBar({
  onOpenMenu,
  homeHref,
}: {
  onOpenMenu: () => void;
  homeHref: string;
}) {
  return (
    <Bar>
      <MenuButton
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        aria-haspopup="dialog"
      >
        <Hamburger size={22} weight="bold" />
      </MenuButton>

      <Centre>
        <Brand href={homeHref} priority />
      </Centre>

      <span aria-hidden="true" />
    </Bar>
  );
}
