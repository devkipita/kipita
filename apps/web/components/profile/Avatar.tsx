"use client";

import { useState } from "react";
import styled from "styled-components";

const Circle = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 800;
  font-size: ${({ $size }) => Math.round($size * 0.38)}px;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.onPrimary};
  background: ${({ theme }) => theme.color.primary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Round avatar — shows the image, falling back to initials on error/empty. */
export function Avatar({
  name,
  src,
  size = 84,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = src && !broken;
  return (
    <Circle $size={size} className={className}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} onError={() => setBroken(true)} />
      ) : (
        initials(name)
      )}
    </Circle>
  );
}
