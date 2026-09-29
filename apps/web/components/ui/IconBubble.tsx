import type { KipitaIcon as LucideIcon } from "@/components/icons";
import styled, { css } from "styled-components";

type Variant = "sage" | "green" | "tan";

const Bubble = styled.span<{ $variant: Variant }>`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  place-items: center;
  font-size: 30px;

  svg {
    display: block;
  }

  ${({ theme, $variant }) => {
    switch ($variant) {
      case "green":
        return css`
          background: ${theme.color.primary};
          color: ${theme.color.onPrimary};
        `;
      case "tan":
        return css`
          background: ${theme.color.tan};
          color: #4a3a20;
        `;
      default:
        return css`
          background: ${theme.color.bg};
          color: ${theme.color.primaryDark};
        `;
    }
  }}
`;

/** Rounded icon well. The single place icon chips are styled. */
export function IconBubble({
  icon: Icon,
  variant = "sage",
  size = 28,
}: {
  icon: LucideIcon;
  variant?: Variant;
  size?: number;
}) {
  return (
    <Bubble $variant={variant}>
      <Icon size={size} />
    </Bubble>
  );
}
