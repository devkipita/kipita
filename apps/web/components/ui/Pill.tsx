import type { KipitaIcon as LucideIcon } from "@/components/icons";
import styled from "styled-components";

const PillEl = styled.span`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSoft};
  display: inline-flex;
  gap: 8px;
  align-items: center;

  svg {
    display: block;
    flex: none;
  }
`;

/** Small labelled chip (icon + text) used for hero value-props. */
export function Pill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <PillEl>
      <Icon size={16} />
      {children}
    </PillEl>
  );
}
