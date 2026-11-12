"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { ArrowDown, Check, Clock, Phone, Star, XCircle } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import {
  dateTime,
  kes,
  shortDate,
  shortTime,
  tripCode,
  type Paged,
  type TripDetail,
  type TripRow,
} from "@/lib/admin/console";
import { fetchTripAction } from "@/lib/admin/console-actions";
import {
  Banner,
  ButtonLink,
  Card,
  ChipRow,
  DataTable,
  Drawer,
  EmptyState,
  FilterChip,
  Money,
  Pagination,
  PageHeader,
  PersonCell,
  SearchBox,
  Skeleton,
  StatusChip,
  TableScroll,
  Toolbar,
  Button,
} from "./ui";

const STATUSES: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "posted", label: "Published" },
  { key: "awaiting_approval", label: "Awaiting approval" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STRIPE: Record<string, string> = {
  sedan: "#BD7A3F",
  suv: "#6C70A8",
  van: "#3F8290",
  minibus: "#3F8290",
  pickup: "#4C8B67",
  motorbike: "#4C8B67",
};

const Row = styled.tr<{ $stripe: string }>`
  box-shadow: inset 4px 0 ${({ $stripe }) => $stripe};
`;

const Section = styled.section`
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h3 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 13px;
    color: ${({ theme }) => theme.color.text};
  }
  &:last-child {
    border-bottom: 0;
  }
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Fare = styled.div`
  margin-top: 9px;

  > div {
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 12px;
  }
  > div.emphasis {
    color: ${({ theme }) => theme.color.text};
    border-top: 1px dashed ${({ theme }) => theme.color.line};
  }
  strong {
    font-family: ${({ theme }) => theme.fontHeading};
  }
`;

const Party = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 9px;

  > span {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const Timeline = styled.ol`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    min-height: 44px;
    display: flex;
    gap: 9px;
  }
  li::before {
    content: "";
    position: absolute;
    left: 11px;
    top: 23px;
    bottom: 0;
    width: 1px;
    background: ${({ theme }) => theme.color.line};
  }
  li:last-child::before {
    display: none;
  }
  i {
    z-index: 1;
    width: 23px;
    height: 23px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: ${({ theme }) => theme.color.muted};
    background: ${({ theme }) => theme.color.surfaceVariant};
  }
  li[data-done] i {
    color: ${({ theme }) => theme.color.onPrimary};
    background: ${({ theme }) => theme.color.primary};
  }
  span {
    display: flex;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const LIVE_BOOKING = new Set(["confirmed", "in_progress", "completed"]);

function TripPanel({ trip }: { trip: TripDetail }) {
  const paid = trip.bookings.filter((b) => LIVE_BOOKING.has(b.status));
  const gross = paid.reduce((n, b) => n + Number(b.total), 0);
  const fees = paid.reduce((n, b) => n + Number(b.platform_fee ?? 0), 0);
  const driver = paid.reduce((n, b) => n + Number(b.driver_earning ?? Number(b.total) - Number(b.platform_fee ?? 0)), 0);
  const firstOf = (key: "created_at" | "held_at" | "released_at") =>
    paid.map((b) => b[key]).filter((v): v is string => !!v).sort()[0] ?? null;
  const moving = trip.status === "in_progress" || trip.status === "completed";

  const steps: { label: string; at: string | null; done: boolean }[] = [
    { label: "Published", at: trip.created_at, done: true },
    { label: "Booked", at: firstOf("created_at"), done: paid.length > 0 },
    { label: "Paid into escrow", at: firstOf("held_at"), done: !!firstOf("held_at") },
    { label: "Departed", at: null, done: moving },
    { label: "Completed", at: null, done: trip.status === "completed" },
    { label: "Payout sent", at: firstOf("released_at"), done: !!firstOf("released_at") },
  ];

  return (
    <>
      <Section>
        <Heading>
          <h3>Fare breakdown</h3>
          <StatusChip status={trip.status} />
        </Heading>
        <Fare>
          <div>
            <span>Seat price</span>
            <strong>{kes(trip.price_per_seat)}</strong>
          </div>
          <div>
            <span>Seats booked</span>
            <strong>
              {trip.seats_booked} of {trip.seats_total}
            </strong>
          </div>
          <div className="emphasis">
            <span>Passengers paid</span>
            <strong>{kes(gross)}</strong>
          </div>
          <div className="emphasis">
            <span>Kipita fees</span>
            <strong>{kes(fees)}</strong>
          </div>
          <div className="emphasis">
            <span>Driver receives</span>
            <strong>{kes(driver)}</strong>
          </div>
        </Fare>
      </Section>
      <Section>
        <h3>Participants</h3>
        <Party>
          <Avatar name={trip.driver.name || "Driver"} src={trip.driver.avatar} size={34} />
          <span>
            <strong>{trip.driver.name ?? "Unnamed driver"}</strong>
            <small>
              Driver{trip.vehicle ? ` · ${trip.vehicle}` : ""}
              {trip.plate ? `, ${trip.plate}` : ""}
            </small>
          </span>
        </Party>
        {trip.bookings.length === 0 && (
          <Party>
            <small>No bookings yet.</small>
          </Party>
        )}
        {trip.bookings.map((b) => (
          <Party key={b.id}>
            <Avatar name={b.passenger || "Passenger"} src={b.avatar} size={34} />
            <span>
              <strong>{b.passenger ?? "Passenger"}</strong>
              <small>
                {b.reference ?? "Booking"} · {b.seats} {b.seats === 1 ? "seat" : "seats"} · {kes(b.total)}
              </small>
            </span>
            <StatusChip status={b.escrow_status && b.escrow_status !== "none" ? b.escrow_status : b.status} />
          </Party>
        ))}
      </Section>
      <Section>
        <h3>Timeline</h3>
        <Timeline>
          {steps.map((s) => (
            <li key={s.label} data-done={s.done ? "" : undefined}>
              <i>{s.done ? <Check size={12} /> : <Clock size={12} />}</i>
              <span>
                <strong>{s.label}</strong>
                <small>{s.done ? (s.at ? dateTime(s.at) : "Done") : "Pending"}</small>
              </span>
            </li>
          ))}
        </Timeline>
      </Section>
    </>
  );
}

function toCsv(rows: TripRow[]) {
  const head = ["Trip", "From", "To", "Date", "Time", "Driver", "Vehicle", "Plate", "Seats booked", "Seats total", "Seat price", "Status"];
  const lines = rows.map((r) =>
    [tripCode(r.id), r.from, r.to, r.departure_date, r.departure_time ?? "", r.driver_name ?? "", r.vehicle ?? "", r.plate ?? "", r.seats_booked, r.seats_total, r.price_per_seat, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function TripsView({
  data,
  error,
  status,
  q,
  page,
  size,
}: {
  data: Paged<TripRow> | null;
  error: string | null;
  status: string;
  q: string;
  page: number;
  size: number;
}) {
  const [open, setOpen] = useState<{ row: TripRow; detail: TripDetail | null; failed: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const href = (next: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    const p = next.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const query = params.toString();
    return query ? `/admin/trips?${query}` : "/admin/trips";
  };

  const openTrip = (row: TripRow) => {
    setOpen({ row, detail: null, failed: false });
    startTransition(async () => {
      const detail = await fetchTripAction(row.id);
      setOpen((cur) => (cur?.row.id === row.id ? { row, detail, failed: !detail } : cur));
    });
  };

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kipita-trips-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Trips" description="Monitor departures, bookings, occupancy and trip status." />
      <Toolbar>
        <ChipRow>
          {STATUSES.map((s) => (
            <FilterChip key={s.key || "all"} href={href({ status: s.key })} $on={status === s.key} scroll={false}>
              {s.label}
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow>
          <SearchBox placeholder="Route, driver or plate" defaultValue={q} hidden={status ? { status } : undefined} />
          <Button $variant="secondary" onClick={exportCsv} disabled={!data?.rows.length}>
            <ArrowDown size={17} />
            Export CSV
          </Button>
        </ChipRow>
      </Toolbar>
      <Card $flush>
        {error ? (
          <EmptyState error title="We couldn't load trips" body={error} action={<ButtonLink $variant="outline" href={href({})}>Retry</ButtonLink>} />
        ) : !data ? (
          <Skeleton />
        ) : data.rows.length === 0 ? (
          <EmptyState
            title="No trips match these filters"
            body="Try removing a filter or searching for something else."
            action={<ButtonLink $variant="tonal" href="/admin/trips">Clear filters</ButtonLink>}
          />
        ) : (
          <TableScroll>
            <DataTable>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Route</th>
                  <th>Departs</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Seats</th>
                  <th>Seat price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Row
                    key={r.id}
                    $stripe={STRIPE[r.vehicle_type ?? ""] ?? "transparent"}
                    data-clickable=""
                    tabIndex={0}
                    onClick={() => openTrip(r)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openTrip(r))}
                  >
                    <td>
                      <strong>{tripCode(r.id)}</strong>
                    </td>
                    <td>
                      <strong>
                        {r.from} → {r.to}
                      </strong>
                    </td>
                    <td>
                      <span className="primary">{shortDate(r.departure_date)}</span>
                      <small>{shortTime(r.departure_time)}</small>
                    </td>
                    <td>
                      <PersonCell>
                        <Avatar name={r.driver_name || "Driver"} src={r.driver_avatar} size={28} />
                        <span>
                          <strong>{r.driver_name ?? "Unnamed"}</strong>
                          {r.driver_rating ? (
                            <small>
                              <Star size={11} weight="fill" /> {Number(r.driver_rating).toFixed(1)}
                            </small>
                          ) : null}
                        </span>
                      </PersonCell>
                    </td>
                    <td>
                      <strong>{r.vehicle ?? "—"}</strong>
                      <small>{r.plate ?? ""}</small>
                    </td>
                    <td>
                      <strong>
                        {r.seats_booked} of {r.seats_total} booked
                      </strong>
                    </td>
                    <td>
                      <Money>{kes(r.price_per_seat)}</Money>
                    </td>
                    <td>
                      <StatusChip status={r.status} />
                    </td>
                  </Row>
                ))}
              </tbody>
            </DataTable>
          </TableScroll>
        )}
      </Card>
      {data && data.total > 0 && (
        <Pagination page={page} size={size} total={data.total} noun="trips" href={(p) => href({ page: p })} />
      )}
      {open && (
        <Drawer
          eyebrow={`Trip ${tripCode(open.row.id)}`}
          title={`${open.row.from} → ${open.row.to}`}
          close={() => setOpen(null)}
          footer={
            <>
              {open.detail?.driver.phone && (
                <ButtonLink $variant="secondary" href={`tel:${open.detail.driver.phone}`}>
                  <Phone size={17} />
                  Call driver
                </ButtonLink>
              )}
              <ButtonLink $variant="outline" href="/admin/refunds">
                Refund requests
              </ButtonLink>
            </>
          }
        >
          {open.failed ? (
            <Banner $tone="error">
              <XCircle size={20} />
              <span>Could not load this trip.</span>
            </Banner>
          ) : open.detail ? (
            <TripPanel trip={open.detail} />
          ) : (
            <Skeleton rows={5} />
          )}
        </Drawer>
      )}
    </>
  );
}
