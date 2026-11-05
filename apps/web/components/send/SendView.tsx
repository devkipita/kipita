"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import {
  ArrowRight,
  CalendarBlank,
  CarProfile,
  CarVan,
  Check,
  ChatCircle,
  MapPin,
  Package,
  Path,
  SealCheck,
  ShieldCheck,
  Star,
  Truck,
} from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import {
  LOAD_SIZES,
  VEHICLE_LABEL,
  type Capacity,
  type LoadSize,
} from "@/lib/send/types";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

type Side = "send" | "offer";

const Page = styled(ContentWidth)`
  padding-block: clamp(24px, 4vh, 44px) clamp(56px, 9vh, 96px);
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 960px) {
    padding-bottom: calc(clamp(48px, 7vh, 72px) + var(--bottom-bar-space, 0px));
  }
`;

const Kicker = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${nocturne.ctaBg};
`;

const Title = styled.h1`
  margin: 0;
  max-width: 17ch;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(34px, 5.6vw, 62px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.038em;
  color: ${nocturne.cream};
  text-wrap: balance;
`;

const Lead = styled.p`
  margin: 16px 0 0;
  max-width: 52ch;
  font-size: 17px;
  line-height: 1.55;
  color: ${nocturne.muted};
`;

const Sides = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  max-width: 720px;
  margin-top: clamp(26px, 4vh, 38px);
`;

const SideCard = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  border: 1.5px solid ${({ $on }) => ($on ? "transparent" : RULE)};
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;

  svg {
    flex: none;
    margin-top: 2px;
    color: ${({ $on }) => ($on ? nocturne.lime : nocturne.accent)};
  }
  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  span {
    display: block;
    margin-top: 3px;
    font-size: 14.5px;
    color: ${({ $on }) => ($on ? nocturne.onGreenMuted : nocturne.muted)};
  }
  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      border-color: ${({ $on }) => ($on ? "transparent" : nocturne.accent)};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Panel = styled.div`
  margin-top: 18px;
  padding: clamp(16px, 2vw, 22px);
  border-radius: 20px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 14px 10px;

  @media (max-width: 1040px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Field = styled.label`
  position: relative;
  display: block;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: text;
  transition: background-color 0.16s ease;

  > span {
    display: block;
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.015em;
    color: ${nocturne.cream};
    appearance: none;
    text-overflow: ellipsis;
  }
  input:focus,
  select:focus {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted2};
    font-weight: 600;
  }
  input[type="date"]::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }
  &:hover,
  &:focus-within {
    background: ${nocturne.surface2};
  }
`;

const Go = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
    }
  }
  &:active {
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
    transform: translateY(1px);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (max-width: 1040px) {
    grid-column: 1 / -1;
    width: 100%;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const Loads = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding: 0 12px;

  > span {
    margin-right: 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Load = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : RULE)};
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $on }) => ($on ? nocturne.surface2 : "transparent")};
  color: ${({ $on }) => ($on ? nocturne.accent : nocturne.cream)};
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  svg {
    flex: none;
    color: inherit;
  }
  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      color: ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const ResultsHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: clamp(36px, 5vh, 52px) 0 18px;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(19px, 2.2vw, 24px);
    font-weight: 800;
    letter-spacing: -0.028em;
    color: ${nocturne.cream};
  }
  h2 em {
    font-style: normal;
    font-weight: 500;
    color: ${nocturne.muted};
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 18px;
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};
`;

