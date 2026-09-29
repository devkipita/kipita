import type { KipitaIcon as LucideIcon } from "@/components/icons";
import styled, { keyframes } from "styled-components";

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const MarqueeEl = styled.div`
  overflow: hidden;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  padding: 18px 0;

  &:hover [data-marquee-track] {
    animation-play-state: paused;
  }
`;

const Track = styled.div`
  display: inline-flex;
  gap: 44px;
  padding-right: 44px;
  white-space: nowrap;
  animation: ${scroll} 28s linear infinite;
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 1.05rem;

  svg {
    display: block;
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
`;

/** Infinite horizontal marquee (CSS-only). Items duplicated for a seamless loop. */
export function Marquee({
  items,
}: {
  items: { icon: LucideIcon; label: string }[];
}) {
  const row = [...items, ...items];
  return (
    <MarqueeEl aria-hidden>
      <Track data-marquee-track>
        {row.map(({ icon: Icon, label }, i) => (
          <Item key={i}>
            <Icon size={18} />
            {label}
          </Item>
        ))}
      </Track>
    </MarqueeEl>
  );
}
