"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";
import { Warning, X } from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { saveCarAction } from "@/lib/driver/cars";
import { PLATE_ERROR, PLATE_EXAMPLE, formatPlate, isPlate } from "@/lib/home/plate";
import type { GarageCar } from "@/lib/home/vehicle";

export const CAR_COLOURS: { label: string; swatch: string }[] = [
  { label: "White", swatch: "#FFFFFF" },
  { label: "Silver", swatch: "#C9CDD0" },
  { label: "Black", swatch: "#1D1F1E" },
  { label: "Grey", swatch: "#7D8381" },
  { label: "Blue", swatch: "#2F5D9E" },
  { label: "Red", swatch: "#B23A2E" },
  { label: "Green", swatch: "#2F6B4C" },
];

export function carName(c: { color: string; make: string; model: string }) {
  const model = c.model && c.model !== c.make ? c.model : "";
  return `${c.color} ${c.make} ${model}`.replace(/\s+/g, " ").trim();
}

const ring = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(10, 38, 28, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 899px) {
    padding: 0;
    align-items: flex-end;
  }
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 100%;
  overflow-y: auto;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  border-radius: 22px;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 30px 80px -30px rgba(10, 38, 28, 0.6);

  @media (max-width: 899px) {
    max-width: none;
    max-height: 92dvh;
    border-radius: 24px 24px 0 0;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  > span {
    font-size: 17px;
    font-weight: 800;
  }
`;

const IconBtn = styled.button`
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: ${nocturne.surface3};
  color: ${nocturne.cream};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  ${ring}
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;

  label {
    font-size: 14px;
    font-weight: 700;
  }
  > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
`;

const TextField = styled.input<{ $bad?: boolean; $plate?: boolean }>`
  height: 50px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1.5px solid ${({ $bad }) => ($bad ? nocturne.danger : nocturne.line)};
  background: ${nocturne.surface};
  font: inherit;
  font-size: 16px;
  font-weight: ${({ $plate }) => ($plate ? 800 : 600)};
  letter-spacing: ${({ $plate }) => ($plate ? "0.08em" : "normal")};
  color: ${nocturne.cream};
  outline: 0;
  box-sizing: border-box;
  ${ring}
`;

const Colours = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  > span {
    font-size: 14px;
    font-weight: 700;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const Swatch = styled.button<{ $on: boolean; $sw: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 8px;
  border-radius: 19px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.surface2 : nocturne.surface)};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.cream};
  cursor: pointer;
  ${ring}

  i {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: ${({ $sw }) => $sw};
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
  }
`;

const Alert = styled.p`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${nocturne.danger};
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid ${nocturne.line2};
`;

const Solid = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  border: 0;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  ${ring}

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`;

const Hollow = styled.button`
  height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1.5px solid ${nocturne.line};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  ${ring}
`;

export function CarDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (car: GarageCar) => void;
}) {
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [colour, setColour] = useState("");
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState("");
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open || typeof document === "undefined") return null;

  function close() {
    setModel("");
    setPlate("");
    setColour("");
    setTried(false);
    setServerError("");
    onClose();
  }

  const modelBad = tried && !model.trim();
  const plateBad = tried && !isPlate(plate);
  const error = tried
    ? !model.trim()
      ? "Add the make and model."
      : !isPlate(plate)
        ? PLATE_ERROR
        : !colour
          ? "Pick a colour so passengers can spot your car."
          : serverError
    : serverError;

  function save() {
    const words = model.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || !isPlate(plate) || !colour) {
      setTried(true);
      return;
    }
    const titled = words.map((w) => w[0]!.toUpperCase() + w.slice(1));
    const make = titled[0]!;
    const rest = titled.slice(1).join(" ") || make;
    setServerError("");
    startSaving(async () => {
      const result = await saveCarAction({ make, model: rest, plate, color: colour });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      onSaved(result.car);
      close();
    });
  }

  return createPortal(
    <Backdrop onClick={() => !saving && close()}>
      <Dialog role="dialog" aria-modal="true" aria-label="Add a car" onClick={(e) => e.stopPropagation()}>
        <Head>
          <span>Add a car</span>
          <IconBtn type="button" aria-label="Cancel adding a car" onClick={close} disabled={saving}>
            <X size={18} weight="bold" />
          </IconBtn>
        </Head>
        <Fields>
          <div>
            <label htmlFor="garage-model">Make and model</label>
            <TextField
              id="garage-model"
              value={model}
              placeholder="Toyota Fielder"
              autoComplete="off"
              autoCapitalize="words"
              autoFocus
              maxLength={60}
              $bad={modelBad}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="garage-plate">Number plate</label>
            <TextField
              id="garage-plate"
              value={plate}
              placeholder={PLATE_EXAMPLE}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={8}
              $plate
              $bad={plateBad}
              onChange={(e) => setPlate(formatPlate(e.target.value))}
            />
          </div>
        </Fields>
        <Colours>
          <span id="garage-colour">Colour</span>
          <div className="row" role="group" aria-labelledby="garage-colour">
            {CAR_COLOURS.map((c) => (
              <Swatch
                key={c.label}
                type="button"
                $on={colour === c.label}
                $sw={c.swatch}
                aria-pressed={colour === c.label}
                onClick={() => setColour(c.label)}
              >
                <i aria-hidden />
                {c.label}
              </Swatch>
            ))}
          </div>
        </Colours>
        {error && (
          <Alert role="alert">
            <Warning size={16} weight="bold" />
            {error}
          </Alert>
        )}
        <Foot>
          <Hollow type="button" onClick={close} disabled={saving}>
            Cancel
          </Hollow>
          <Solid type="button" onClick={save} disabled={saving} aria-busy={saving}>
            {saving && <ButtonOrb job="committing" />}
            {saving ? "Saving…" : "Save car"}
          </Solid>
        </Foot>
      </Dialog>
    </Backdrop>,
    document.body,
  );
}
