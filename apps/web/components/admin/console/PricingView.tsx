"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import styled from "styled-components";
import { fareConfigFromSettings, quoteSeat, resolveFuelPrice, type FuelPriceRow } from "@kipita/shared";
import { Calendar, Car, Info, Lightning, Lock, Minus, Plus, SlidersHorizontal, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ago, describeAction, kes, SETTING_LABELS, type AuditRow } from "@/lib/admin/console";
import { addFuelPricesAction, saveSettingsAction, setVehicleClassAction } from "@/lib/admin/console-actions";
import {
  Banner,
  Button,
  Card,
  CardHead,
  ConsequenceList,
  Field,
  Modal,
  Note,
  PageHeader,
  Pill,
  TextLink,
  useToast,
} from "./ui";

export type PricingSettings = {
  platform_fee_percent: number;
  /** 1 = the fee is added on top of the seat price, 0 = deducted from the driver */
  fee_on_top: number;
  fee_min_kes: number;
  /** used for the VAT split in reports, not editable here */
  fee_vat_percent: number;
  hold_minutes: number;
  fare_margin_percent: number;
  fare_wear_per_km: number;
  fare_min_seat_price: number;
  fare_floor_percent: number;
  fare_round_step: number;
};

export type FuelPriceRecord = {
  id: string;
  fuel_type: "petrol" | "diesel";
  region: string;
  price_kes: number;
  effective_from: string;
  effective_to: string;
  note: string | null;
};

export type VehicleClassRecord = {
  code: string;
  label: string;
  km_per_litre: number;
  fuel_type: "petrol" | "diesel";
  active: boolean;
  sort_order: number;
};

const Summary = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled(Card)`
  min-height: 104px;
  position: relative;
  display: flex;
  flex-direction: column;

  > span:first-child {
    position: absolute;
    right: 15px;
    top: 15px;
    color: ${({ theme }) => theme.color.primary};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
  strong {
    margin-top: 7px;
    font: 800 18px ${({ theme }) => theme.fontHeading};
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 11px;
  }
`;

const Main = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Bottom = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Compact = styled.table`
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;

  th {
    height: 32px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
    text-align: left;
    text-transform: uppercase;
  }
  td {
    height: 38px;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 12px;
  }
  td:first-child {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Change = styled.span<{ $down?: boolean }>`
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme, $down }) => ($down ? theme.color.info : theme.color.success)};
  background: ${({ theme, $down }) => ($down ? theme.color.infoContainer : theme.color.successContainer)};
`;

const Bars = styled.div`
  height: 170px;
  margin-top: 16px;
  display: flex;
  align-items: flex-end;
  gap: 8px;

  > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
  > div > span {
    width: 100%;
    max-width: 34px;
    border-radius: 6px 6px 2px 2px;
    background: ${({ theme }) => theme.color.primary};
    opacity: 0.85;
  }
  > div:last-child > span {
    background: #ea7747;
    opacity: 1;
  }
