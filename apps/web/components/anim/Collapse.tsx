"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { dur, ease } from "@/lib/nocturne";

const Outer = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    grid-template-rows ${({ $open }) => ($open ? `${dur.enter} ${ease.enter}` : `${dur.exit} ${ease.exit}`)},
    opacity ${({ $open }) => ($open ? `${dur.enter} ${ease.standard}` : `${dur.exit} ${ease.exit}`)};
`;

const Inner = styled.div`
  min-height: 0;
  overflow: hidden;
`;

export function Collapse({
  open,
  id,
  children,
}: {
  open: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <Outer $open={open} id={id} inert={!open} aria-hidden={!open}>
      <Inner>{children}</Inner>
    </Outer>
  );
}
