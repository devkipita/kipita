"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";

const Wrap = styled.main`
  display: flex;
  min-height: 72vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 72px 20px 88px;
  text-align: center;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Art = styled.div`
  margin-bottom: 6px;
  color: ${({ theme }) => theme.color.onSurface};
`;

const Code = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.primary};
`;

const Title = styled.h1`
  margin: 0;
  max-width: 16ch;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: clamp(2.2rem, 7vw, 4rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.04em;
  text-wrap: balance;
`;

const Lead = styled.p`
  margin: 0;
  max-width: 48ch;
  font-size: clamp(1rem, 2vw, 1.18rem);
  line-height: 1.6;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
`;

const action = `
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 0 28px;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
`;

const motion = `
  transition:
    background ${dur.short4}ms ${ease.standard},
    color ${dur.short4}ms ${ease.standard},
    border-color ${dur.short4}ms ${ease.standard},
    transform ${dur.short3}ms ${ease.emphasized},
    box-shadow ${dur.medium2}ms ${ease.emphasizedDecelerate};
`;

const lift = `
  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 26px -12px rgba(14, 56, 43, 0.55);
    }
  }
  &:active {
    transform: scale(0.97);
    box-shadow: none;
  }
  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:active {
      transform: none;
      box-shadow: none;
    }
  }
`;

const Primary = styled(Link)`
  ${action}
  ${motion}
  ${lift}
  border: 1.5px solid transparent;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
  }
  &:active {
    background: ${nocturne.greenDeep};
    color: ${nocturne.lime};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.green};
    outline-offset: 3px;
  }
`;

const Secondary = styled.button`
  ${action}
  ${motion}
  ${lift}
  border: 1.5px solid ${nocturne.line};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font-family: inherit;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
      border-color: ${nocturne.greenDeep};
      color: ${nocturne.lime};
    }
  }
  &:active {
    background: ${nocturne.green};
    border-color: ${nocturne.green};
    color: ${nocturne.lime};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const PrimaryButton = styled.button`
  ${action}
  ${motion}
  ${lift}
  border: 1.5px solid transparent;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-family: inherit;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
  }
  &:active {
    background: ${nocturne.greenDeep};
    color: ${nocturne.lime};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.green};
    outline-offset: 3px;
  }
`;

const SecondaryLink = styled(Link)`
  ${action}
  ${motion}
  ${lift}
  border: 1.5px solid ${nocturne.line};
  background: ${nocturne.surface};
  color: ${nocturne.cream};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
      border-color: ${nocturne.greenDeep};
      color: ${nocturne.lime};
    }
  }
  &:active {
    background: ${nocturne.green};
    border-color: ${nocturne.green};
    color: ${nocturne.lime};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

export function StatusPage({
  code,
  title,
  lead,
  art,
  onRetry,
}: {
  code?: string;
  title: string;
  lead: string;
  art?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <Wrap>
      {art ? <Art>{art}</Art> : null}
      {code ? <Code>{code}</Code> : null}
      <Title>{title}</Title>
      <Lead>{lead}</Lead>
      <Row>
        {onRetry ? (
          <>
            <PrimaryButton type="button" onClick={onRetry}>
              Try again
            </PrimaryButton>
            <SecondaryLink href="/home">Find a ride</SecondaryLink>
          </>
        ) : (
          <Primary href="/home">Find a ride</Primary>
        )}
      </Row>
    </Wrap>
  );
}
