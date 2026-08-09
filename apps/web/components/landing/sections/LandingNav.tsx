import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Brand } from "../../ui/Brand";
import { Avatar } from "../../profile/Avatar";
import type { Profile } from "@/lib/auth/types";

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

const NavProfile = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 16px 5px 5px;
  border-radius: 999px;
  background: rgba(22, 22, 22, 0.72);
  border: 1px solid rgba(250, 248, 244, 0.1);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: ${nocturne.cream};
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: rgba(28, 28, 28, 0.82);
    border-color: rgba(250, 248, 244, 0.18);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  }

  .name {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 420px) {
    padding: 4px;
    .name {
      display: none;
    }
  }
`;

export function LandingNav({ profile }: { profile: Profile | null }) {
  // "Sign in" is folded into a single "Get started" entry point. Once signed
  // in, that CTA becomes a profile chip (photo + first name) linking to /profile.
  const name =
    profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Account";
  const firstName = name.split(/\s+/)[0];

  return (
    <Nav>
      <NavLogo>
        <Brand href="#top" light priority />
      </NavLogo>
      <NavRight>
        <NavLink href="#find">Find a ride</NavLink>
        <NavLink href="#alerts">Alerts</NavLink>
        {profile ? (
          <NavProfile href="/profile" aria-label="Your profile">
            <Avatar name={name} src={profile.avatar_url} size={32} />
            <span className="name">{firstName}</span>
          </NavProfile>
        ) : (
          <NavCta href="/auth/sign-up">Get started</NavCta>
        )}
      </NavRight>
    </Nav>
  );
}
