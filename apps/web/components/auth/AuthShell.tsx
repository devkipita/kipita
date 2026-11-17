"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowLeft, ShieldCheck, Users, Wallet } from "@/components/icons";
import { Brand } from "@/components/ui/Brand";
import { AnimatedHeading } from "@/components/anim/AnimatedHeading";
import { Reveal } from "@/components/anim/Reveal";
import { KenyaFlag } from "@/components/ui/KenyaFlag";
import { nocturne } from "@/lib/nocturne";

const PANEL = {
  bg: nocturne.greenDeep,
  ink: nocturne.onGreen,
  muted: nocturne.onGreenMuted,
  lime: nocturne.lime,
  line: `color-mix(in srgb, ${nocturne.onGreen} 14%, transparent)`,
  chip: `color-mix(in srgb, ${nocturne.onGreen} 9%, transparent)`,
};

const Grid = styled.div`
  min-height: 100dvh;
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

const Texture = styled.div`
  position: absolute;
  inset: -10%;
  background-image: url("/backgrounds/white.svg");
  background-size: 760px;
  background-repeat: repeat;
  background-position: -60px -40px;
  opacity: 0.07;
  transform: rotate(-8deg);
  mask-image: radial-gradient(
    115% 85% at 18% 12%,
    black 0%,
    color-mix(in srgb, black 45%, transparent) 42%,
    transparent 72%
  );
  pointer-events: none;
`;

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
    background: ${PANEL.chip};
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
            Kipita matches you with people going your way. Cheaper trips, real
            faces, paid safely with M-Pesa.
          </PanelLead>
          <Reveal delay={0.3} stagger={0.12}>
            <Benefits>
              <Benefit>
                <span>
                  <Wallet size={20} />
                </span>
                Split the cost, keep more in your pocket
              </Benefit>
              <Benefit>
                <span>
                  <ShieldCheck size={20} />
                </span>
                Verified riders, escrow-held payments
              </Benefit>
              <Benefit>
                <span>
                  <Users size={20} />
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
            <ArrowLeft size={16} />
            Back home
          </HomeLink>
        </TopBar>
        <FormArea>{children}</FormArea>
      </Right>
    </Grid>
  );
}

