"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";
import { ArrowRight, Camera, Car, Check, Lock, User, Warning, X } from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { submitDriverKycAction } from "@/lib/driver/actions";
import { signKycDocuments, uploadKycDocument, type KycDocument } from "@/lib/driver/documents";
import { createClient } from "@/lib/supabase/client";
import { KYC_DOCUMENTS, type KycDocumentType } from "@/lib/validators/home";

type Photo = { path: string; preview: string };
type Step = 0 | 1 | 2 | 3;

type KycProgress = {
  open: boolean;
  step: Step;
  docChosen: boolean;
  docType: KycDocumentType | null;
  docNumber: string;
  photos: Partial<Record<KycDocument, string>>;
};

const progressKey = (userId: string) => `kipita:kyc-progress:${userId}`;

export function readKycProgress(userId: string): KycProgress | null {
  try {
    const raw = window.localStorage.getItem(progressKey(userId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<KycProgress>;
    const step = p.step === 1 || p.step === 2 ? p.step : 0;
    const docType = p.docType && p.docType in KYC_DOCUMENTS ? p.docType : null;
    return {
      open: p.open === true,
      step: docType ? step : 0,
      docChosen: !!docType && (p.docChosen === true || step > 0),
      docType,
      docNumber: typeof p.docNumber === "string" ? p.docNumber : "",
      photos: p.photos && typeof p.photos === "object" ? p.photos : {},
    };
  } catch {
    return null;
  }
}

function writeKycProgress(userId: string, progress: KycProgress) {
  try {
    window.localStorage.setItem(progressKey(userId), JSON.stringify(progress));
  } catch {}
}

function clearKycProgress(userId: string) {
  try {
    window.localStorage.removeItem(progressKey(userId));
  } catch {}
}

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lift = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const Backdrop = styled.div<{ $drawer: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(10, 38, 28, 0.55);
  backdrop-filter: blur(6px);
  animation: ${fade} 0.2s ease-out;

  /* On a phone this stops being a dialog floating in the middle of the screen:
     picking a document is a drawer off the bottom edge, and every later step
     takes the whole screen. Verification is a task you finish and leave, so it
     carries its own header rather than borrowing the app's chrome. */
  @media (max-width: 899px) {
    padding: 0;
    align-items: ${({ $drawer }) => ($drawer ? "flex-end" : "stretch")};
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Dialog = styled.div<{ $drawer: boolean }>`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  max-width: 800px;
  max-height: 100%;
  overflow-y: auto;
  border-radius: 28px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: 0 40px 100px -30px rgba(10, 38, 28, 0.6);
  animation: ${lift} 0.28s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 899px) {
    flex-wrap: nowrap;
    flex-direction: column;
    max-width: none;
    box-shadow: none;
    overflow: hidden;
    ${({ $drawer }) =>
      $drawer
        ? css`
            border-radius: 24px 24px 0 0;
            max-height: 88dvh;
            animation: ${slideUp} 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          `
        : css`
            border-radius: 0;
            height: 100dvh;
            max-height: none;
          `}
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/** The grab handle that tells a thumb this panel came from the bottom edge. */
const Handle = styled.span`
  display: none;

  @media (max-width: 899px) {
    display: block;
    width: 40px;
    height: 4px;
    margin: 10px auto 0;
    border-radius: 2px;
    background: ${nocturne.line};
  }
`;

const Rail = styled.div`
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 28px 22px;
  box-sizing: border-box;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  .intro {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .intro button {
    display: none;
  }
  .intro b {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.015em;
    line-height: 1.25;
  }
  ol {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: auto;
    font-size: 13px;
    line-height: 1.5;
    color: ${nocturne.onGreenMuted};
  }
  .note svg {
    flex: none;
    margin-top: 1px;
    color: ${nocturne.lime};
  }

  @media (max-width: 899px) {
    flex: none;
    gap: 14px;
    padding: 14px 16px 16px;
    .intro {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .intro svg:first-child {
      width: 28px;
      height: 28px;
    }
    .intro b {
      flex: 1;
      font-size: 16px;
    }
    .intro button {
      display: grid;
    }
    ol {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .note {
      display: none;
    }
    /* The drawer only asks one question, so the step rail would be noise. */
    &[data-drawer="true"] {
      display: none;
    }
  }
`;

const RailItem = styled.li<{ $state: "done" | "on" | "todo" }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  background: ${({ $state }) => ($state === "on" ? "rgba(255,255,255,0.08)" : "transparent")};

  .dot {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    box-sizing: border-box;
    border-radius: 10px;
    border: 1.5px solid
      ${({ $state }) => ($state === "done" ? nocturne.lime : $state === "on" ? "#ffffff" : "rgba(255,255,255,0.3)")};
    background: ${({ $state }) => ($state === "done" ? nocturne.lime : $state === "on" ? "#ffffff" : "transparent")};
    color: ${({ $state }) => ($state === "todo" ? nocturne.onGreenMuted : "#0f3b2c")};
  }
  .label {
    font-size: 14px;
    font-weight: ${({ $state }) => ($state === "on" ? 800 : 600)};
    color: ${({ $state }) => ($state === "todo" ? nocturne.onGreenMuted : nocturne.onGreen)};
  }

  /* Equal, self-sized marks: letting them flex made the current step a wide
     lozenge beside two small squares, which reads as a rendering fault rather
     than as progress. */
  @media (max-width: 899px) {
    flex: none;
    padding: 0;
    background: transparent;
    .label {
      display: none;
    }
    .dot {
      width: 30px;
      height: 30px;
      border-radius: 9px;
    }
  }
`;

const RailClose = styled.button`
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: ${nocturne.onGreen};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const Content = styled.div`
  flex: 999 1 380px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px 28px 24px;
  box-sizing: border-box;

  .head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .head > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.green};
  }
  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
    outline: none;
  }
  .foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: auto;
    padding-top: 8px;
  }
  .foot .spacer {
    flex: 1;
  }

  @media (max-width: 899px) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));

    /* The green band above already carries the way out. */
    .head > button {
      display: none;
    }
    h2 {
      font-size: 21px;
    }

    /* Keeps the primary action reachable with a thumb however tall the step
       gets, and lets it take the width it deserves beside a quiet Back. */
    .foot {
      position: sticky;
      bottom: calc(-1 * env(safe-area-inset-bottom));
      flex-wrap: nowrap;
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
      margin-bottom: calc(-1 * env(safe-area-inset-bottom));
      background: ${nocturne.surface};
    }
    .foot .spacer {
      display: none;
    }
    .foot > button:last-child {
      flex: 1;
      justify-content: center;
    }
  }
