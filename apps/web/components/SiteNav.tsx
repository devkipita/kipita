import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styled from "styled-components";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/primitives";

const Nav = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: saturate(140%) blur(10px);
  background: ${({ theme }) =>
    theme.mode === "dark"
      ? "rgba(17, 20, 18, 0.8)"
      : "rgba(230, 239, 227, 0.8)"};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const NavInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavLink = styled(Link)`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSoft};

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

/** Sticky translucent top nav for the marketing + legal pages. */
export function SiteNav() {
  return (
    <Nav>
      <NavInner>
        <Brand priority />
        <NavLinks>
          <NavLink href="/#how">How it works</NavLink>
          <NavLink href="/#trust">Trust &amp; safety</NavLink>
          <NavLink href="/legal/privacy">Legal</NavLink>
          <Button href="/#get" icon={ArrowRight} compact>
            Get the app
          </Button>
        </NavLinks>
      </NavInner>
    </Nav>
  );
}
