import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styled from "styled-components";
import { Brand } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/primitives";

const Nav = styled.nav`
  position: relative;
  top: 0;
  z-index: 50;
`;

const NavInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
`;

const Logo = styled(Brand)`
  img {
    height: 44px;
  }
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

export function SiteNav() {
  return (
    <Nav>
      <NavInner>
        <Logo priority />
        <NavLinks>
          <NavLink href="/help#start">How it works</NavLink>
          <NavLink href="/help#faq">Trust &amp; safety</NavLink>
          <NavLink href="/legal/privacy">Legal</NavLink>
          <Button href="/#download" icon={ArrowRight} compact>
            Get the app
          </Button>
        </NavLinks>
      </NavInner>
    </Nav>
  );
}