`;

const SettingRow = styled.div`
  min-height: 60px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  > span {
    display: flex;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
`;

const Stepper = styled.div`
  height: 34px;
  display: flex;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 9px;

  button {
    width: 30px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 0;
    color: ${({ theme }) => theme.color.textSoft};
    background: transparent;
    cursor: pointer;
  }
  input {
    width: 54px;
    height: 32px;
    border: 0;
    color: ${({ theme }) => theme.color.text};
    background: transparent;
    font: 700 12px ${({ theme }) => theme.fontHeading};
    text-align: center;
  }
`;

const SimInputs = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const SimOutput = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;

  > span {
    min-height: 50px;
    padding: 7px 8px;
    display: flex;
    flex-direction: column;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 8px;
  }
  > span[data-strong] {
    border-color: transparent;
    color: ${({ theme }) => theme.color.onPrimaryContainer};
    background: ${({ theme }) => theme.color.primaryContainer};
  }
  small {
    color: inherit;
    opacity: 0.75;
    font-size: 10px;
  }
  b {
    margin-top: 4px;
    font: 700 12px ${({ theme }) => theme.fontHeading};
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Log = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  > div {
    padding-right: 12px;
    display: grid;
    grid-template-columns: 34px 1fr;
    align-items: center;
    border-right: 1px solid ${({ theme }) => theme.color.line};
  }
  > div:last-child {
    border-right: 0;
  }
  > div > :first-child {
    grid-row: 1 / 3;
  }
  strong {
    font-size: 11px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
  p {
    grid-column: 1 / 3;
    margin: 6px 0 0;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 11px;
  }
  > em {
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
    font-style: normal;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;

    > div {
      border-right: 0;
    }
  }
`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** '2026-10-15' → '15 Oct'. Dates are plain calendar days, so no time zone maths. */
function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A month-long EPRA period: starts on `from`, ends the day before the same day next month (15 Oct to 14 Nov). */
function monthPeriodEnd(from: string) {
  const d = new Date(`${from}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate() - 1)).toISOString().slice(0, 10);
}

const FIELDS: { key: keyof PricingSettings; hint: string; step: number; unit: string }[] = [
  { key: "platform_fee_percent", hint: "Percent of the seat subtotal", step: 1, unit: "%" },
  { key: "fee_min_kes", hint: "Smallest fee on any booking", step: 10, unit: "KES" },
  { key: "fare_margin_percent", hint: "How far above the cost share a driver may price", step: 1, unit: "%" },
  { key: "fare_wear_per_km", hint: "Wear and tear added to fuel, per km", step: 0.5, unit: "KES" },
  { key: "fare_min_seat_price", hint: "Lowest seat price a driver can list", step: 10, unit: "KES" },
  { key: "fare_floor_percent", hint: "Lowest price a driver may ask, as a share of the recommended price", step: 5, unit: "%" },
  { key: "fare_round_step", hint: "Seat prices snap to this step", step: 5, unit: "KES" },
  { key: "hold_minutes", hint: "Time a passenger has to pay", step: 5, unit: "min" },
];

const EDITABLE_KEYS: (keyof PricingSettings)[] = ["fee_on_top", ...FIELDS.map((f) => f.key)];

type Period = { key: string; from: string; to: string; petrol: number | null; diesel: number | null };

export function PricingView({
  settings,
  fuel,
  classes,
  today,
  loadError,
  log,
  logError,
}: {
  settings: PricingSettings;
  fuel: FuelPriceRecord[];
  classes: VehicleClassRecord[];
  today: string;
  loadError: string | null;
  log: AuditRow[];
  logError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<PricingSettings>(settings);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  // Simulator
  const [km, setKm] = useState(157);
  const [seats, setSeats] = useState(3);
  const [tolls, setTolls] = useState(0);
  const [classCode, setClassCode] = useState(classes.find((c) => c.code === "sedan")?.code ?? classes[0]?.code ?? "");
  const regions = useMemo(() => Array.from(new Set(fuel.map((f) => f.region))).sort(), [fuel]);
  const [simRegion, setSimRegion] = useState(regions.includes("nairobi") ? "nairobi" : (regions[0] ?? "nairobi"));
  const [histRegion, setHistRegion] = useState(simRegion);

  // Fuel price entry
  const [fuelOpen, setFuelOpen] = useState(false);

  // Vehicle class edits, keyed by class code
  const [kmDraft, setKmDraft] = useState<Record<string, number>>({});

  const changed = EDITABLE_KEYS.filter((k) => settings[k] !== draft[k]);

  const fuelRows: FuelPriceRow[] = useMemo(
    () =>
      fuel.map((f) => ({
        fuelType: f.fuel_type,
        region: f.region,
        priceKes: f.price_kes,
        effectiveFrom: f.effective_from,
        effectiveTo: f.effective_to,
      })),
    [fuel],
  );

  const at = useMemo(() => new Date(`${today}T12:00:00+03:00`), [today]);
  const fareConfig = useMemo(() => fareConfigFromSettings(draft), [draft]);

  const petrolNow = useMemo(() => {
    try {
      return resolveFuelPrice(fuelRows, "petrol", "nairobi", at);
    } catch {
      return null;
    }
  }, [fuelRows, at]);
  const dieselNow = useMemo(() => {
    try {
      return resolveFuelPrice(fuelRows, "diesel", "nairobi", at);
    } catch {
      return null;
    }
  }, [fuelRows, at]);
  const pricesMissing = !petrolNow || !dieselNow || petrolNow.stale || dieselNow.stale;

  const periods: Period[] = useMemo(() => {
    const map = new Map<string, Period>();
    for (const f of fuel.filter((x) => x.region === histRegion)) {
      const key = `${f.effective_from}|${f.effective_to}`;
      const p = map.get(key) ?? { key, from: f.effective_from, to: f.effective_to, petrol: null, diesel: null };
      p[f.fuel_type] = f.price_kes;
      map.set(key, p);
    }
    return Array.from(map.values()).sort((a, b) => (a.from < b.from ? -1 : 1)); // oldest first
  }, [fuel, histRegion]);
  const chartPeriods = periods.slice(-6);
  const maxPrice = Math.max(1, ...chartPeriods.map((p) => p.petrol ?? p.diesel ?? 0));

  const sim = useMemo(() => {
    const vc = classes.find((c) => c.code === classCode);
    if (!vc) return { error: "Add a vehicle class first." } as const;
    try {
      const fuelNow = resolveFuelPrice(fuelRows, vc.fuel_type, simRegion, at);
      const quote = quoteSeat({
        distanceKm: km,
        vehicle: { code: vc.code, label: vc.label, kmPerLitre: kmDraft[vc.code] ?? vc.km_per_litre, fuelType: vc.fuel_type },
        seatsOffered: seats,
        tollsKes: tolls,
        fuel: fuelNow,
        config: fareConfig,
        now: at,
      });
      return { quote, fuelNow } as const;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not work out a fare" } as const;
    }
  }, [classes, classCode, fuelRows, simRegion, km, seats, tolls, fareConfig, at, kmDraft]);

  const save = () => {
    const values = Object.fromEntries(changed.map((k) => [k, draft[k]]));
    startTransition(async () => {
      const res = await saveSettingsAction(values);
      if (res.ok) {
        toast.show("Fare settings saved. New bookings use them now.");
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
      setConfirm(false);
    });
  };

  const set = (key: keyof PricingSettings, value: number) =>
    setDraft((d) => ({ ...d, [key]: Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : d[key] }));

  const saveClass = (code: string) => {
    const value = kmDraft[code];
    if (value === undefined) return;
    startTransition(async () => {
      const res = await setVehicleClassAction(code, value, true);
      if (res.ok) {
        toast.show("Vehicle class saved.");
        setKmDraft((d) => {
          const { [code]: _gone, ...rest } = d;
          return rest;
        });
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
    });
  };

  const feeOnTop = draft.fee_on_top === 1;

  return (
    <>
      <PageHeader title="Pricing" description="Manage fuel prices, vehicle classes, the Kipita fee and fare guardrails." />
      {loadError && (
        <Banner $tone="error">
          <Warning size={20} />
          <span>Could not load fuel prices or vehicle classes. {loadError}</span>
        </Banner>
      )}
      {!loadError && pricesMissing && (
        <Banner $tone="warning">
          <Warning size={20} />
          <span>
            {petrolNow && dieselNow
              ? `Today's EPRA fuel prices are missing. Quotes are using the last period, which ended ${shortDate(petrolNow.effectiveTo)}.`
              : "No EPRA fuel prices are entered for Nairobi, so fares cannot be suggested."}{" "}
            Enter the new prices after each EPRA review (the 14th of the month).
          </span>
          <Button $variant="green" onClick={() => setFuelOpen(true)}>
            Enter new prices
          </Button>
        </Banner>
      )}
      <Summary>
        <SummaryCard>
          <span>
            <Lightning size={20} />
          </span>
          <small>Petrol today, Nairobi</small>
          <strong>{petrolNow ? `KES ${petrolNow.priceKes.toFixed(2)} per litre` : "Not entered"}</strong>
          <p>
            {petrolNow
              ? `EPRA ${shortDate(petrolNow.effectiveFrom)} to ${shortDate(petrolNow.effectiveTo)}${petrolNow.stale ? " (out of date)" : ""}`
              : "Enter an EPRA period below"}
          </p>
        </SummaryCard>
        <SummaryCard>
          <span>
            <SlidersHorizontal size={20} />
          </span>
          <small>Kipita service fee</small>
          <strong>{settings.platform_fee_percent}%</strong>
          <p>{settings.fee_on_top === 1 ? "Added on top of the seat price" : "Deducted from the driver's fare"}</p>
        </SummaryCard>
        <SummaryCard>
          <span>
            <Calendar size={20} />
          </span>
          <small>Payment hold</small>
          <strong>{settings.hold_minutes} minutes</strong>
          <p>Seat released if unpaid</p>
        </SummaryCard>
      </Summary>
      <Main>
        <Card>
          <CardHead
            title="Fuel price history"
            sub={`EPRA maximum pump prices, ${histRegion.charAt(0).toUpperCase()}${histRegion.slice(1)}`}
            aside={
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {regions.length > 1 && (
                  <select aria-label="Town" value={histRegion} onChange={(e) => setHistRegion(e.target.value)}>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
                <Button $variant="green" onClick={() => setFuelOpen(true)}>
                  Enter new prices
                </Button>
              </span>
            }
          />
          {periods.length === 0 ? (
            <Note $tone="neutral">
              <Info size={15} />
              No prices entered for this town yet.
            </Note>
          ) : (
            <>
              <Bars aria-hidden="true">
                {chartPeriods.map((p) => (
                  <div key={p.key}>
                    <span style={{ height: `${(((p.petrol ?? p.diesel ?? 0) / maxPrice) * 130).toFixed(0)}px` }} />
                    {shortDate(p.from)}
                  </div>
                ))}
              </Bars>
              <Compact>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Petrol</th>
                    <th>Diesel</th>
                    <th>Petrol change</th>
                  </tr>
                </thead>
                <tbody>
                  {periods
                    .slice()
                    .reverse()
                    .slice(0, 4)
                    .map((p, i, arr) => {
                      const prev = arr[i + 1];
                      const pct = prev && p.petrol && prev.petrol ? ((p.petrol - prev.petrol) / prev.petrol) * 100 : null;
                      return (
                        <tr key={p.key}>
                          <td>
                            {shortDate(p.from)} to {shortDate(p.to)}
                          </td>
                          <td>{p.petrol ? `KES ${p.petrol.toFixed(2)}` : "-"}</td>
                          <td>{p.diesel ? `KES ${p.diesel.toFixed(2)}` : "-"}</td>
                          <td>
                            {pct === null ? (
                              "-"
                            ) : (
                              <Change $down={pct < 0}>
                                {pct >= 0 ? "+" : ""}
                                {pct.toFixed(1)}%
                              </Change>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </Compact>
            </>
          )}
        </Card>
        <Card>
          <CardHead title="Fare settings" sub="Applied to new bookings" aside={<Pill $tone="success">Live</Pill>} />
          <SettingRow>
            <span>
              <strong>{SETTING_LABELS.fee_on_top}</strong>
              <small>{feeOnTop ? "The passenger pays the seat price plus the fee. The driver keeps the full seat price." : "The fee comes out of the driver's share (the old way)."}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label={SETTING_LABELS.fee_on_top}
              checked={feeOnTop}
              onChange={(e) => set("fee_on_top", e.target.checked ? 1 : 0)}
              style={{ width: 20, height: 20 }}
            />
          </SettingRow>
          {FIELDS.map((f) => (
            <SettingRow key={f.key}>
              <span>
                <strong>{SETTING_LABELS[f.key]}</strong>
                <small>{f.hint}</small>
              </span>
              <Stepper>
                <button type="button" aria-label={`Decrease ${SETTING_LABELS[f.key]}`} onClick={() => set(f.key, draft[f.key] - f.step)}>
                  <Minus size={14} />
                </button>
                <input
                  inputMode="decimal"
                  aria-label={`${SETTING_LABELS[f.key]} in ${f.unit}`}
                  value={draft[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
                <button type="button" aria-label={`Increase ${SETTING_LABELS[f.key]}`} onClick={() => set(f.key, draft[f.key] + f.step)}>
                  <Plus size={14} />
                </button>
              </Stepper>
            </SettingRow>
          ))}
          <Note>
            <Lock size={15} />
            Each booking keeps the fee it was made with. Only bookings made after saving use the new values.
          </Note>
          <Button $variant="green" style={{ width: "100%", marginTop: 14 }} disabled={changed.length === 0} onClick={() => setConfirm(true)}>
            {changed.length === 0 ? "No changes" : `Save ${changed.length} ${changed.length === 1 ? "change" : "changes"}`}
          </Button>
        </Card>
      </Main>
      <Bottom>
        <Card>
          <CardHead title="Vehicle classes" sub="Real-world km per litre, mixed driving" aside={<Pill $tone="success">Live</Pill>} />
          <Compact>
            <thead>
              <tr>
                <th>Class</th>
                <th>Fuel</th>
                <th>Km per litre</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const value = kmDraft[c.code] ?? c.km_per_litre;
                const dirty = kmDraft[c.code] !== undefined && kmDraft[c.code] !== c.km_per_litre;
                return (
                  <tr key={c.code}>
                    <td>
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Car size={16} />
                        {c.label}
                      </span>
                    </td>
                    <td>{c.fuel_type === "petrol" ? "Petrol" : "Diesel"}</td>
                    <td>
                      <input
                        inputMode="decimal"
                        aria-label={`Km per litre, ${c.label}`}
                        style={{ width: 64, minHeight: 30, padding: "0 8px", font: "inherit" }}
                        value={value}
                        onChange={(e) => setKmDraft((d) => ({ ...d, [c.code]: Number(e.target.value) || 0 }))}
                      />
                    </td>
                    <td>
                      {dirty && (
                        <Button $variant="green" disabled={pending} onClick={() => saveClass(c.code)}>
                          Save
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Compact>
          <Note $tone="neutral">
            <Info size={15} />
            These are starting assumptions, not measured figures. Adjust them as drivers report real consumption.
          </Note>
        </Card>
        <Card>
          <CardHead title="Fare simulator" sub="Uses the settings above, saved or not" aside={<Pill>Preview only</Pill>} />
          <SimInputs>
            <Field>
              Distance (km)
              <input inputMode="numeric" value={km} onChange={(e) => setKm(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field>
              Seats offered
              <input inputMode="numeric" value={seats} onChange={(e) => setSeats(Math.min(8, Math.max(1, Number(e.target.value) || 1)))} />
            </Field>
            <Field>
              Vehicle class
              <select value={classCode} onChange={(e) => setClassCode(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              Fuel price town
              <select value={simRegion} onChange={(e) => setSimRegion(e.target.value)}>
                {(regions.length ? regions : ["nairobi"]).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              Tolls (KES)
              <input inputMode="numeric" value={tolls} onChange={(e) => setTolls(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          </SimInputs>
          {"error" in sim ? (
            <Note>
              <Warning size={15} />
              {sim.error}
            </Note>
          ) : (
            <>
              <SimOutput>
                <span>
                  <small>Fuel + wear + tolls</small>
                  <b>{kes(sim.quote.costShare.tripCostKes)}</b>
                </span>
                <span>
                  <small>Split among {sim.quote.costShare.shares}</small>
                  <b>{kes(sim.quote.costShare.perSeatRawKes)}</b>
                </span>
                <span>
                  <small>Suggested seat</small>
                  <b>{kes(sim.quote.suggestedKes)}</b>
                </span>
                <span>
                  <small>Price cap</small>
                  <b>{kes(sim.quote.capKes)}</b>
                </span>
                <span data-strong="">
                  <small>Seat price</small>
                  <b>{kes(sim.quote.seatPriceKes)}</b>
                </span>
                <span data-strong="">
                  <small>Kipita fee</small>
                  <b>{kes(sim.quote.platformFeeKes)}</b>
                </span>
                <span data-strong="">
                  <small>Passenger pays</small>
                  <b>{kes(sim.quote.passengerTotalKes)}</b>
                </span>
                <span data-strong="">
                  <small>Driver receives</small>
                  <b>{kes(sim.quote.driverPayoutKes)}</b>
                </span>
              </SimOutput>
              <Note $tone="neutral">
                <Info size={15} />
                Petrol or diesel at KES {sim.fuelNow.priceKes.toFixed(2)} per litre
                {sim.fuelNow.stale ? " (the last period, now out of date)" : ""}. The driver's own share counts as one seat in the split. The cap adds the headroom setting.
              </Note>
            </>
          )}
        </Card>
      </Bottom>
      <Card style={{ marginTop: 12 }}>
        <CardHead
          title="Change log"
          sub="Recent pricing configuration changes"
          aside={<TextLink href="/admin/users?tab=audit">View audit log</TextLink>}
        />
        <Log>
          {logError && <em>Could not load changes. {logError}</em>}
          {!logError && log.length === 0 && <em>No pricing changes recorded yet.</em>}
          {log.slice(0, 4).map((r) => (
            <div key={r.id}>
              <Avatar name={r.actor || "Admin"} src={r.actor_avatar} size={28} />
              <strong>{r.actor ?? "Admin"}</strong>
              <small>{ago(r.created_at)} ago</small>
              <p>{describeAction(r)}</p>
            </div>
          ))}
        </Log>
      </Card>
      {confirm && (
        <Modal
          title="Save fare settings"
          close={() => setConfirm(false)}
          footer={
            <>
              <Button $variant="secondary" onClick={() => setConfirm(false)}>
                Go back
              </Button>
              <Button $variant="green" onClick={save} disabled={pending} aria-busy={pending}>
                Confirm change
              </Button>
            </>
          }
        >
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Warning size={18} />
            This affects all new bookings immediately. Existing bookings keep the fee they were made with.
          </span>
          <ConsequenceList>
            {changed.map((k) => (
              <div key={k}>
                <dt>{SETTING_LABELS[k]}</dt>
                <dd>
                  {settings[k]} → {draft[k]}
                </dd>
              </div>
            ))}
          </ConsequenceList>
        </Modal>
      )}
      {fuelOpen && (
        <FuelPriceModal
          fuel={fuel}
          regions={regions}
          defaultRegion={histRegion}
          close={() => setFuelOpen(false)}
          onSaved={() => {
            setFuelOpen(false);
            toast.show("Fuel prices saved. Quotes use them from their start date.");
            router.refresh();
          }}
          onError={(m) => toast.show(m, true)}
        />
      )}
      {toast.node}
    </>
  );
}

function FuelPriceModal({
  fuel,
  regions,
  defaultRegion,
  close,
  onSaved,
  onError,
}: {
  fuel: FuelPriceRecord[];
  regions: string[];
  defaultRegion: string;
  close: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [region, setRegion] = useState(defaultRegion);

  // Start the next period the day after the latest one this town already has.
  const latestEnd = fuel.filter((f) => f.region === region.trim().toLowerCase()).reduce((m, f) => (f.effective_to > m ? f.effective_to : m), "");
  const suggestedFrom = latestEnd ? addDaysIso(latestEnd, 1) : "";
  const [from, setFrom] = useState(suggestedFrom);
  const [to, setTo] = useState(suggestedFrom ? monthPeriodEnd(suggestedFrom) : "");
  const [petrol, setPetrol] = useState("");
  const [diesel, setDiesel] = useState("");
  const [note, setNote] = useState("");

  const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = () =>
    startTransition(async () => {
      const res = await addFuelPricesAction({
        region,
        from,
        to,
        petrol: toNumber(petrol),
        diesel: toNumber(diesel),
        note,
      });
      if (res.ok) onSaved();
      else onError(res.error);
    });

  return (
    <Modal
      title="Enter EPRA fuel prices"
      close={close}
      footer={
        <>
          <Button $variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button $variant="green" onClick={submit} disabled={pending} aria-busy={pending}>
            Save prices
          </Button>
        </>
      }
    >
      <SimInputs>
        <Field>
          Town
          <input list="fuel-regions" value={region} onChange={(e) => setRegion(e.target.value)} />
          <datalist id="fuel-regions">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field>
          Source note (optional)
          <input value={note} placeholder="EPRA review 14 Nov 2026" onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field>
          Starts
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field>
          Ends
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field>
          Petrol (KES per litre)
          <input inputMode="decimal" value={petrol} onChange={(e) => setPetrol(e.target.value)} />
        </Field>
        <Field>
          Diesel (KES per litre)
          <input inputMode="decimal" value={diesel} onChange={(e) => setDiesel(e.target.value)} />
        </Field>
      </SimInputs>
      <Note $tone="neutral">
        <Info size={15} />
        Use the maximum pump price EPRA publishes for the town, VAT included. A period cannot overlap one already entered for the same town.
      </Note>
    </Modal>
  );
}
