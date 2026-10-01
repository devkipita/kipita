"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { safeHttpUrl } from "@/lib/security/url";

const MANAGED_AVATAR_PATH = "/storage/v1/object/public/avatars/";

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

export function resolveAvatarSrc(src?: string | null): string | null {
  // Vet the protocol first: this value comes from the database and could be a
  // `javascript:` or `data:` URL. safeHttpUrl returns null for anything that
  // isn't http(s) or a same-origin relative path.
  const safe = safeHttpUrl(src);
  if (!safe) return null;
  if (!/^https?:\/\//i.test(safe)) return safe;
  if (safe.includes(MANAGED_AVATAR_PATH)) return safe;
  return `/api/avatar?src=${encodeURIComponent(safe)}`;
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
  const resolvedSrc = resolveAvatarSrc(src);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolvedSrc]);

  const showImg = resolvedSrc && !broken;
  return (
    <Circle $size={size} className={className}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </Circle>
  );
}
