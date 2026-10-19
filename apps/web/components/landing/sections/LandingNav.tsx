import styled from "styled-components";
import Link from "next/link";
import { nocturne } from "../nocturne";
import { dur, ease } from "@/lib/motion";
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

const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
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

const NavCta = styled(Link)`
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
  min-height: 44px;
  transition:
    background ${dur.short4}ms ${ease.standard},
    color ${dur.short4}ms ${ease.standard},
    transform ${dur.short3}ms ${ease.emphasized},
    box-shadow ${dur.medium2}ms ${ease.emphasizedDecelerate};

  svg {
    flex: none;
    transition: transform ${dur.medium3}ms ${ease.emphasized};
  }

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
      box-shadow: 0 12px 26px -12px rgba(8, 28, 20, 0.55);
    }
    &:hover svg {
      transform: translateX(3px);
    }
  }
  &:active {
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
    transform: scale(0.97);
    box-shadow: none;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition:
      background ${dur.short4}ms ${ease.standard},
      color ${dur.short4}ms ${ease.standard};

    svg {
      transition: none;
    }
    &:hover,
    &:active,
    &:hover svg {
      transform: none;
    }
  }

  @media (max-width: 640px) {
    gap: 6px;
    padding: 9px 14px;
    font-size: 15px;
  }

  @media (max-width: 420px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const NavProfile = styled(Link)`
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
  color: ${nocturne.onGreen};
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
  const name =
    profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Account";

  return (
    <Nav>
      <NavLogo>
        <Brand href="/" light priority />
      </NavLogo>
      <NavRight>
        <NavLink href="/home">Find a ride</NavLink>
        <NavLink href="/#routes">Routes</NavLink>
        <NavLink href="/publish">Publish a ride</NavLink>
        <NavLink href="/alerts">Road alerts</NavLink>
        {profile ? (
          <NavProfile href="/home" aria-label="Go to your Kipita home">
            <Avatar name={name} src={profile.avatar_url} size={32} />
            <span className="name">{name.split(/\s+/)[0]}</span>
          </NavProfile>
        ) : (
          <NavCta href="/auth/sign-up">Get started</NavCta>
        )}
      </NavRight>
    </Nav>
  );
}
