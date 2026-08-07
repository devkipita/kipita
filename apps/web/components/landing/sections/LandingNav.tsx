import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Brand } from "../../ui/Brand";

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
    color: ${nocturne.cream};
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
  color: ${nocturne.cream};
  letter-spacing: 0.01em;
  transition: color 0.2s ease;

  &:hover {
    color: ${nocturne.sage};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const NavCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 640px) {
    gap: 6px;
    padding: 9px 14px;
    font-size: 13px;
  }

  @media (max-width: 420px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

export function LandingNav() {
  return (
    <Nav>
      <NavLogo>
        <Brand href="#top" light priority />
      </NavLogo>
      <NavRight>
        <NavLink href="#find">Find a ride</NavLink>
        <NavLink href="#alerts">Alerts</NavLink>
        <NavCta href="#download">Get the app</NavCta>
      </NavRight>
    </Nav>
  );
}
