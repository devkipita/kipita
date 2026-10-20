import { css } from "styled-components";
import { dur, ease } from "@/lib/motion";

export function pressable(tint = "var(--n-cta-bg)") {
  return css`
    cursor: pointer;
    transition:
      filter ${dur.short4}ms ${ease.standard},
      background ${dur.short4}ms ${ease.standard},
      color ${dur.short4}ms ${ease.standard},
      transform ${dur.short3}ms ${ease.emphasized},
      box-shadow ${dur.medium2}ms ${ease.emphasizedDecelerate};

    @media (hover: hover) {
      &:hover:not(:disabled) {
        filter: brightness(0.96);
        transform: translateY(-2px);
        box-shadow: 0 12px 26px -10px
          color-mix(in oklab, ${tint} 80%, transparent);
      }
    }
    &:active:not(:disabled) {
      transform: scale(0.97);
      box-shadow: none;
    }
    &:focus-visible {
      outline: 3px solid var(--n-accent);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition:
        filter ${dur.short4}ms ${ease.standard},
        background ${dur.short4}ms ${ease.standard},
        color ${dur.short4}ms ${ease.standard};

      &:hover:not(:disabled),
      &:active:not(:disabled) {
        transform: none;
      }
    }
  `;
}

export const scanGlyph = css`
  svg {
    transition: transform ${dur.medium3}ms ${ease.emphasized};
  }

  @media (hover: hover) {
    &:hover:not(:disabled) svg {
      transform: scale(1.12) rotate(-10deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
    &:hover:not(:disabled) svg {
      transform: none;
    }
  }
`;
