"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styled from "styled-components";
import { useIsoLayoutEffect } from "@/components/anim/useIsoLayoutEffect";
import { palette } from "@/lib/theme";
import {
  AlertsArt,
  EscrowArt,
  MpesaArt,
  VerifiedArt,
  Wireframe,
} from "./WhyArt";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The one place this page spends its boldness.
 *
 * A full-bleed warm wash, cards in deliberately different colours and sizes on
 * top of it, and a headline that is the entire message — no supporting
 * paragraph anywhere. Each card carries a drawing of its own claim.
 *
 * The cards assemble on scroll: the tall card starts larger and tilted in 3D,
 * the others start displaced toward the edges, and everything settles into the
 * grid as the section comes up. It is one scrubbed timeline, so scrolling back
 * takes it apart again.
 */

/*
 * Edge to edge of the window, not of the content column. The band is nested
 * several layouts deep, so it breaks out with the full-bleed trick rather than
 * relying on an ancestor being full width. `<main>` carries `overflow-x: clip`
 * so the extra width never produces a horizontal scrollbar — clip rather than
 * hidden, because hidden would make main a scroll container and break the
 * sticky rail.
 */
const Block = styled.section`
  position: relative;
  left: 50%;
  width: 100vw;
  margin-left: -50vw;
  padding-block: clamp(44px, 6vw, 96px);
  /* The wash runs the whole width, but its content starts after the sticky
     rail — padding sits inside the background box, so the colour still reaches
     the left edge while nothing is hidden underneath the nav. */
  padding-left: var(--rail-w, 0px);
  background: ${palette.orangeLight};
  overflow: hidden;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding-inline: var(--page-pad);
  display: grid;
  gap: clamp(24px, 3vw, 40px);
`;

const Head = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: clamp(2.1rem, 5vw, 3.6rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1;
    color: ${palette.orangeDeep};
  }
  p {
    margin: 0;
    font-size: clamp(1rem, 1.4vw, 1.15rem);
    font-weight: 600;
    color: ${palette.orangeDark};
  }
`;

const Bento = styled.div`
  display: grid;
  gap: clamp(12px, 1.4vw, 20px);
  grid-template-columns: 1.06fr 1fr 1fr;
  grid-template-areas:
    "escrow verified mpesa"
    "escrow alerts   alerts";
  perspective: 1600px;

  @media (max-width: 940px) {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "escrow escrow"
      "verified mpesa"
      "alerts alerts";
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "escrow"
      "verified"
      "mpesa"
      "alerts";
  }
`;

interface Skin {
  area: string;
  bg: string;
  ink: string;
  accent: string;
  surface: string;
}

const Card = styled.article<{ $skin: Skin; $tall?: boolean }>`
  position: relative;
  grid-area: ${({ $skin }) => $skin.area};
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  padding: clamp(20px, 2.2vw, 32px);
  border-radius: clamp(20px, 2vw, 30px);
  background: ${({ $skin }) => $skin.bg};
  color: ${({ $skin }) => $skin.ink};
  min-height: ${({ $tall }) => ($tall ? "440px" : "256px")};
  transform-style: preserve-3d;

  --art-ink: ${({ $skin }) => $skin.ink};
  --art-accent: ${({ $skin }) => $skin.accent};
  --art-surface: ${({ $skin }) => $skin.surface};

  h3 {
    position: relative;
    margin: 0;
    font-size: ${({ $tall }) =>
      $tall
        ? "clamp(1.85rem, 2.8vw, 2.6rem)"
        : "clamp(1.45rem, 1.95vw, 1.85rem)"};
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.05;
    max-width: 15ch;
    text-wrap: balance;
  }

  .art {
    position: relative;
    margin-top: auto;
  }
`;

const SKINS: Record<string, Skin> = {
  escrow: {
    area: "escrow",
    bg: palette.purpleDark,
    ink: "#ffffff",
    accent: palette.purpleLight,
    surface: "rgba(255,255,255,0.09)",
  },
  verified: {
    area: "verified",
    bg: palette.purpleLight,
    ink: palette.purpleDeep,
    accent: palette.purpleDark,
    surface: "#ffffff",
  },
  mpesa: {
    area: "mpesa",
    bg: palette.limeLight,
    ink: palette.limeDark,
    accent: palette.limeDark,
    surface: "#ffffff",
  },
  alerts: {
    area: "alerts",
    bg: palette.blueLight,
    ink: palette.blueDark,
    accent: palette.blueDark,
    surface: "#ffffff",
  },
};

export function WhyKipita() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const hero = el.querySelector("[data-why='hero']");
      const sides = gsap.utils.toArray<HTMLElement>("[data-why='side']");
      if (!hero) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 92%",
          end: "top 25%",
          scrub: 0.6,
        },
      });

      tl.from(
        hero,
        {
          scale: 1.16,
          rotateY: -18,
          rotateX: 7,
          yPercent: 12,
          transformOrigin: "50% 100%",
          ease: "none",
        },
        0,
      ).from(
        sides,
        {
          yPercent: 26,
          opacity: 0,
          scale: 0.94,
          stagger: 0.08,
          ease: "none",
        },
        0.04,
      );

      gsap.from(el.querySelector("h2"), {
        yPercent: 40,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
          end: "top 55%",
          scrub: 0.6,
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <Block ref={root} aria-labelledby="why-kipita">
      <Inner>
        <Head>
          <h2 id="why-kipita">Why kipita.co.ke?</h2>
          <p>On every trip you book.</p>
        </Head>

        <Bento>
          <Card $skin={SKINS.escrow} $tall data-why="hero">
            <Wireframe />
            <h3>Your fare is held until you arrive</h3>
            <div className="art">
              <EscrowArt />
            </div>
          </Card>

          <Card $skin={SKINS.verified} data-why="side">
            <h3>Licence and ID checked before anyone drives you</h3>
            <div className="art">
              <VerifiedArt />
            </div>
          </Card>

          <Card $skin={SKINS.mpesa} data-why="side">
            <h3>Pay with M&#8209;Pesa, the way you already do</h3>
            <div className="art">
              <MpesaArt />
            </div>
          </Card>

          <Card $skin={SKINS.alerts} data-why="side">
            <h3>Road alerts from travellers ahead of you</h3>
            <div className="art">
              <AlertsArt />
            </div>
          </Card>
        </Bento>
      </Inner>
    </Block>
  );
}
