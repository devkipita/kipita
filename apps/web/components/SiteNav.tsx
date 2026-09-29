"use client";

import { useState } from "react";
import { ArrowRight, List as Menu, X } from "@/components/icons";
import styled from "styled-components";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/primitives";

// Below this width the inline links collapse into a hamburger dropdown.
const MOBILE = 820;

const LINKS = [
  { href: "/help#start", label: "How it works" },
  { href: "/help#faq", label: "Trust & safety" },
  { href: "/legal/privacy", label: "Legal" },
];

const Nav = styled.nav`
  position: relative;
  top: 0;
  z-index: 50;
`;

const NavInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 68px;
`;

const Logo = styled(Brand)`
  flex: none;
  img {
    height: 44px;
  }

  @media (max-width: 460px) {
    img {
      height: 38px;
    }
  }
`;

/* Desktop cluster — inline links + CTA. Hidden on mobile. */
const DesktopNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: ${MOBILE}px) {
    display: none;
  }
`;

const NavLink = styled.a`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.textSoft};

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }
`;

/* Hamburger — mobile only. */
const MenuBtn = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;

  @media (max-width: ${MOBILE}px) {
    display: inline-flex;
  }
`;

const Panel = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: ${MOBILE}px) {
    display: grid;
    grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
    transition: grid-template-rows 0.26s ease;
  }
`;

const PanelInner = styled.div`
  overflow: hidden;
`;

const PanelBody = styled(Container)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  padding-bottom: 18px;

  a.link {
    padding: 14px 16px;
    border-radius: ${({ theme }) => theme.radius.md};
    font-weight: 600;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.color.text};

    &:hover {
      background: ${({ theme }) => theme.color.surface2};
    }
  }
`;

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <Nav>
      <NavInner>
        <Logo priority />

        <DesktopNav>
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
          <Button href="/#download" icon={ArrowRight} compact>
            Get the app
          </Button>
        </DesktopNav>

        <MenuBtn
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </MenuBtn>
      </NavInner>

      <Panel $open={open}>
        <PanelInner>
          <PanelBody>
            {LINKS.map((l) => (
              <a
                key={l.href}
                className="link"
                href={l.href}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Button
              href="/#download"
              icon={ArrowRight}
              style={{ width: "100%", marginTop: 6 }}
            >
              Get the app
            </Button>
          </PanelBody>
        </PanelInner>
      </Panel>
    </Nav>
  );
}
