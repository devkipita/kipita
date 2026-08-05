import Link from "next/link";
import styled from "styled-components";
import Logo from "@/public/Logo";

const BrandLink = styled(Link)<{ $light?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: ${({ theme, $light }) => ($light ? "#fff" : "inherit")};
`;

const BrandLogo = styled(Logo)`
  display: block;
  height: 100px;
  width: auto;
  flex: none;
`;

const BrandText = styled.span`
  white-space: nowrap;
`;

/** The Kipita wordmark — rounded glyph + name. Reused in nav, footer, admin. */
export function Brand({
  href = "/",
  label = "Kipita",
  light = false,
  className,
}: {
  href?: string;
  label?: string;
  light?: boolean;
  className?: string;
}) {
  const extraLabel = label === "Kipita" ? "" : label.replace(/^Kipita\s*/, "");

  return (
    <BrandLink href={href} $light={light} className={className}>
      <BrandLogo />
      {extraLabel ? <BrandText>{extraLabel}</BrandText> : null}
    </BrandLink>
  );
}
