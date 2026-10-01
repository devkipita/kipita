"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import styled from "styled-components";
import { CalendarBlank as CalendarDays, Check, CaretDown as ChevronDown, Circle, Clock, CircleNotch as Loader2, MapPin, Megaphone, SlidersHorizontal, Lightning as Zap } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import {
  DISCOUNTS,
  MAX_SEATS,
  MIN_SEATS,
  PRICE_PRESETS,
  ROLE_COPY,
} from "@/lib/home/labels";
import type { AppMode } from "@/lib/home/mode";
import { createRideRequestAction, createTripAction } from "@/lib/home/posts";
import type { RidePreferences } from "@/lib/ride-detail";
import {
  Chip,
  ChipRow,
  FieldBlock,
  FieldHead,
  Segmented,
  SegmentButton,
  Stepper,
  TextInput,
} from "./fields";
import { ComfortToggles } from "./ComfortToggles";
import { VehicleField, type VehicleDraft } from "./VehicleField";

export type PostDraft = {
  role: AppMode;
  from: string;
  to: string;
  date: string | null;
  departure_time: string | null;
  preferences: RidePreferences;
};

const RouteCard = styled.div`
  display: grid;
  gap: 8px;
  padding: 15px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};

  .line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  .line svg.start {
    color: ${({ theme }) => theme.color.primary};
    fill: ${({ theme }) => theme.color.primary};
    flex: none;
  }
  .line svg.end {
    color: ${({ theme }) => theme.color.dangerText};
    flex: none;
  }
  .rail {
    height: 12px;
    margin-left: 5px;
    border-left: 1px dashed ${({ theme }) => theme.color.line};
  }
`;

const Prompt = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.type.body};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSoft};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span.k {
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const WhenRow = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Advanced = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 700;
  cursor: pointer;

  svg.lead {
    color: ${({ theme }) => theme.color.primary};
  }
  svg.chev {
    margin-left: auto;
    color: ${({ theme }) => theme.color.textSoft};
    transition: transform 0.18s ease;
  }
  &[aria-expanded="true"] svg.chev {
    transform: rotate(180deg);
  }
`;

const Success = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 36px 20px 44px;

  .burst {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.onPrimary};
  }
  b {
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: ${({ theme }) => theme.type.body};
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

function localParts(): { date: string; time: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function nextQuarterHour(): { date: string; time: string } {
  const quarter = 1000 * 60 * 15;
  const slot = new Date(Math.ceil(Date.now() / quarter) * quarter);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${slot.getFullYear()}-${pad(slot.getMonth() + 1)}-${pad(slot.getDate())}`,
    time: `${pad(slot.getHours())}:${pad(slot.getMinutes())}`,
  };
}

/**
 * Post-on-empty — the web port of
 * `apps/mobile/src/components/sheets/PostSheet.tsx`.
 *
 * A passenger requests a ride, a driver offers one. On success the row's insert
 * trigger (migration 020) notifies people interested in that route.
 */
