"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

const Line = styled.span<{ $w: number }>`
  position: relative;
  flex: none;
  display: inline-block;
  width: ${({ $w }) => $w}px;
  height: 9px;
  margin: 0 2px;
  vertical-align: middle;

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 7px;
    height: 7px;
    margin-top: -3.5px;
    border-radius: 50%;
    border: 2px solid ${nocturne.ctaBg};
    box-sizing: content-box;
  }

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    right: 0;
    width: 0;
    height: 0;
    margin-top: -4px;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid ${nocturne.accent};
  }

  i {
    position: absolute;
    top: 50%;
    left: 13px;
    right: 5px;
    height: 0;
    border-top: 1.5px solid ${nocturne.line};
  }
`;

export function RouteLine({ width = 46 }: { width?: number }) {
  return (
    <Line $w={width} aria-hidden="true">
      <i />
    </Line>
  );
}
