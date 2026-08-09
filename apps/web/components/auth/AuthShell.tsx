"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, ShieldCheck, Users, Wallet } from "lucide-react";
import { Brand } from "@/components/ui/Brand";
import { AnimatedHeading } from "@/components/anim/AnimatedHeading";
import { Reveal } from "@/components/anim/Reveal";
import { KenyaFlag } from "./KenyaFlag";

/* Panel palette — deep brand green, cream ink, lime pop. Independent of the
   light/dark app theme so the left rail is always striking. */
const PANEL = {
  bg: "#0c3b28",
  ink: "#f2f7ee",
  muted: "#a9c6b3",
  lime: "#dcffab",
  line: "rgba(255,255,255,0.12)",
};

const Grid = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 1fr;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.aside`
  position: relative;
  overflow: hidden;
  background: ${PANEL.bg};
  color: ${PANEL.ink};
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media (max-width: 960px) {
    display: none;
  }
`;

/* Repeated Kipita car-icon motif (cream on deep green) — texture, not noise. */
const Texture = styled.div`
  position: absolute;
  inset: 0;
  background-image: url("/backgrounds/white.svg");
  background-size: 460px;
  background-repeat: repeat;
  opacity: 0.12;
  mask-image: linear-gradient(200deg, #000 10%, transparent 85%);
  pointer-events: none;
`;

/* Wrapper styles the heading by tag to avoid clashing with AnimatedHeading's
   own `as` prop (styled() would intercept `as`). */
const PanelHeadWrap = styled.div`
  position: relative;
  h2 {
    font-size: clamp(2.4rem, 3.6vw, 3.4rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
    font-weight: 800;
    margin: 0 0 18px;
  }
`;

const PanelLead = styled.p`
  position: relative;
  max-width: 34ch;
  font-size: 1.08rem;
  line-height: 1.55;
  color: ${PANEL.muted};
  margin: 0 0 34px;
`;

const Benefits = styled.ul`
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
`;

const Benefit = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
  font-weight: 600;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    color: ${PANEL.lime};
    flex: none;
  }
`;

const Proof = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: ${PANEL.muted};
  padding-top: 26px;
  border-top: 1px solid ${PANEL.line};
`;

const Right = styled.main`
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.bg};
  padding: 28px clamp(20px, 5vw, 40px) 48px;
  overflow-y: auto;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: auto;
`;

/* Brand shows in the form column only when the rail is hidden (mobile). */
const MobileBrand = styled(Brand)`
  display: none;
  @media (max-width: 960px) {
    display: inline-flex;
  }
`;

const HomeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.textSoft};
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const FormArea = styled.div`
  width: 100%;
  max-width: 420px;
  margin: 40px auto;

  @media (max-width: 960px) {
    margin: 32px auto;
  }
`;

/** Two-pane auth layout: immersive brand rail + focused form column. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Grid>
      <Panel>
        <Texture />
        <Brand href="/" light priority />

        <div>
          <PanelHeadWrap>
            <AnimatedHeading as="h2" immediate text={"Ride. Share.\nGet there together."} />
          </PanelHeadWrap>
          <PanelLead>
            Kipita matches you with people going your way — cheaper trips, real
            faces, paid safely with M-Pesa.
          </PanelLead>
          <Reveal delay={0.3} stagger={0.12}>
            <Benefits>
              <Benefit>
                <span>
                  <Wallet size={20} strokeWidth={2.2} />
                </span>
                Split the cost, keep more in your pocket
              </Benefit>
              <Benefit>
                <span>
                  <ShieldCheck size={20} strokeWidth={2.2} />
                </span>
                Verified riders, escrow-held payments
              </Benefit>
              <Benefit>
                <span>
                  <Users size={20} strokeWidth={2.2} />
                </span>
                Meet people heading the same direction
              </Benefit>
            </Benefits>
          </Reveal>
        </div>

        <Proof>
          <KenyaFlag size={26} />
          Built in Kenya, for how Kenya moves.
        </Proof>
      </Panel>

      <Right>
        <TopBar>
          <MobileBrand href="/" priority />
          <HomeLink href="/">
            <ArrowLeft size={16} strokeWidth={2.4} />
            Back home
          </HomeLink>
        </TopBar>
        <FormArea>{children}</FormArea>
      </Right>
    </Grid>
  );
}
