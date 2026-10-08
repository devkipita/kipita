import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Brand } from "../../ui/Brand";
import { LandingNavAccount } from "./LandingNavAccount";

const Nav = styled.nav`
  /* Not pinned anywhere — flows at the top and scrolls away with the page. */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 16px clamp(14px, 5vw, 72px);
  pointer-events: none;

  @media (max-width: 900px) {
    flex-wrap: nowrap;
    gap: 12px;
  }

  @media (max-width: 640px) {
    gap: 10px;
    padding-top: 12px;
    padding-bottom: 12px;
  }
`;

const NavLogo = styled.div`
  display: flex;
  align-items: center;
  /* Footprint that sets the navbar height; the img overflows it (see below). */
  height: 44px;
  flex: 0 1 auto;
  min-width: 0;
  pointer-events: auto;

  a {
    display: flex;
    align-items: center;
    color: ${nocturne.onGreen};
  }

  img {
    height: 66px;
    width: auto;
    display: block;
  }

  @media (max-width: 900px) {
    height: 36px;
    img {
      height: 62px;
    }
  }

  @media (max-width: 640px) {
    height: 32px;
    img {
      height: 58px;
    }
  }

  @media (max-width: 420px) {
    height: 28px;
    img {
      height: 54px;
    }
  }
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(12px, 2.4vw, 38px);
  margin-left: auto;
  flex: 0 0 auto;
  pointer-events: auto;

  @media (max-width: 900px) {
    gap: 12px;
  }

  @media (max-width: 640px) {
    gap: 10px;
  }

  @media (max-width: 420px) {
    gap: 8px;
  }
`;

const NavLink = styled.a`
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  color: ${nocturne.onGreen};
  letter-spacing: 0.01em;
  transition: color 0.2s ease;

  &:hover {
    color: ${nocturne.lime};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

export function LandingNav() {
  return (
    <Nav>
      <NavLogo>
        <Brand href="#top" light priority />
      </NavLogo>
      <NavRight>
        <NavLink href="/home">Find a ride</NavLink>
        <NavLink href="/#routes">Routes</NavLink>
        <NavLink href="/publish">Publish a ride</NavLink>
        <NavLink href="/alerts">Road alerts</NavLink>
        <LandingNavAccount />
      </NavRight>
    </Nav>
  );
}
