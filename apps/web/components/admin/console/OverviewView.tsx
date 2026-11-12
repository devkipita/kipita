"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import {
  ArrowRight,
  ArrowUUpLeft,
  Calendar,
  HandCoins,
  RouteTrip,
  SealCheck,
  Shield,
  ShieldCheck,
  Wallet,
  Warning,
  XCircle,
} from "@/components/icons";
import { kes, shortDate, type Overview } from "@/lib/admin/console";
import { Banner, ButtonLink, Card, CardHead, PageHeader, Pill, TextLink } from "./ui";

const Kpis = styled.section`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Kpi = styled.article`
  position: relative;
  min-height: 116px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surface};

  > span:first-child {
    position: absolute;
    right: 13px;
    top: 13px;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: ${({ theme }) => theme.color.primary};
    background: ${({ theme }) => theme.color.primaryContainer};
  }
  > small {
    padding-right: 38px;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 11px;
    font-weight: 600;
  }
  > strong {
    margin-top: 15px;
    font: 800 20px ${({ theme }) => theme.fontHeading};
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.text};
  }
  > em {
    margin-top: 5px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
    font-style: normal;
  }
`;

const Split = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const MapBox = styled.div`
  position: relative;
  height: 252px;

  svg {
    width: 100%;
    height: 224px;
  }
  .county {
    fill: ${({ theme }) => theme.color.surfaceVariant};
    stroke: ${({ theme }) => theme.color.line};
    stroke-width: 2;
  }
  .route {
    fill: none;
    stroke: ${({ theme }) => theme.color.primary};
    stroke-width: 2.5;
    stroke-dasharray: 5 5;
  }
  .pin {
    fill: ${({ theme }) => theme.color.primary};
    stroke: ${({ theme }) => theme.color.surface};
    stroke-width: 3;
  }
  .pin.idle {
    fill: ${({ theme }) => theme.color.outline};
    opacity: 0.5;
  }
  text {
    fill: ${({ theme }) => theme.color.textSoft};
    font: 600 11px ${({ theme }) => theme.font};
  }
  > p {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    text-align: center;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const Attention = styled.div`
  margin-top: 12px;

  a {
    min-height: 59px;
    padding: 8px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: inherit;
    text-decoration: none;
  }
  a:last-child {
    border-bottom: 0;
  }
  a > span:nth-child(2) {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    margin-top: 2px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
  > p {
    margin: 24px 0 0;
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
`;

const Severity = styled.span<{ $tone: "error" | "warning" }>`
  width: 34px;
  height: 34px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: ${({ theme, $tone }) => ($tone === "error" ? theme.color.error : theme.color.warning)};
  background: ${({ theme, $tone }) => ($tone === "error" ? theme.color.errorContainer : theme.color.warningContainer)};
`;

const Chart = styled.div`
  position: relative;
  height: 205px;
  margin: 12px 0 0 34px;

  > div:first-child {
    position: absolute;
    right: calc(100% + 8px);
    top: 0;
    bottom: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
  svg {
    width: 100%;
    height: 180px;
    overflow: visible;
  }
  .grid {
    fill: none;
    stroke: ${({ theme }) => theme.color.line};
  }
  .line {
    fill: none;
    stroke: ${({ theme }) => theme.color.primary};
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  > div:last-child {
    display: flex;
    justify-content: space-between;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
`;

const Total = styled.strong`
  font: 800 18px ${({ theme }) => theme.fontHeading};
  color: ${({ theme }) => theme.color.text};

  small {
    color: ${({ theme }) => theme.color.muted};
    font: 500 11px ${({ theme }) => theme.font};
  }
`;

const Routes = styled.table`
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;

  td {
    height: 42px;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  tr:last-child td {
    border: 0;
  }
  td:first-child b {
    width: 23px;
    display: inline-block;
    color: ${({ theme }) => theme.color.muted};
  }
  td:last-child {
    text-align: right;
  }
  td:last-child strong,
  td:last-child small {
    display: block;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
`;

const Quiet = styled.p`
  margin: 28px 0 0;
  color: ${({ theme }) => theme.color.muted};
  font-size: 12px;
`;

const CITIES: { key: string; x: number; y: number; lx: number; ly: number; path: string }[] = [
  { key: "Nyeri", x: 205, y: 90, lx: 216, ly: 91, path: "M265 184 Q230 130 205 90" },
  { key: "Mombasa", x: 395, y: 245, lx: 335, ly: 268, path: "M265 184 Q355 205 395 245" },
  { key: "Kisumu", x: 136, y: 175, lx: 76, ly: 164, path: "M265 184 Q190 190 136 175" },
  { key: "Nakuru", x: 310, y: 102, lx: 320, ly: 103, path: "M265 184 Q290 125 310 102" },
];

function LiveMap({ routes, total }: { routes: Overview["live_routes"]; total: number }) {
  const countFor = (city: string) =>
    routes.filter((r) => r.city?.toLowerCase().includes(city.toLowerCase())).reduce((n, r) => n + Number(r.trips), 0);
  return (
    <MapBox>
      <svg viewBox="0 0 520 310" role="img" aria-label={`${total} trips in progress`}>
        <path className="county" d="M222 18 322 43 389 105 432 177 386 264 294 296 210 274 165 232 98 188 128 123 168 78Z" />
        {CITIES.map((c) => {
          const n = countFor(c.key);
          return (
            <g key={c.key}>
              {n > 0 && <path className="route" d={c.path} />}
              <circle className={n > 0 ? "pin" : "pin idle"} cx={c.x} cy={c.y} r={8} />
              <text x={c.lx} y={c.ly}>
                {c.key} · {n}
              </text>
            </g>
          );
        })}
        <circle className="pin" cx={265} cy={184} r={10} />
        <text x={275} y={207}>
          All routes · {total} live
        </text>
      </svg>
      <p>Trips in progress, grouped by destination</p>
    </MapBox>
  );
}

function BookingsChart({ days }: { days: Overview["bookings_per_day"] }) {
  const max = Math.max(4, ...days.map((d) => d.count));
  const top = Math.ceil(max / 4) * 4;
  const points = days.map((d, i) => {
    const x = days.length > 1 ? (i / (days.length - 1)) * 720 : 0;
    const y = 180 - (d.count / top) * 160;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const ticks = [4, 3, 2, 1, 0].map((n) => Math.round((top / 4) * n));
  const labels = [0, 3, 6, 9, 13].map((i) => days[i]).filter(Boolean);
  return (
    <Chart>
      <div>
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <svg viewBox="0 0 720 190" preserveAspectRatio="none" role="img" aria-label="Bookings per day, last 14 days">
        <path className="grid" d="M0 20H720M0 60H720M0 100H720M0 140H720M0 180H720" />
        <polyline className="line" points={points.join(" ")} />
      </svg>
      <div>
        {labels.map((d) => (
          <span key={d.day}>{shortDate(d.day).replace(/^\w+,?\s*/, "")}</span>
        ))}
      </div>
    </Chart>
  );
}

type Item = { tone: "error" | "warning"; icon: ReactNode; title: string; sub: string; href: string };

export function OverviewView({ data, error }: { data: Overview | null; error: string | null }) {
  if (!data) {
    return (
      <>
        <PageHeader title="Overview" description="Live operating picture across trips, bookings and money movement." />
        <Banner $tone="error">
          <XCircle size={20} />
          <span>Could not load the overview. {error}</span>
        </Banner>
      </>
    );
  }

  const items: Item[] = [
    data.safety_reports > 0 && {
      tone: "error" as const,
      icon: <Shield size={20} />,
      title: `${data.safety_reports} open safety ${data.safety_reports === 1 ? "report" : "reports"}`,
      sub: "Riders flagged a safety concern",
      href: "/admin/disputes",
    },
    data.failed_payouts > 0 && {
      tone: "error" as const,
      icon: <XCircle size={20} />,
      title: `${data.failed_payouts} failed ${data.failed_payouts === 1 ? "payout" : "payouts"}`,
      sub: "Drivers waiting on money",
      href: "/admin/payments?tab=payouts",
    },
    data.pending_drivers > 0 && {
      tone: "warning" as const,
      icon: <SealCheck size={20} />,
      title: `${data.pending_drivers} ${data.pending_drivers === 1 ? "driver" : "drivers"} to verify`,
      sub: "Documents waiting for review",
      href: "/admin/drivers",
    },
    data.pending_refunds > 0 && {
      tone: "warning" as const,
      icon: <ArrowUUpLeft size={20} />,
      title: `${data.pending_refunds} refund ${data.pending_refunds === 1 ? "request" : "requests"}`,
      sub: "Passengers asked for money back",
      href: "/admin/refunds",
    },
    data.open_reports - data.safety_reports > 0 && {
      tone: "warning" as const,
      icon: <Warning size={20} />,
      title: `${data.open_reports - data.safety_reports} other open ${data.open_reports - data.safety_reports === 1 ? "case" : "cases"}`,
      sub: "Lost items and user reports",
      href: "/admin/disputes",
    },
  ].filter(Boolean) as Item[];

  const kpis = [
    { label: "Live trips", value: String(data.live_trips), note: `${data.trips_today} departing today`, icon: <RouteTrip size={20} /> },
    { label: "Bookings today", value: String(data.bookings_today), note: "Since midnight, Nairobi", icon: <Calendar size={20} /> },
    { label: "Seat value today", value: kes(data.seat_value_today), note: "Excludes cancelled", icon: <HandCoins size={20} /> },
    { label: "Kipita fees today", value: kes(data.fees_today), note: "From paid bookings", icon: <Wallet size={20} /> },
    { label: "Held in escrow", value: kes(data.escrow_held), note: "Awaiting trip completion", icon: <ShieldCheck size={20} /> },
    { label: "Open cases", value: String(data.open_reports), note: `${data.safety_reports} safety`, icon: <Shield size={20} /> },
  ];

  const total14 = data.bookings_per_day.reduce((n, d) => n + d.count, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live operating picture across trips, bookings and money movement."
        action={
          data.pending_drivers > 0 ? (
            <ButtonLink href="/admin/drivers">Review {data.pending_drivers} drivers</ButtonLink>
          ) : undefined
        }
      />
      <Kpis>
        {kpis.map((k) => (
          <Kpi key={k.label}>
            <span>{k.icon}</span>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <em>{k.note}</em>
          </Kpi>
        ))}
      </Kpis>
      <Split>
        <Card>
          <CardHead
            title="Live trips"
            sub={`${data.live_trips} ${data.live_trips === 1 ? "trip" : "trips"} moving now`}
            aside={
              <TextLink href="/admin/trips?status=in_progress">
                Open live view <ArrowRight size={16} />
              </TextLink>
            }
          />
          <LiveMap routes={data.live_routes} total={data.live_trips} />
        </Card>
        <Card>
          <CardHead title="Needs attention" sub="Items requiring an operator" aside={<Pill>{items.length} open</Pill>} />
          <Attention>
            {items.length === 0 && <p>Nothing needs attention right now.</p>}
            {items.map((item) => (
              <Link key={item.title} href={item.href}>
                <Severity $tone={item.tone}>{item.icon}</Severity>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.sub}</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </Attention>
        </Card>
      </Split>
      <Split>
        <Card>
          <CardHead
            title="Bookings per day"
            sub="Last 14 days"
            aside={
              <Total>
                {total14.toLocaleString("en-KE")} <small>bookings</small>
              </Total>
            }
          />
          <BookingsChart days={data.bookings_per_day} />
        </Card>
        <Card>
          <CardHead title="Top routes" sub="Confirmed bookings, last 30 days" />
          {data.top_routes.length === 0 ? (
            <Quiet>No confirmed bookings in the last 30 days.</Quiet>
          ) : (
            <Routes>
              <tbody>
                {data.top_routes.map((r, i) => (
                  <tr key={`${r.from}-${r.to}`}>
                    <td>
                      <b>{i + 1}</b>
                      {r.from} → {r.to}
                    </td>
                    <td>
                      <strong>{r.bookings}</strong>
                      <small>{r.load ?? 0}% load</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Routes>
          )}
        </Card>
      </Split>
    </>
  );
}
