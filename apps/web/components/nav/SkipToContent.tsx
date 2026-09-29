"use client";

import styled from "styled-components";
import { Z } from "@/lib/z";

const Link = styled.a`
  position: absolute;
  left: 8px;
  top: -100px;
  z-index: ${Z.skipLink};
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 700;

  &:focus {
    top: 8px;
  }
`;

export function SkipToContent() {
  return <Link href="#main">Skip to content</Link>;
}
