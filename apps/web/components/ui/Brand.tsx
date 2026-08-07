import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";

const BrandLink = styled(Link)<{ $light?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: ${({ $light }) => ($light ? "#fff" : "inherit")};
`;

// Sized in CSS (height + width:auto); callers scale it per context.
const BrandLogo = styled(Image)`
  display: block;
  height: 32px;
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
  priority = false,
  className,
}: {
  href?: string;
  label?: string;
  light?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const extraLabel = label === "Kipita" ? "" : label.replace(/^Kipita\s*/, "");

  return (
    <BrandLink href={href} $light={light} className={className}>
      <BrandLogo
        src="/kipita-logo.png"
        alt="Kipita"
        width={1397}
        height={621}
        sizes="160px"
        priority={priority}
      />
      {extraLabel ? <BrandText>{extraLabel}</BrandText> : null}
    </BrandLink>
  );
}