const Banner = styled.div<{ $tint: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  min-height: 96px;
  background: ${({ $tint }) => $tint};

  > svg {
    flex: none;
    color: ${nocturne.greenDeep};
    opacity: 0.75;
  }
`;

const Kind = styled.span`
  padding: 5px 11px;
  border-radius: 999px;
  background: ${nocturne.surface};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${nocturne.greenDeep};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
`;

const Free = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${nocturne.accent};

  i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }
`;

const Route = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 9px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14.5px;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Driver = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1.5px solid ${RULE};

  .pip {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    border-radius: 999px;
    background: ${nocturne.surface2};
    font-size: 12px;
    font-weight: 800;
    color: ${nocturne.accent};
  }
  .name {
    font-size: 14.5px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: ${nocturne.muted};
  }
  .meta svg.star {
    color: ${nocturne.star};
  }
  .meta svg.seal {
    color: ${nocturne.accent};
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 20px 20px;

  .price {
    font-size: 15px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  .price em {
    font-style: normal;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Ask = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  transition:
    background-color 0.2s ease,
    color 0.2s ease;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Blank = styled.div`
  padding: clamp(34px, 6vh, 58px) 0;
  max-width: 52ch;

  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(20px, 2.4vw, 25px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${nocturne.cream};
  }
  p {
    margin: 10px 0 0;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Why = styled.section`
  margin-top: clamp(44px, 7vh, 72px);
  padding: clamp(28px, 4vw, 40px);
  border-radius: 22px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
`;

const WhyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 30px 40px;

  .plate {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: color-mix(in oklab, var(--n-lime) 22%, transparent);
    box-shadow: inset 0 0 0 1.5px
      color-mix(in oklab, var(--n-lime) 34%, transparent);
  }
  .plate svg {
    flex: none;
    color: ${nocturne.lime};
  }
  b {
    display: block;
    margin: 16px 0 6px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17.5px;
    font-weight: 800;
    letter-spacing: -0.022em;
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 15px;
    line-height: 1.6;
    color: ${nocturne.onGreenMuted};
  }
`;

const TINTS: Record<string, string> = {
  pickup: "color-mix(in oklab, var(--n-sage) 46%, var(--n-surface))",
  closed_van: "color-mix(in oklab, var(--n-lime) 38%, var(--n-surface))",
  truck: "color-mix(in oklab, var(--n-accent) 16%, var(--n-surface))",
  car: "color-mix(in oklab, var(--n-sage) 30%, var(--n-surface))",
  suv: "color-mix(in oklab, var(--n-sage) 30%, var(--n-surface))",
};

function vehicleIcon(kind: string) {
  if (kind === "truck") return Truck;
  if (kind === "closed_van") return CarVan;
  return CarProfile;
}

function initials(name: string | null): string {
  if (!name) return "KP";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function whenLabel(date: string, time: string | null): string {
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date(`${date}T00:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tom = tomorrow.toISOString().slice(0, 10);

  const day =
    date === today
      ? "Today"
      : date === tom
        ? "Tomorrow"
        : d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });

  if (!time) return day;
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${day} · ${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function SendView({
  capacity,
  towns,
}: {
  capacity: Capacity[];
  towns: string[];
}) {
  const [side, setSide] = useState<Side>("offer");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("Furniture & household");
  const [load, setLoad] = useState<LoadSize>("boot");

  const shown = useMemo(
    () =>
      capacity.filter((c) =>
        !from && !to
          ? true
          : (!from || c.from_location.toLowerCase().includes(from.toLowerCase())) &&
            (!to || c.to_location.toLowerCase().includes(to.toLowerCase())),
      ),
    [capacity, from, to],
  );

  const list = shown.length > 0 ? shown : capacity;

  return (
    <Page $max={1180}>
      <Kicker>Kipita Send</Kicker>
      <Title>Move things with vehicles already going there.</Title>
      <Lead>
        A trusted marketplace for empty return trips — less waste for drivers,
        fairer delivery for everyone.
      </Lead>

      <Sides role="group" aria-label="What do you need?">
        <SideCard
          type="button"
          $on={side === "send"}
          aria-pressed={side === "send"}
          onClick={() => setSide("send")}
        >
          <Package size={22} />
          <span>
            <b>I need to send something</b>
            <span>Find space going your way</span>
          </span>
        </SideCard>
        <SideCard
          type="button"
          $on={side === "offer"}
          aria-pressed={side === "offer"}
          onClick={() => setSide("offer")}
        >
          <Truck size={22} />
          <span>
            <b>My vehicle is returning</b>
            <span>Offer your empty space</span>
          </span>
        </SideCard>
      </Sides>

      <Panel>
        <Fields>
          <Field>
            <span>Pick up from</span>
            <div className="row">
              <MapPin size={17} aria-hidden />
              <input
                list="send-towns"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Town"
                aria-label="Pick up from"
              />
            </div>
          </Field>
          <Field>
            <span>Deliver to</span>
            <div className="row">
              <MapPin size={17} aria-hidden />
              <input
                list="send-towns"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Town"
                aria-label="Deliver to"
              />
            </div>
          </Field>
          <Field>
            <span>{side === "offer" ? "Vehicle type" : "What is it"}</span>
            <div className="row">
              <Truck size={17} aria-hidden />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Furniture & household"
                aria-label={side === "offer" ? "Vehicle type" : "What is it"}
              />
            </div>
          </Field>
          <Field>
            <span>When</span>
            <div className="row">
              <CalendarBlank size={17} aria-hidden />
              <input
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                aria-label="When"
              />
            </div>
          </Field>
          <Go type="button">
            {side === "offer" ? "List return trip" : "Find space"}
            <ArrowRight size={18} aria-hidden />
          </Go>
        </Fields>

        <datalist id="send-towns">
          {towns.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <Loads role="group" aria-label="Load size">
          <span>Load size</span>
          {LOAD_SIZES.map((l) => (
            <Load
              key={l.key}
              type="button"
              $on={load === l.key}
              aria-pressed={load === l.key}
              onClick={() => setLoad(l.key)}
            >
              {load === l.key ? <Check size={14} aria-hidden /> : <Package size={14} aria-hidden />}
              {l.label}
            </Load>
          ))}
        </Loads>
      </Panel>

      <ResultsHead>
        <h2>
          Vehicles with space <em>near your route</em>
        </h2>
      </ResultsHead>

      {list.length === 0 ? (
        <Blank>
          <b>No return trips listed yet</b>
          <p>
            Kipita Send matches parcels to vehicles already making the journey.
            The first drivers on your corridor will show up here — check back,
            or list your own returning vehicle above.
          </p>
        </Blank>
      ) : (
        <Cards>
          {list.map((c) => {
            const Icon = vehicleIcon(c.vehicle_type);
            return (
              <Card key={c.id}>
                <Banner $tint={TINTS[c.vehicle_type] ?? TINTS.car}>
                  <Icon size={34} aria-hidden />
                  <Kind>{VEHICLE_LABEL[c.vehicle_type]}</Kind>
                </Banner>
                <Body>
                  <Free>
                    <i aria-hidden /> Space available
                  </Free>
                  <Route>
                    {c.from_location}
                    <ArrowRight size={17} aria-hidden />
                    {c.to_location}
                  </Route>
                  <Facts>
                    <li>
                      <CalendarBlank size={16} />
                      {whenLabel(c.depart_date, c.depart_time)}
                    </li>
                    {c.capacity_note && (
                      <li>
                        <Package size={16} />
                        {c.capacity_note}
                      </li>
                    )}
                  </Facts>
                  <Driver>
                    <span className="pip" aria-hidden>
                      {initials(c.driver?.full_name ?? null)}
                    </span>
                    <div>
                      <div className="name">
                        {c.driver?.full_name ?? "Kipita driver"}
                      </div>
                      <div className="meta">
                        {Number(c.driver?.rating ?? 0) > 0 && (
                          <>
                            <Star className="star" size={13} weight="fill" />
                            {Number(c.driver?.rating).toFixed(1)}
                          </>
                        )}
                        {c.driver?.is_verified && (
                          <>
                            <SealCheck className="seal" size={13} weight="fill" />
                            Verified
                          </>
                        )}
                      </div>
                    </div>
                  </Driver>
                </Body>
                <Foot>
                  <span className="price">
                    {c.quote_only || c.price_from === null ? (
                      <em>Request a quote</em>
                    ) : (
                      <>
                        <em>From </em>
                        {formatKes(c.price_from)}
                      </>
                    )}
                  </span>
                  <Ask type="button">Request space</Ask>
                </Foot>
              </Card>
            );
          })}
        </Cards>
      )}

      <Why>
        <WhyGrid>
          <div>
            <span className="plate" aria-hidden>
              <ShieldCheck size={24} />
            </span>
            <b>Safer by design</b>
            <p>
              Verified drivers, vehicle details, item photos, and secure M-Pesa
              payment.
            </p>
          </div>
          <div>
            <span className="plate" aria-hidden>
              <ChatCircle size={24} />
            </span>
            <b>No more WhatsApp guesswork</b>
            <p>
              Keep route, price, messages, proof of pickup, and delivery in one
              place.
            </p>
          </div>
          <div>
            <span className="plate" aria-hidden>
              <Path size={24} />
            </span>
            <b>Better return journeys</b>
            <p>
              Drivers offset fuel costs while existing road capacity gets used.
            </p>
          </div>
        </WhyGrid>
      </Why>
    </Page>
  );
}
