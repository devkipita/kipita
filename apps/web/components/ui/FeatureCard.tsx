import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styled, { css } from "styled-components";
import { IconBubble } from "./IconBubble";

const cardCss = css`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: block;
`;

const hoverCss = css`
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadow.card};
  }
  &:hover [data-chevron] {
    transform: translateX(4px);
  }
`;

export const FeatureCardBox = styled.div`
  ${cardCss}
`;

export const FeatureCardLink = styled(Link)`
  ${cardCss}
  ${hoverCss}
`;

export const FeatureTitle = styled.h3`
  font-size: 1.35rem;
  margin: 20px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const FeatureBody = styled.p`
  color: ${({ theme }) => theme.color.textSoft};
  margin: 0;
`;

export const InlineChevron = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.muted};
  transition: transform 0.2s ease;
`;

/** Icon + title + body card. Optionally a link (lifts on hover). */
export function FeatureCard({
  icon,
  title,
  body,
  href,
  accent = "sage",
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  accent?: "sage" | "green" | "tan";
}) {
  const inner = (
    <>
      <IconBubble icon={icon} variant={accent} />
      <FeatureTitle>{title}</FeatureTitle>
      <FeatureBody>{body}</FeatureBody>
    </>
  );

  if (href) return <FeatureCardLink href={href}>{inner}</FeatureCardLink>;
  return <FeatureCardBox>{inner}</FeatureCardBox>;
}