export function PostDrawer({
  open,
  draft,
  viewerId,
  onClose,
  onPosted,
}: {
  open: boolean;
  draft: PostDraft | null;
  viewerId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const isDriver = draft?.role === "driver";
  const [vehicle, setVehicle] = useState<VehicleDraft>({
    make: "",
    model: "",
    color: "",
    photoUrl: null,
  });
  const copy = ROLE_COPY[draft?.role ?? "passenger"];

  // Only treat the searched slot as a real schedule if it is still in the
  // future — a stale draft should default to "leaving now", never a past time.
  const seededFuture = useMemo(() => {
    if (!draft?.date) return false;
    const when = new Date(`${draft.date}T${draft.departure_time ?? "00:00"}`);
    return !Number.isNaN(when.getTime()) && when.getTime() > Date.now();
  }, [draft?.date, draft?.departure_time]);

  const [when, setWhen] = useState<"now" | "later">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<RidePreferences>({});
  const [showComfort, setShowComfort] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);
  const [pending, startTransition] = useTransition();

  // Re-seed whenever a new draft arrives (a fresh search opens the drawer).
  useEffect(() => {
    if (!open || !draft) return;
    setWhen(seededFuture ? "later" : "now");
    setDate(seededFuture ? (draft.date ?? "") : "");
    setTime(seededFuture ? (draft.departure_time ?? "") : "");
    setSeats(draft.role === "driver" ? 3 : 1);
    setPrice("");
    setPreferences(draft.preferences ?? {});
    setShowComfort(false);
    setError("");
    setPosted(false);
  }, [open, draft, seededFuture]);

  // Hold the success panel briefly, then hand back — mirrors mobile's 1.6s.
  useEffect(() => {
    if (!posted) return;
    const timer = window.setTimeout(onPosted, 1600);
    return () => window.clearTimeout(timer);
  }, [posted, onPosted]);

  if (!draft) return null;

  const priceNumber = Number(price);
  const discountNote =
    discount && priceNumber > 0
      ? `Riders pay KSh ${Math.round(
          priceNumber * (1 - discount / 100),
        ).toLocaleString("en-KE")}`
      : null;
  const scheduleReady = when === "now" || Boolean(date);
  const canPost =
    scheduleReady &&
    (!isDriver || (priceNumber > 0 && !Number.isNaN(priceNumber)));

  function chooseWhen(next: "now" | "later") {
    setWhen(next);
    if (next !== "later") return;
    const slot = nextQuarterHour();
    setDate((d) => d || slot.date);
    setTime((t) => t || slot.time);
  }

  function submit() {
    if (!draft || !canPost) return;
    setError("");

    startTransition(async () => {
      const now = localParts();
      const useDate = when === "later" ? date : now.date;
      const useTime = when === "later" ? time || "00:00" : now.time;

      const result = isDriver
        ? await createTripAction({
            from_location: draft.from,
            to_location: draft.to,
            departure_date: useDate,
            departure_time: useTime,
            seats_total: seats,
            price_per_seat: priceNumber,
            discount_percent: discount,
            vehicle_make: vehicle.make.trim() || undefined,
            vehicle_model: vehicle.model.trim() || undefined,
            vehicle_color: vehicle.color.trim() || undefined,
            vehicle_photo_url: vehicle.photoUrl ?? undefined,
            preferences: {
              luggage: !!preferences.luggage,
              pets: !!preferences.pets,
              silent_ride: !!preferences.silent_ride,
              music: !!preferences.music,
              no_smoking: !!preferences.no_smoking,
            },
          })
        : await createRideRequestAction({
            from_location: draft.from,
            to_location: draft.to,
            preferred_date: when === "later" ? date : null,
            preferred_time: when === "later" ? time || null : null,
            seats_needed: seats,
            preferences: {
              luggage: !!preferences.luggage,
              pets: !!preferences.pets,
              silent_ride: !!preferences.silent_ride,
              music: !!preferences.music,
              no_smoking: !!preferences.no_smoking,
            },
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosted(true);
    });
  }

  if (posted) {
    return (
      <Drawer
        open={open}
        onClose={onPosted}
        size="sm"
        title={copy.postedTitle}
        description="We've told everyone heading this way."
      >
        <Success>
          <span className="burst">
            <Check size={34} />
          </span>
          <b>{copy.postedTitle}</b>
          <p>
            Anyone looking for {draft.from} → {draft.to} has been notified.
          </p>
        </Success>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title={copy.postTitle}
      description={copy.postPrompt}
      footer={
        <DrawerFooter>
          <ButtonEl
            type="button"
            $variant="ghost"
            $compact
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </ButtonEl>
          <ButtonEl
            type="button"
            $compact
            style={{ flex: 1 }}
            onClick={submit}
            disabled={!canPost || pending}
          >
            {pending ? (
              <>
                <Loader2 size={18} /> Posting…
              </>
            ) : (
              <>
                <Megaphone size={18} />
                {isDriver ? "Offer this ride" : "Request this ride"}
              </>
            )}
          </ButtonEl>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        <Prompt>{copy.postPrompt}</Prompt>

        <RouteCard>
          <div className="line">
            <Circle className="start" size={10} />
            {draft.from}
          </div>
          <div className="rail" />
          <div className="line">
            <MapPin className="end" size={15} />
            {draft.to}
          </div>
        </RouteCard>

        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <span className="k">When</span>
          </FieldHead>
          <Segmented>
            <SegmentButton
              type="button"
              $active={when === "now"}
              onClick={() => chooseWhen("now")}
              disabled={pending}
            >
              <Zap size={15} /> Leaving now
            </SegmentButton>
            <SegmentButton
              type="button"
              $active={when === "later"}
              onClick={() => chooseWhen("later")}
              disabled={pending}
            >
              <CalendarDays size={15} /> Pick a time
            </SegmentButton>
          </Segmented>
        </FieldBlock>

        {when === "later" && (
          <WhenRow>
            <FieldBlock>
              <FieldHead>
                <label htmlFor="post-date">
                  <CalendarDays size={14} /> Date
                </label>
              </FieldHead>
              <TextInput
                id="post-date"
                type="date"
                min={localParts().date}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </FieldBlock>
            <FieldBlock>
              <FieldHead>
                <label htmlFor="post-time">
                  <Clock size={14} /> Time
                </label>
              </FieldHead>
              <TextInput
                id="post-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </FieldBlock>
          </WhenRow>
        )}

        <Row>
          <span className="k">{copy.seatsLabel}</span>
          <Stepper
            value={seats}
            min={MIN_SEATS}
            max={MAX_SEATS}
            onChange={setSeats}
            label="seats"
          />
        </Row>

        {isDriver && (
          <FieldBlock>
            <FieldHead>
              <label htmlFor="post-price">Price per seat</label>
            </FieldHead>
            <ChipRow>
              {PRICE_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  type="button"
                  $active={priceNumber === preset}
                  onClick={() => setPrice(String(preset))}
                >
                  {preset.toLocaleString("en-KE")} KSh
                </Chip>
              ))}
            </ChipRow>
            <TextInput
              id="post-price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Custom amount (KSh)"
            />
          </FieldBlock>
        )}

        {isDriver && (
          <FieldBlock>
            <FieldHead>
              <label>Offer a discount</label>
              {discountNote && <span className="v">{discountNote}</span>}
            </FieldHead>
            <ChipRow>
              <Chip
                type="button"
                $active={discount === null}
                onClick={() => setDiscount(null)}
              >
                No discount
              </Chip>
              {DISCOUNTS.map((value) => (
                <Chip
                  key={value}
                  type="button"
                  $active={discount === value}
                  onClick={() => setDiscount(value)}
                >
                  {value}% off
                </Chip>
              ))}
            </ChipRow>
          </FieldBlock>
        )}

        {isDriver && viewerId && (
          <FieldBlock>
            <FieldHead>
              <label>Your car</label>
            </FieldHead>
            <VehicleField
              value={vehicle}
              onChange={setVehicle}
              userId={viewerId}
            />
          </FieldBlock>
        )}

        <div>
          <Advanced
            type="button"
            aria-expanded={showComfort}
            onClick={() => setShowComfort((v) => !v)}
          >
            <SlidersHorizontal className="lead" size={17} />
            {copy.preferencesLabel}
            <ChevronDown className="chev" size={18} />
          </Advanced>
          {showComfort && (
            <div style={{ marginTop: 10 }}>
              <ComfortToggles value={preferences} onChange={setPreferences} />
            </div>
          )}
        </div>
      </DrawerBody>
    </Drawer>
  );
}
