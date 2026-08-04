import Link from "next/link";
import { Car } from "lucide-react";
import styled from "styled-components";

const BrandLink = styled(Link)<{ $light?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: ${({ theme, $light }) => ($light ? "#fff" : "inherit")};
`;

const BrandDot = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.primary};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.onPrimary};
  font-size: 18px;
`;

/** The Kipita wordmark — rounded glyph + name. Reused in nav, footer, admin. */
export function Brand({
  href = "/",
  label = "Kipita",
  light = false,
}: {
  href?: string;
  label?: string;
  light?: boolean;
}) {
  return (
    <BrandLink href={href} $light={light}>
      <BrandDot>
        <Car size={18} strokeWidth={2.4} />
      </BrandDot>
      {label}
    </BrandLink>
  );
}
