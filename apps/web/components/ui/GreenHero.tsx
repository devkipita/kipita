"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { ArrowLeft } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

const roll = keyframes`
  to { background-position: 28px 0; }
`;

const Band = styled.header`
  position: relative;
  padding: clamp(26px, 4.5vh, 48px) 0 clamp(30px, 5vh, 52px);
  color: ${nocturne.onGreen};
  background: ${nocturne.green};
  box-shadow: 0 0 0 100vmax ${nocturne.green};
  clip-path: inset(0 -100vmax);

  ::selection {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
`;

const Inner = styled.div<{ $aside: boolean }>`
  display: grid;
  grid-template-columns: ${({ $aside }) => ($aside ? "minmax(0, 1fr) minmax(260px, 340px)" : "minmax(0, 1fr)")};
  align-items: end;
  gap: 28px clamp(28px, 4vw, 60px);

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: -10px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${nocturne.onGreenMuted};
  text-decoration: none;

  &:hover {
    color: ${nocturne.onGreen};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 3px;
    border-radius: 6px;
  }
`;

const Status = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 14px;
  padding: 7px 14px 7px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, ${nocturne.greenDeep} 55%, transparent);
  font-size: 14.5px;
  font-weight: 700;
  color: ${nocturne.lime};

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${nocturne.lime};
  }
`;

const Title = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(38px, 6vw, 72px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
  color: ${nocturne.onGreen};
`;

const Route = styled.h1`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: ${nocturne.onGreen};

  > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const Road = styled.i<{ $moving: boolean }>`
  position: relative;
  flex: 1 1 36px;
  min-width: 36px;
  max-width: 140px;
  height: 4px;
  border-radius: 2px;
  background-image: linear-gradient(90deg, ${nocturne.lime} 0 14px, transparent 14px 28px);
  background-size: 28px 4px;
  ${({ $moving }) =>
    $moving &&
    css`
      animation: ${roll} 0.9s linear infinite;
    `}

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: -5px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${nocturne.lime};
  }
  &::before {
    left: -7px;
  }
  &::after {
    right: -7px;
    box-shadow: 0 0 0 4px color-mix(in oklab, ${nocturne.lime} 30%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Lead = styled.p`
  max-width: 54ch;
  margin: 14px 0 0;
  font-size: clamp(16px, 1.4vw, 18px);
  line-height: 1.5;
  color: ${nocturne.onGreenMuted};
`;

const Meta = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 600;
    color: ${nocturne.onGreen};
  }
  svg {
    flex: none;
    color: ${nocturne.lime};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;

  &:empty {
    display: none;
  }
`;

const Aside = styled.div`
  min-width: 0;
`;

const heroButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.2s ease,
    color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const primaryLook = css`
  ${heroButton}
  color: ${nocturne.ctaFg};
  background: ${nocturne.ctaBg};
`;

const ghostLook = css`
  ${heroButton}
  color: ${nocturne.onGreen};
  background: transparent;
  box-shadow: inset 0 0 0 1.5px ${nocturne.onGreenMuted};

  &:hover:not(:disabled) {
    box-shadow: inset 0 0 0 1.5px ${nocturne.onGreen};
  }
`;

export const HeroPrimary = styled.button`
  ${primaryLook}
`;

export const HeroPrimaryLink = styled(Link)`
  ${primaryLook}
`;

export const HeroGhost = styled.button`
  ${ghostLook}
`;

export const HeroGhostLink = styled(Link)`
  ${ghostLook}
`;

export const HeroTicket = styled.div`
  padding: 22px 24px;
  border-radius: 16px;
  background: ${nocturne.greenDeep};

  > small {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.onGreenMuted};
  }
  > b {
    display: block;
    margin-top: 4px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(34px, 3.6vw, 44px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.035em;
    color: ${nocturne.lime};
  }
  > p {
    margin: 10px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.onGreenMuted};
  }
  > p strong {
    color: ${nocturne.onGreen};
  }
`;

export type HeroMeta = { icon: ReactNode; label: ReactNode };

export function GreenHero({
  back,
  status,
  title,
  route,
  moving = false,
  lead,
  meta,
  actions,
  aside,
}: {
  back?: { href: string; label: string };
  status?: ReactNode;
  title?: ReactNode;
  route?: { from: string; to: string };
  moving?: boolean;
  lead?: ReactNode;
  meta?: HeroMeta[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Band>
      {back && (
        <Back href={back.href}>
          <ArrowLeft size={17} /> {back.label}
        </Back>
      )}
      <Inner $aside={!!aside}>
        <div>
          {status && (
            <Status>
              <i aria-hidden />
              {status}
            </Status>
          )}
          {route ? (
            <Route aria-label={`${route.from} to ${route.to}`}>
              <span>{route.from}</span>
              <Road aria-hidden $moving={moving} />
              <span>{route.to}</span>
            </Route>
          ) : (
            <Title>{title}</Title>
          )}
          {lead && <Lead>{lead}</Lead>}
          {meta && meta.length > 0 && (
            <Meta>
              {meta.map((m, i) => (
                <li key={i}>
                  {m.icon}
                  {m.label}
                </li>
              ))}
            </Meta>
          )}
          {actions && <Actions>{actions}</Actions>}
        </div>
        {aside && <Aside>{aside}</Aside>}
      </Inner>
    </Band>
  );
}