`;

const Close = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: ${nocturne.surface3};
  color: ${nocturne.muted};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const DocOption = styled.button<{ $on: boolean; $bad: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 12px 16px;
  border: 1.5px solid ${({ $on, $bad }) => ($on ? nocturne.green : $bad ? nocturne.tan : nocturne.line)};
  border-radius: 16px;
  background: ${({ $on }) => ($on ? nocturne.surface2 : nocturne.surface)};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: ${({ $on }) => ($on ? nocturne.lime : nocturne.surface2)};
    color: ${nocturne.green};
  }
  .label {
    flex: 1;
    font-size: 16px;
    font-weight: 700;
  }
  .radio {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    box-sizing: border-box;
    border-radius: 11px;
    border: 2px solid ${({ $on }) => ($on ? nocturne.green : nocturne.muted3)};
  }
  .radio::after {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
  }
  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.green};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const NumberField = styled.input<{ $bad: boolean }>`
  width: 100%;
  height: 52px;
  box-sizing: border-box;
  padding: 0 16px;
  border: 1.5px solid ${({ $bad }) => ($bad ? nocturne.tan : nocturne.line)};
  border-radius: 14px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;

  &::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
  &:focus {
    outline: none;
    border-color: ${nocturne.green};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Frame = styled.div<{ $has: boolean; $bad: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;

  /* On a phone the frame takes the room the footer is not using, instead of
     holding a fixed 16:9 and leaving a dead band above the buttons. A bigger
     frame is also the right call here: this is where you check your own photo. */
  @media (max-width: 899px) {
    aspect-ratio: auto;
    flex: 1;
    min-height: 200px;
  }
  border-radius: 18px;
  border: 2px dashed ${({ $has, $bad }) => ($has ? "transparent" : $bad ? nocturne.tan : nocturne.muted3)};
  background: ${({ $has }) => ($has ? nocturne.greenDeep : nocturne.bg)};

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 16px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  .spinner {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: ${nocturne.surface};
    color: ${nocturne.green};
    box-shadow: 0 4px 12px -6px rgba(15, 59, 44, 0.3);
  }
  .corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border-color: ${nocturne.green};
    border-style: solid;
    border-width: 0;
  }
  .tl { top: 14px; left: 14px; border-top-width: 3px; border-left-width: 3px; border-radius: 6px 0 0 0; }
  .tr { top: 14px; right: 14px; border-top-width: 3px; border-right-width: 3px; border-radius: 0 6px 0 0; }
  .bl { bottom: 14px; left: 14px; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 6px; }
  .br { bottom: 14px; right: 14px; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 6px 0; }
  .added {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px 0 8px;
    border-radius: 15px;
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
    font-size: 13px;
    font-weight: 800;
  }
  .added svg {
    color: ${nocturne.lime};
  }
`;

/** Owns the slack on a phone so the frame grows instead of a gap opening. */
const PhotoStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 899px) {
    flex: 1;
    min-height: 0;
  }
`;

const PhotoActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
`;

const Btn = styled.button<{ $tone: "solid" | "outline" | "plain" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 50px;
  padding: 0 20px;
  border-radius: 14px;
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $tone }) => ($tone === "plain" ? 700 : 800)};
  white-space: nowrap;
  cursor: pointer;
  border: ${({ $tone }) =>
    $tone === "solid" ? "0" : $tone === "outline" ? `1.5px solid ${nocturne.green}` : `1.5px solid ${nocturne.line}`};
  background: ${({ $tone }) => ($tone === "solid" ? nocturne.green : nocturne.surface)};
  color: ${({ $tone }) => ($tone === "solid" ? nocturne.onGreen : $tone === "outline" ? nocturne.green : nocturne.cream)};

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const ErrorLine = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${nocturne.tan};

  svg {
    flex: none;
  }
`;

const drift = keyframes`
  0%, 100% { transform: rotate(var(--r)) translateY(0); }
  50% { transform: rotate(var(--r)) translateY(-5px); }
`;

const scan = keyframes`
  0% { top: 8%; }
  50% { top: 78%; }
  100% { top: 8%; }
`;

const tick = keyframes`
  0%, 8% { opacity: 0; transform: translateY(6px) scale(0.85); }
  16%, 88% { opacity: 1; transform: none; }
  100% { opacity: 0; }
`;

/**
 * What happens to the photos once they are sent, shown rather than described:
 * the three shots float while a scan line crosses the document and each check
 * lands in turn. It fills the wait on the final step, which was otherwise a
 * short paragraph above a lot of nothing.
 */
const Scene = styled.div`
  position: relative;
  height: 196px;
  border-radius: 20px;
  overflow: hidden;
  background: radial-gradient(120% 90% at 50% 100%, ${nocturne.surface2} 0%, ${nocturne.bg} 70%);

  /* The fan is authored at its drawn size and scaled down to fit, so a phone
     shows the whole arrangement instead of clipping the outer two cards. */
  .stage {
    position: absolute;
    left: 50%;
    top: 0;
    width: 384px;
    height: 196px;
    transform: translateX(-50%);
    transform-origin: top center;
  }

  @media (max-width: 520px) {
    height: 150px;
    .stage {
      transform: translateX(-50%) scale(0.74);
    }
  }
  @media (max-width: 380px) {
    height: 130px;
    .stage {
      transform: translateX(-50%) scale(0.64);
    }
  }

  .card {
    position: absolute;
    width: 168px;
    height: 108px;
    padding: 12px;
    box-sizing: border-box;
    border-radius: 14px;
    overflow: hidden;
    background: ${nocturne.surface};
    box-shadow: 0 12px 24px -12px rgba(15, 59, 44, 0.35);
    transform: rotate(var(--r));
    animation: ${drift} 4s ease-in-out infinite;
  }

  .selfie {
    --r: -12deg;
    left: 2px;
    top: 50px;
    z-index: 1;
    animation-delay: 0.4s;
  }
  .car {
    --r: 10deg;
    left: 216px;
    top: 48px;
    z-index: 2;
    animation-delay: 0.8s;
  }
  .doc {
    --r: -2deg;
    left: 108px;
    top: 34px;
    z-index: 3;
    animation-delay: 1.2s;
  }

  .fill {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
  }
  .head {
    width: 56px;
    height: 6px;
    margin-bottom: 10px;
    border-radius: 3px;
    background: ${nocturne.green};
  }
  .body {
    display: flex;
    gap: 10px;
  }
  .portrait {
    width: 42px;
    height: 52px;
    border-radius: 8px;
    background: ${nocturne.lime};
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
  }
  .face {
    border-radius: 50%;
    background: ${nocturne.green};
  }
  .lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-top: 4px;
  }
  .lines i {
    height: 7px;
    border-radius: 4px;
    background: ${nocturne.line};
  }
  .scan {
    position: absolute;
    left: 0;
    right: 0;
    height: 18px;
    background: linear-gradient(
      180deg,
      transparent,
      color-mix(in oklab, var(--n-lime) 90%, transparent) 50%,
      transparent
    );
    animation: ${scan} 2.4s ease-in-out infinite;
  }
  .plate {
    height: 12px;
    padding: 0 6px;
    border-radius: 3px;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
    font-size: 8px;
    font-weight: 800;
    line-height: 12px;
    letter-spacing: 0.08em;
  }

  .chip {
    position: absolute;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px 0 6px;
    border-radius: 14px;
    background: ${nocturne.surface};
    box-shadow: 0 6px 16px -8px rgba(15, 59, 44, 0.4);
    font-size: 12px;
    font-weight: 800;
    color: ${nocturne.greenDeep};
    opacity: 0;
    animation: ${tick} 6s ease-out infinite;
  }
  .chip span {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${nocturne.green};
    color: ${nocturne.lime};
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .scan,
    .chip {
      animation: none;
    }
    .chip {
      opacity: 1;
    }
  }
`;

const Timeline = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: 1px solid ${nocturne.line};
  border-radius: 16px;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid ${nocturne.line2};
  }
  li:last-child {
    border-bottom: 0;
  }
  .mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 26px;
    height: 26px;
    box-sizing: border-box;
    border-radius: 13px;
  }
  .label {
    flex: 1;
    font-size: 15px;
  }
  .meta {
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
`;

const CamStage = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: #000000;
  display: flex;
  flex-direction: column;

  .blocked {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px;
    text-align: center;
    color: #ffffff;
  }
  .blocked p {
    margin: 0;
    max-width: 340px;
    font-size: 15px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
  }
  .blocked button {
    min-width: 220px;
    height: 50px;
    padding: 0 20px;
    border: 0;
    border-radius: 14px;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
  }
  .blocked button + button {
    background: transparent;
    color: #ffffff;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
  }
`;

const Viewfinder = styled.div<{ $mirror: boolean }>`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #000000;

  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: ${({ $mirror }) => ($mirror ? "scaleX(-1)" : "none")};
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    padding: 24px 20px;
    pointer-events: none;
  }
  .title,
  .hint {
    position: relative;
    z-index: 1;
    margin: 0;
    max-width: 320px;
    text-align: center;
    color: #ffffff;
  }
  .title {
    font-family: var(--font-manrope), sans-serif;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .hint {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.82);
  }

  .guide {
    position: relative;
    flex: none;
    box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.62);
    border: 2px solid rgba(255, 255, 255, 0.92);
  }
  .guide.card {
    width: min(88%, 460px);
    aspect-ratio: 1.586;
    border-radius: 16px;
  }
  .guide.car {
    width: min(92%, 540px);
    aspect-ratio: 16 / 10;
    border-radius: 20px;
  }
  .guide.face {
    width: min(66%, 280px);
    aspect-ratio: 3 / 4;
    border-radius: 50%;
    border-width: 3px;
    border-style: dashed;
  }

  .corner {
    position: absolute;
    width: 28px;
    height: 28px;
    border: 0 solid ${nocturne.lime};
  }
  .tl { top: -4px; left: -4px; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 18px; }
  .tr { top: -4px; right: -4px; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 18px; }
  .bl { bottom: -4px; left: -4px; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 18px; }
  .br { bottom: -4px; right: -4px; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 18px; }

  .idcard {
    position: absolute;
    inset: 14% 8%;
    display: flex;
    align-items: center;
    gap: 8%;
    opacity: 0.4;
  }
  .idcard .photo {
    flex: none;
    width: 28%;
    aspect-ratio: 3 / 4;
    border: 2px dashed #ffffff;
    border-radius: 10px;
  }
  .idcard .lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .idcard i {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: #ffffff;
  }

  .car {
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 12%;
    width: 80%;
    height: auto;
    opacity: 0.45;
    stroke: #ffffff;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (max-height: 560px) {
    .overlay {
      gap: 12px;
    }
    .hint {
      display: none;
    }
  }
`;

const CamBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px calc(18px + env(safe-area-inset-bottom));
  background: #000000;
  color: #ffffff;

  > button:first-child,
  .spacer {
    flex: 1;
    min-width: 0;
  }
  > button:first-child {
    text-align: left;
  }
`;

const CamText = styled.button`
  border: 0;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
`;

const Shutter = styled.button`
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.4);
  background: ${nocturne.onGreen};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

