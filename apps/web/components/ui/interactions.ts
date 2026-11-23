import { css } from "styled-components";
import { dur, ease } from "@/lib/nocturne";

export function pressable() {
  return css`
    cursor: pointer;
    transition:
      filter ${dur.state} ${ease.standard},
      background-color ${dur.state} ${ease.standard},
      color ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        filter: brightness(0.96);
      }
    }
    &:active:not(:disabled) {
      filter: brightness(0.92);
      transform: scale(0.97);
    }
    &:focus-visible {
      outline: 3px solid var(--n-accent);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      &:active:not(:disabled) {
        transform: none;
      }
    }
  `;
}
