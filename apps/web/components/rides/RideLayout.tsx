"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

export const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

export const BookPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(22px, 2.6vw, 28px);
  border-radius: 20px;
  background: ${nocturne.surface2};
`;
