"use client";

import styled from "styled-components";
import { VerifiedBadge } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

const Mark = styled.span`
  display: inline-grid;
  place-items: center;
  flex: none;
  color: ${nocturne.accent};
  --badge-knockout: ${nocturne.surface};
`;

export function VerifiedMark({ verified }: { verified?: boolean }) {
  if (!verified) return null;
  return (
    <Mark role="img" aria-label="Verified driver" title="Verified driver">
      <VerifiedBadge size={16} aria-hidden />
    </Mark>
  );
}