type CameraProblem = "denied" | "missing" | "busy" | "insecure" | "unsupported" | "unknown";

const CAMERA_PROBLEMS: Record<CameraProblem, { title: string; text: string }> = {
  denied: {
    title: "Camera access is off",
    text: "Tap the camera or lock icon in the address bar, set Camera to Allow, then try again.",
  },
  missing: {
    title: "No camera found",
    text: "This device has no camera we can use. Upload a photo instead, or continue on your phone.",
  },
  busy: {
    title: "Your camera is in use",
    text: "Another app is using the camera. Close it, then try again.",
  },
  insecure: {
    title: "Camera needs a secure connection",
    text: "Open Kipita over https to use the camera here.",
  },
  unsupported: {
    title: "This browser can’t use the camera",
    text: "Update your browser, or upload a photo instead.",
  },
  unknown: {
    title: "The camera didn’t start",
    text: "Try again. If it keeps failing, upload a photo instead.",
  },
};

export function canUseLiveCamera() {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

export function CameraStage({
  facing,
  shape,
  hint,
  onShot,
  onCancel,
  onPhoneCamera,
  onUpload,
}: {
  facing: "user" | "environment";
  shape: "card" | "face" | "car";
  hint: string;
  onShot: (file: File) => void;
  onCancel: () => void;
  onPhoneCamera: () => void;
  onUpload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    let cancelled = false;

    async function open(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (err) {
        const name = (err as DOMException | undefined)?.name;
        if (name === "OverconstrainedError" || name === "NotReadableError" || name === "AbortError") {
          return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        throw err;
      }
    }

    async function start() {
      setLive(false);
      if (!window.isSecureContext) {
        setProblem("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem("unsupported");
        return;
      }
      try {
        const stream = await open();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setLive(true);
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException | undefined)?.name;
        setProblem(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "missing"
              : name === "NotReadableError"
                ? "busy"
                : "unknown",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing, attempt]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onShot(new File([blob], `kipita-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <CamStage
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {problem ? (
        <div className="blocked" role="alert">
          <Camera size={40} />
          <b>{CAMERA_PROBLEMS[problem].title}</b>
          <p>{CAMERA_PROBLEMS[problem].text}</p>
          {problem !== "insecure" && problem !== "unsupported" && (
            <button
              type="button"
              onClick={() => {
                setProblem(null);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          )}
          {touch && (
            <button type="button" onClick={onPhoneCamera}>
              Use phone camera app
            </button>
          )}
          <button type="button" onClick={onUpload}>
            Upload a photo instead
          </button>
        </div>
      ) : (
        <Viewfinder $mirror={facing === "user"}>
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="overlay">
            <p className="title">{shape === "face" ? "Your face in the oval" : shape === "car" ? "Your car in the frame" : "Your document in the frame"}</p>
            <div className={`guide ${shape}`} aria-hidden>
              {shape !== "face" && (
                <>
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />
                </>
              )}
              {shape === "card" && (
                <div className="idcard">
                  <span className="photo" />
                  <span className="lines">
                    <i style={{ width: "78%" }} />
                    <i style={{ width: "62%" }} />
                    <i style={{ width: "70%" }} />
                    <i style={{ width: "44%" }} />
                  </span>
                </div>
              )}
              {shape === "car" && (
                <svg className="car" viewBox="0 0 200 90" fill="none">
                  <path d="M14 70V52l18-24h82l24 24h36a10 10 0 0 1 10 10v8" />
                  <path d="M14 70h172" />
                  <path d="M44 50l12-16h40v16zM106 50V34h22l16 16z" />
                  <circle cx="52" cy="70" r="11" />
                  <circle cx="150" cy="70" r="11" />
                  <rect x="82" y="56" width="36" height="12" rx="2" />
                </svg>
              )}
            </div>
            <p className="hint">{hint}</p>
          </div>
        </Viewfinder>
      )}
      <CamBar>
        <CamText type="button" onClick={onCancel}>
          Cancel
        </CamText>
        <Shutter type="button" aria-label="Take the photo" disabled={!live} onClick={shoot} />
        <span className="spacer" aria-hidden />
      </CamBar>
    </CamStage>
  );
}

const SrOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

/**
 * What the photo should look like, drawn rather than described.
 *
 * Joins the `MoneyArt` / `WhyArt` / `StageArt` family: flat geometry, stroked
 * not filled, one ground ellipse for depth, every value a theme token so one
 * drawing serves light and dark. The caption beside each one carries the
 * meaning, so these are hidden from assistive tech.
 */
const Art = styled.svg`
  display: block;
  width: min(168px, 46%);
  height: auto;

  /* Light linework carrying real colour: the weight comes from the tinted
     fills, not from thick outlines, so the drawing reads at a glance without
     looking zoomed in. */
  .ink {
    stroke: ${({ theme }) => theme.color.outline};
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ink-fill {
    fill: ${({ theme }) => theme.color.outline};
  }
  .thin {
    stroke-width: 1.3;
  }
  .accent {
    stroke: ${({ theme }) => theme.color.primary};
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .accent-fill {
    fill: ${({ theme }) => theme.color.primary};
  }
  .wash {
    fill: ${({ theme }) => theme.color.primaryContainer};
  }
  .pop {
    fill: ${nocturne.lime};
  }
`;

function Ground({ cx, rx }: { cx: number; rx: number }) {
  return <ellipse cx={cx} cy="118" rx={rx} ry="5" className="ink-fill" fillOpacity="0.08" />;
}

export function DocumentArt() {
  return (
    <Art viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false">
      <Ground cx={90} rx={60} />
      <rect x="26" y="24" width="128" height="82" rx="12" className="wash" />
      <rect x="26" y="24" width="128" height="82" rx="12" className="ink" />
      <rect x="26" y="24" width="128" height="16" rx="12" className="accent-fill" fillOpacity="0.9" />
      <rect x="26" y="34" width="128" height="6" className="accent-fill" fillOpacity="0.9" />
      <rect x="40" y="52" width="36" height="40" rx="7" className="pop" />
      <rect x="40" y="52" width="36" height="40" rx="7" className="accent" />
      <circle cx="58" cy="66" r="7.5" className="accent-fill" />
      <path d="M46 88c1.5-7 5.5-11 12-11s10.5 4 12 11" className="accent-fill" />
      <rect x="90" y="56" width="50" height="6" rx="3" className="accent-fill" fillOpacity="0.5" />
      <rect x="90" y="70" width="40" height="6" rx="3" className="ink-fill" fillOpacity="0.28" />
      <rect x="90" y="84" width="46" height="6" rx="3" className="ink-fill" fillOpacity="0.28" />
    </Art>
  );
}

export function SelfieArt() {
  return (
    <Art viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false">
      <Ground cx={90} rx={50} />
      <rect x="34" y="16" width="112" height="90" rx="16" className="wash" />
      <rect x="34" y="16" width="112" height="90" rx="16" className="ink" />
      <ellipse cx="90" cy="62" rx="33" ry="37" className="accent" strokeDasharray="7 8" />
      <path d="M68 100c3-14 10-21 22-21s19 7 22 21" className="accent-fill" />
      <circle cx="90" cy="55" r="13.5" className="accent-fill" />
      <circle cx="90" cy="55" r="13.5" className="pop" fillOpacity="0.35" />
    </Art>
  );
}

export function CarArt() {
  return (
    <Art viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false">
      <Ground cx={90} rx={64} />
      <path d="M26 88V64l14-20h58l16 20h16a8 8 0 0 1 8 8v16z" className="accent-fill" fillOpacity="0.9" />
      <path d="M46 62l8-12h26v12zM88 62V50h18l10 12z" className="pop" />
      <circle cx="58" cy="88" r="12" className="ink-fill" fillOpacity="0.85" />
      <circle cx="58" cy="88" r="4.5" className="wash" />
      <circle cx="120" cy="88" r="12" className="ink-fill" fillOpacity="0.85" />
      <circle cx="120" cy="88" r="4.5" className="wash" />
      <rect x="70" y="98" width="46" height="16" rx="3" className="pop" />
      <rect x="70" y="98" width="46" height="16" rx="3" className="ink" />
      <path d="M79 106h28" className="ink thin" />
    </Art>
  );
}

function IdIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3" />
    </svg>
  );
}

function LicenceIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h10M7 14h6" />
    </svg>
  );
}

function PassportIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 16h6" />
    </svg>
  );
}

export function VerifiedBadgeIcon({ size = 18, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg role="img" aria-label="Verified driver" width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none" }}>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={onDark ? "var(--n-lime)" : "var(--n-green)"}
      />
      <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke={onDark ? "var(--n-green-deep)" : "#ffffff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DOC_ICONS: Record<KycDocumentType, ReactNode> = {
  national_id: <IdIcon />,
  driving_licence: <LicenceIcon />,
  passport: <PassportIcon />,
};

export function DriverKycForm({
  open,
  userId,
  rejected = false,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  userId: string | null;
  rejected?: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [docChosen, setDocChosen] = useState(false);
  const [docType, setDocType] = useState<KycDocumentType | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<KycDocument, Photo>>>({});
  const [uploading, setUploading] = useState<KycDocument | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    setTried(false);
    setError("");
    const saved = userId ? readKycProgress(userId) : null;
    if (saved) {
      setStep(saved.step);
      setDocChosen(saved.docChosen);
      setDocType(saved.docType);
      setDocNumber(saved.docNumber);
      const paths = Object.values(saved.photos).filter((p): p is string => !!p);
      if (paths.length > 0) {
        void signKycDocuments(createClient(), paths).then((urls) => {
          setPhotos((current) => {
            const next = { ...current };
            for (const [slot, path] of Object.entries(saved.photos) as [KycDocument, string | undefined][]) {
              if (!path || next[slot]?.path === path || !urls[path]) continue;
              next[slot] = { path, preview: urls[path] };
            }
            return next;
          });
        });
      }
    } else {
      setStep(0);
      setDocChosen(false);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (userId) {
        const left = readKycProgress(userId);
        if (left) writeKycProgress(userId, { ...left, open: false });
      }
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId || step > 2) return;
    writeKycProgress(userId, {
      open: true,
      step,
      docChosen,
      docType,
      docNumber,
      photos: {
        document: photos.document?.path,
        selfie: photos.selfie?.path,
        vehicle: photos.vehicle?.path,
      },
    });
  }, [open, userId, step, docChosen, docType, docNumber, photos]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (step === 0 && docChosen) numberRef.current?.focus();
      else titleRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, step, docChosen]);

  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );

  if (!open || typeof document === "undefined") return null;

  const doc = docType ? KYC_DOCUMENTS[docType] : null;
  const docOk = !!doc && doc.pattern.test(docNumber);
  const slot: KycDocument | null = step === 0 ? (docChosen ? "document" : null) : step === 1 ? "selfie" : step === 2 ? "vehicle" : null;
  const current = slot ? photos[slot] : undefined;
  const choosing = step === 0 && !docChosen;
  const photoStep = !!slot;

  const titles = [
    docChosen && doc ? `Your ${doc.label.toLowerCase()}` : "Choose a document",
    "Your profile photo",
    "Photo of your car",
    "Thanks, we’re checking your details",
  ];
  const frameText =
    step === 0 ? (doc ? doc.frame : "") : step === 1 ? "Face the camera, no hat or sunglasses" : "Whole car with the number plate visible";

  async function onFile(file: File | undefined) {
    if (!file || !slot) return;
    if (!userId) {
      setError("Your session expired. Sign in again.");
      return;
    }
    setError("");
    setUploading(slot);
    const preview = URL.createObjectURL(file);
    previews.current.push(preview);
    const result = await uploadKycDocument(createClient(), file, userId, slot);
    setUploading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTried(false);
    setPhotos((p) => ({ ...p, [slot]: { path: result.path, preview } }));
  }

  async function submit() {
    if (!docType || !photos.document || !photos.selfie || !photos.vehicle) return;
    setSending(true);
    setError("");
    const result = await submitDriverKycAction({
      document_type: docType,
      document_number: docNumber,
      document_photo: photos.document.path,
      selfie_photo: photos.selfie.path,
      vehicle_photo: photos.vehicle.path,
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (userId) clearKycProgress(userId);
    setStep(3);
    onSubmitted();
  }

  function openCamera() {
    if (canUseLiveCamera()) {
      setCamOpen(true);
      return;
    }
    camRef.current?.click();
  }

  function closeCamera() {
    setCamOpen(false);
  }

  function primary() {
    if (choosing) {
      if (!docType) return setTried(true);
      setTried(false);
      setDocChosen(true);
      return;
    }
    if (step === 0) {
      if (!docOk || !current) return setTried(true);
      setTried(false);
      return setStep(1);
    }
    if (step === 1) {
      if (!current) return setTried(true);
      setTried(false);
      return setStep(2);
    }
    if (step === 2) {
      if (!current) return setTried(true);
      void submit();
      return;
    }
    onClose();
  }

  function secondary() {
    setTried(false);
    setError("");
    if (choosing) return onClose();
    // Once it is sent there is nothing left to do here, so the quiet action
    // takes them to the rides that are waiting on it.
    if (step === 3) {
      onClose();
      window.location.assign("/trips");
      return;
    }
    if (step === 0) return setDocChosen(false);
    setStep((s) => (s - 1) as Step);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && !sending) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const els = [...e.currentTarget.querySelectorAll<HTMLElement>("button, input:not([type=file]), [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
    if (els.length === 0) return;
    const first = els[0]!;
    const last = els[els.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const railSteps = ["Document", "Profile photo", "Car photo"];
  const primaryLabel = choosing
    ? "Continue"
    : step === 0
      ? "Next: profile photo"
      : step === 1
        ? "Next: car photo"
        : step === 2
          ? "Submit for review"
          : "Done";
  const secondaryLabel = choosing ? "Cancel" : step === 3 ? "View my rides" : "Back";

  // Picking a document is one short question, so on a phone it arrives as a
  // drawer. Everything after it is a page of its own.
  const drawer = choosing;

  return createPortal(
    <Backdrop $drawer={drawer} onClick={() => !sending && onClose()}>
      <Dialog
        $drawer={drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        {drawer && <Handle aria-hidden />}
        <SrOnly aria-live="polite">{step <= 2 ? `Step ${step + 1} of 3: ${railSteps[step]}` : "Submitted for review"}</SrOnly>

        <Rail data-drawer={drawer}>
          <div className="intro">
            <VerifiedBadgeIcon size={40} onDark />
            <b>{rejected ? "Send your details again" : "Get your verified badge"}</b>
            {/* On a phone this green band is the page header, so it owns the
                way out. The one in Content takes over on wide screens. */}
            <RailClose type="button" aria-label="Close verification" onClick={onClose} disabled={sending}>
              <X size={18} weight="bold" />
            </RailClose>
          </div>
          <ol aria-label="Verification steps">
            {railSteps.map((label, i) => {
              const state = step > i ? "done" : step === i ? "on" : "todo";
              return (
                <RailItem key={label} $state={state} aria-current={state === "on" ? "step" : undefined}>
                  <span className="dot" aria-hidden>
                    {state === "done" ? <Check size={16} weight="bold" /> : i === 0 ? <IdIcon size={18} /> : i === 1 ? <User size={18} /> : <Car size={18} />}
                  </span>
                  <span className="label">{label}</span>
                </RailItem>
              );
            })}
          </ol>
          <div className="note">
            <Lock size={16} />
            Never shown to passengers.
          </div>
        </Rail>

        <Content>
          <div className="head">
            <div>
              <h2 id="kyc-title" ref={titleRef} tabIndex={-1}>
                {titles[step]}
              </h2>
            </div>
            <Close type="button" aria-label="Close verification" onClick={onClose} disabled={sending}>
              <X size={18} weight="bold" />
            </Close>
          </div>

          {rejected && step === 0 && !docChosen && (
            <ErrorLine>
              <Warning size={16} />
              We couldn’t verify your last details. Send clear photos and check the number.
            </ErrorLine>
          )}

          {choosing && (
            <div role="radiogroup" aria-labelledby="kyc-title" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.keys(KYC_DOCUMENTS) as KycDocumentType[]).map((key) => (
                <DocOption
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={docType === key}
                  $on={docType === key}
                  $bad={tried && !docType}
                  onClick={() => {
                    if (docType !== key) {
                      setDocNumber("");
                      setPhotos((p) => ({ ...p, document: undefined }));
                    }
                    setDocType(key);
                    setTried(false);
                  }}
                >
                  <span className="icon">{DOC_ICONS[key]}</span>
                  <span className="label">{KYC_DOCUMENTS[key].label}</span>
                  <span className="radio" aria-hidden />
                </DocOption>
              ))}
              {tried && !docType && (
                <ErrorLine role="alert">
                  <Warning size={16} />
                  Choose a document to continue.
                </ErrorLine>
              )}
            </div>
          )}

          {photoStep && (
            <PhotoStep>
              {step === 0 && doc && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="kyc-number" style={{ fontSize: 14, fontWeight: 700 }}>
                    {doc.number}
                  </label>
                  <NumberField
                    id="kyc-number"
                    ref={numberRef}
                    inputMode={doc.inputMode}
                    value={docNumber}
                    placeholder={doc.placeholder}
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={tried && !docOk}
                    aria-describedby={tried && !docOk ? "kyc-number-error" : undefined}
                    $bad={tried && !docOk}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                      setDocNumber(docType === "national_id" ? v.replace(/\D/g, "").slice(0, 9) : v);
                    }}
                  />
                  {tried && !docOk && (
                    <ErrorLine id="kyc-number-error" role="alert" style={{ fontSize: 13 }}>
                      {doc.error}
                    </ErrorLine>
                  )}
                </div>
              )}

              <Frame $has={!!current} $bad={tried && !current}>
                {current ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={current.preview} alt={step === 0 ? `Photo of your ${doc?.label.toLowerCase() ?? "document"}` : step === 1 ? "Your profile photo" : "Photo of your car"} />
                    <span className="added">
                      <Check size={14} weight="bold" />
                      Photo added
                    </span>
                  </>
                ) : (
                  <>
                    <div className="empty">
                      {uploading === slot ? (
                        <span className="spinner">
                          <ButtonOrb job="committing" />
                        </span>
                      ) : step === 1 ? (
                        <SelfieArt />
                      ) : step === 2 ? (
                        <CarArt />
                      ) : (
                        <DocumentArt />
                      )}
                      <span>{uploading === slot ? "Uploading…" : frameText}</span>
                    </div>
                    <span className="corner tl" aria-hidden />
                    <span className="corner tr" aria-hidden />
                    <span className="corner bl" aria-hidden />
                    <span className="corner br" aria-hidden />
                  </>
                )}
              </Frame>

              <PhotoActions>
                <Btn type="button" $tone="solid" disabled={!!uploading} onClick={openCamera}>
                  <Camera size={20} />
                  {current ? "Retake photo" : "Take photo"}
                </Btn>
                <Btn type="button" $tone="outline" disabled={!!uploading} onClick={() => fileRef.current?.click()}>
                  <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4M7 9l5-5 5 5" />
                    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                  </svg>
                  {current ? "Choose another" : "Upload from device"}
                </Btn>
              </PhotoActions>
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture={step === 1 ? "user" : "environment"}
                tabIndex={-1}
                aria-hidden
                style={{ display: "none" }}
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                tabIndex={-1}
                aria-hidden
                style={{ display: "none" }}
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {tried && !current && !uploading && (
                <ErrorLine role="alert">
                  <Warning size={16} />
                  Add a photo to continue.
                </ErrorLine>
              )}
            </PhotoStep>
          )}

          {step === 3 && (
            <>
              <Scene aria-hidden>
                <div className="stage">
                <div className="card selfie">
                  <div className="fill" style={{ background: "var(--n-surface-2)" }}>
                    <span className="face" style={{ width: 60, height: 60, marginBottom: -22 }} />
                  </div>
                </div>

                <div className="card car">
                  <div
                    className="fill"
                    style={{
                      background: "var(--n-green-deep)",
                      color: "var(--n-lime)",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Car size={42} />
                    <span className="plate">KDA 456B</span>
                  </div>
                </div>

                <div className="card doc">
                  <div className="head" />
                  <div className="body">
                    <div className="portrait">
                      <span className="face" style={{ width: 26, height: 26, marginBottom: -8 }} />
                    </div>
                    <div className="lines">
                      <i style={{ width: "90%" }} />
                      <i style={{ width: "70%" }} />
                      <i style={{ width: "80%" }} />
                      <i style={{ width: "50%" }} />
                    </div>
                  </div>
                  <div className="scan" />
                </div>

                <span className="chip" style={{ left: 42, top: 14, animationDelay: "0.3s" }}>
                  <span>
                    <Check size={10} weight="bold" />
                  </span>
                  Document readable
                </span>
                <span className="chip" style={{ left: 232, top: 18, animationDelay: "1.6s" }}>
                  <span>
                    <Check size={10} weight="bold" />
                  </span>
                  Face matches
                </span>
                <span className="chip" style={{ left: 152, top: 158, animationDelay: "2.9s" }}>
                  <span>
                    <Check size={10} weight="bold" />
                  </span>
                  Plate matches
                </span>
                </div>
              </Scene>

              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--n-muted)" }}>
                Your ride goes live as soon as verification clears. We’ll notify you.
              </p>
              <Timeline>
                {[
                  ["Details and photos sent", "Just now"],
                  ["Verification", "In review"],
                  ["Your ride goes live", "Once verified"],
                ].map(([label, meta], i) => (
                  <li key={label}>
                    <span
                      className="mark"
                      style={{
                        background: i === 0 ? "var(--n-green)" : i === 1 ? "var(--n-lime)" : "var(--n-surface)",
                        border: `1.5px solid ${i === 0 ? "var(--n-green)" : i === 1 ? "var(--n-sage)" : "var(--n-line)"}`,
                        color: "#ffffff",
                      }}
                    >
                      {i === 0 && <Check size={13} weight="bold" />}
                    </span>
                    <span className="label" style={{ fontWeight: i <= 1 ? 800 : 600 }}>
                      {label}
                    </span>
                    <span className="meta">{meta}</span>
                  </li>
                ))}
              </Timeline>
            </>
          )}

          {error && (
            <ErrorLine role="alert">
              <Warning size={16} />
              {error}
            </ErrorLine>
          )}

          <div className="foot">
            <Btn type="button" $tone="plain" onClick={secondary} disabled={sending}>
              {secondaryLabel}
            </Btn>
            <span className="spacer" />
            <Btn type="button" $tone="solid" onClick={primary} disabled={sending || !!uploading} aria-busy={sending}>
              {sending ? (
                <>
                  <ButtonOrb job="committing" /> Sending…
                </>
              ) : (
                <>
                  {primaryLabel}
                  <ArrowRight size={18} weight="bold" />
                </>
              )}
            </Btn>
          </div>
        </Content>
      </Dialog>

      {camOpen && (
        <CameraStage
          facing={step === 1 ? "user" : "environment"}
          shape={step === 1 ? "face" : step === 2 ? "car" : "card"}
          hint={frameText}
          onCancel={closeCamera}
          onShot={(file) => {
            setCamOpen(false);
            void onFile(file);
          }}
          onPhoneCamera={() => {
            setCamOpen(false);
            camRef.current?.click();
          }}
          onUpload={() => {
            setCamOpen(false);
            fileRef.current?.click();
          }}
        />
      )}
    </Backdrop>,
    document.body,
  );
}
