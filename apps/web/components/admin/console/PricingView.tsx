"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import styled from "styled-components";
import { Calendar, Car, Info, Lightning, Lock, Minus, Plus, SlidersHorizontal, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ago, describeAction, kes, SETTING_LABELS, type AuditRow } from "@/lib/admin/console";
import { saveSettingsAction } from "@/lib/admin/console-actions";
import { fareBreakdown } from "@/lib/platform";
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
  SamplePill,
  TextLink,
  useToast,
} from "./ui";

export type PricingSettings = {
  platform_fee_percent: number;
  hold_minutes: number;
  fuel_cost_per_km: number;
  fare_margin_percent: number;
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

const SAMPLE_HISTORY = [
  { period: "15 Jun–14 Jul", petrol: 205.4, diesel: 196.1 },
  { period: "15 Jul–14 Aug", petrol: 210.2, diesel: 198.8 },
  { period: "15 Aug–14 Sep", petrol: 216.7, diesel: 215.2 },
  { period: "15 Sep–14 Oct", petrol: 214.1, diesel: 215.3 },
  { period: "15 Oct–14 Nov", petrol: 226.96, diesel: 227.76 },
];

const SAMPLE_CLASSES = [
  ["Small car", "Petrol", "15"],
  ["Sedan", "Petrol", "13"],
  ["SUV petrol", "Petrol", "10"],
  ["SUV diesel", "Diesel", "9"],
  ["Minivan", "Diesel", "9"],
];

const FIELDS: { key: keyof PricingSettings; hint: string; step: number; unit: string }[] = [
  { key: "platform_fee_percent", hint: "Taken from each seat price", step: 1, unit: "%" },
  { key: "fuel_cost_per_km", hint: "KES per km behind the suggestion", step: 0.5, unit: "KES" },
  { key: "fare_margin_percent", hint: "Cap above the fuel share", step: 1, unit: "%" },
  { key: "hold_minutes", hint: "Time a passenger has to pay", step: 5, unit: "min" },
];

function roundTo10(n: number) {
  return Math.max(0, Math.round(n / 10) * 10);
}

export function PricingView({ settings, log, logError }: { settings: PricingSettings; log: AuditRow[]; logError: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<PricingSettings>(settings);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [km, setKm] = useState(157);
  const [seats, setSeats] = useState(3);

  const changed = (Object.keys(settings) as (keyof PricingSettings)[]).filter((k) => settings[k] !== draft[k]);

  const sim = useMemo(() => {
    const fuel = km * draft.fuel_cost_per_km;
    const share = fuel / (seats + 1);
    const suggested = roundTo10(share);
    const cap = roundTo10(share * (1 + draft.fare_margin_percent / 100));
    const split = fareBreakdown(suggested, draft.platform_fee_percent);
    return { fuel, share, suggested, cap, fee: split.fee, driver: split.driverEarning };
  }, [km, seats, draft]);

  const save = () => {
    const values = Object.fromEntries(changed.map((k) => [k, draft[k]]));
    startTransition(async () => {
      const res = await saveSettingsAction(values);
      if (res.ok) {
        toast.show("Fare settings saved. New quotes use them now.");
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
      setConfirm(false);
    });
  };

  const set = (key: keyof PricingSettings, value: number) =>
    setDraft((d) => ({ ...d, [key]: Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : d[key] }));

  const maxPrice = Math.max(...SAMPLE_HISTORY.map((h) => h.petrol));

  return (
    <>
      <PageHeader title="Pricing" description="Manage fuel inputs, cost-sharing rules and fare guardrails." />
      <Banner $tone="info">
        <Info size={20} />
        <span>
          Fare settings below are live. EPRA fuel prices, price history and vehicle classes have no table yet and show sample data.
        </span>
      </Banner>
      <Summary>
        <SummaryCard>
          <span>
            <Lightning size={20} />
          </span>
          <small>Fuel cost per km</small>
          <strong>KES {settings.fuel_cost_per_km}</strong>
          <p>Used to suggest seat prices</p>
        </SummaryCard>
        <SummaryCard>
          <span>
            <SlidersHorizontal size={20} />
          </span>
          <small>Platform fee</small>
          <strong>{settings.platform_fee_percent}%</strong>
          <p>Deducted from the driver&apos;s fare</p>
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
          <CardHead title="Fuel price history" sub="EPRA monthly super petrol, Nairobi" aside={<SamplePill />} />
          <Bars aria-hidden="true">
            {SAMPLE_HISTORY.map((h) => (
              <div key={h.period}>
                <span style={{ height: `${(h.petrol / maxPrice) * 130}px` }} />
                {h.period.split("–")[0]}
              </div>
            ))}
          </Bars>
          <Compact>
            <thead>
              <tr>
                <th>Period</th>
                <th>Petrol</th>
                <th>Diesel</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_HISTORY.slice()
                .reverse()
                .slice(0, 3)
                .map((h, i) => {
                  const prev = SAMPLE_HISTORY[SAMPLE_HISTORY.length - 2 - i];
                  const pct = prev ? ((h.petrol - prev.petrol) / prev.petrol) * 100 : 0;
                  return (
                    <tr key={h.period}>
                      <td>{h.period}</td>
                      <td>KES {h.petrol.toFixed(2)}</td>
                      <td>KES {h.diesel.toFixed(2)}</td>
                      <td>
                        <Change $down={pct < 0}>
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(1)}%
                        </Change>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </Compact>
        </Card>
        <Card>
          <CardHead title="Fare settings" sub="Applied to new quotes" aside={<Pill $tone="success">Live</Pill>} />
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
            Booked rides keep their locked price. Only quotes created after saving use the new values.
          </Note>
          <Button $variant="green" style={{ width: "100%", marginTop: 14 }} disabled={changed.length === 0} onClick={() => setConfirm(true)}>
            {changed.length === 0 ? "No changes" : `Save ${changed.length} ${changed.length === 1 ? "change" : "changes"}`}
          </Button>
        </Card>
      </Main>
      <Bottom>
        <Card>
          <CardHead title="Vehicle classes" sub="Fuel efficiency assumptions" aside={<SamplePill />} />
          <Compact>
            <thead>
              <tr>
                <th>Class</th>
                <th>Fuel</th>
                <th>Km per litre</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_CLASSES.map((r) => (
                <tr key={r[0]}>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <Car size={16} />
                      {r[0]}
                    </span>
                  </td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </Compact>
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
          </SimInputs>
          <SimOutput>
            <span>
              <small>Fuel</small>
              <b>{kes(sim.fuel)}</b>
            </span>
            <span>
              <small>Split among {seats + 1}</small>
              <b>{kes(sim.share)}</b>
            </span>
            <span>
              <small>Suggested seat</small>
              <b>{kes(sim.suggested)}</b>
            </span>
            <span>
              <small>Price cap</small>
              <b>{kes(sim.cap)}</b>
            </span>
            <span data-strong="">
              <small>Passenger pays</small>
              <b>{kes(sim.suggested)}</b>
            </span>
            <span data-strong="">
              <small>Kipita fee</small>
              <b>{kes(sim.fee)}</b>
            </span>
            <span data-strong="">
              <small>Driver receives</small>
              <b>{kes(sim.driver)}</b>
            </span>
            <span data-strong="">
              <small>Driver total</small>
              <b>{kes(sim.driver * seats)}</b>
            </span>
          </SimOutput>
          <Note $tone="neutral">
            <Info size={15} />
            Fuel cost is shared by the passengers and the driver, rounded to KES 10. The cap adds the headroom setting.
          </Note>
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
          {log.slice(0, 3).map((r) => (
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
            This affects all new fare quotes immediately. Existing bookings keep their locked prices.
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
      {toast.node}
    </>
  );
}
