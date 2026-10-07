"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import { ArrowRight, Car, SealCheck, SlidersHorizontal, Star } from "@/components/icons";
import { Drawer } from "@/components/ui/Drawer";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import type { HomeTrip } from "@/lib/home/search";
import type { Profile } from "@/lib/auth/types";
import { useHomeSearch } from "./useHomeSearch";
import { FindRideSearchBar, type SearchBarValue } from "./FindRideSearchBar";
import {
  EMPTY_FILTERS,
  RideFilters,
  applyRideFilters,
  type RideFilterState,
} from "./RideFilters";

type Sort = "time" | "price" | "rating";

const SORTS: { key: Sort; label: string }[] = [
  { key: "time", label: "Earliest departure" },
  { key: "price", label: "Lowest price" },
  { key: "rating", label: "Best rated" },
];

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  padding: 56px max(34px, calc((100% - 1212px) / 2)) 120px;
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding: 28px 18px calc(90px + env(safe-area-inset-bottom));
  }
`;

const Overline = styled.span`
  display: inline-block;
  color: ${nocturne.ctaBg};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 10px 0 10px;
  font-size: clamp(40px, 5vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
`;

const Sub = styled.p`
  margin: 0;
  font-size: 18px;
  color: ${nocturne.muted};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 215px 1fr;
  gap: 32px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const FilterCol = styled.aside`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);

  @media (max-width: 960px) {
    display: none;
  }
`;

const Results = styled.section`
  min-width: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  font-size: 16px;
  color: ${nocturne.muted};

  strong {
    color: ${nocturne.cream};
  }
`;

const HeadTools = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SortGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.button<{ $on: boolean }>`
  padding: 9px 15px;
  border: 1px solid ${({ $on }) => ($on ? nocturne.accent : nocturne.line)};
  border-radius: 10px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.muted)};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    border-color: ${nocturne.accent};
    color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const FilterBtn = styled.button`
  display: none;

  @media (max-width: 960px) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border: 1px solid ${nocturne.line};
    border-radius: 999px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Card = styled.li<{ $i: number }>`
  position: relative;
  animation: ${rise} 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: ${({ $i }) => Math.min($i, 5) * 0.05}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CardBody = styled.article`
  position: relative;
  display: grid;
  grid-template-columns: 1.5fr 1.15fr 0.8fr;
  align-items: center;
  gap: 25px;
  padding: 26px;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.cardBorder};
  box-shadow: ${nocturne.cardShadow};
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: ${nocturne.accent};
  }

  @media (max-width: 960px) {
    grid-template-columns: 1.4fr 1fr 0.8fr;
    gap: 16px;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr auto;
    gap: 18px;
    padding: 22px 18px;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -10px;
  left: 20px;
  padding: 5px 11px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Route = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 700px) {
    grid-column: 1 / -1;
    padding-bottom: 16px;
    border-bottom: 1px solid ${nocturne.line};
  }
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  padding: 7px 0;

  i {
    flex: none;
    width: 10px;
    height: 10px;
    border: 2px solid ${nocturne.ctaBg};
    border-radius: 50%;
    background: ${nocturne.surface};
  }
  i:last-child {
    border-color: ${nocturne.accent};
  }
  span {
    flex: 1;
    width: 1px;
    min-height: 26px;
    background: ${nocturne.line};
  }
`;

const Times = styled.div`
  flex: 1;
  min-width: 0;

  .leg {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 10px;
    align-items: baseline;
  }
  .clock {
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
  .place {
    font-size: 16px;
    color: ${nocturne.cream};
  }
  .day {
    display: block;
    margin: 8px 0 8px 74px;
    font-size: 14px;
    color: ${nocturne.muted2};
  }
`;

const Driver = styled.div`
  display: grid;
  grid-template-columns: 46px 1fr;
  align-items: center;
  gap: 11px;

  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .who b {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 16px;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who b svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    font-size: 14px;
    color: ${nocturne.muted2};
  }
  .meta svg {
    color: #e6a42f;
  }
  .car {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: ${nocturne.muted2};
  }

  @media (max-width: 700px) {
    grid-column: 1;
    .car {
      display: none;
    }
  }
`;

const Avatar = styled.span`
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  overflow: hidden;
  border-radius: 50%;
  background: ${nocturne.sage};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 800;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Price = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;

  .amount {
    font-size: 22px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  .per,
  .seats {
    font-size: 13px;
    color: ${nocturne.muted2};
  }

  @media (max-width: 700px) {
    grid-column: 2;
    grid-row: 2;
  }
`;

const View = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 42px;
  margin-top: 6px;
  padding: 0 18px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(0.94);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Empty = styled.div`
  padding: 56px 28px;
  border-radius: 24px;
  border: 1px solid ${nocturne.line};
  background: ${nocturne.surface};
  text-align: center;

  h2 {
    margin: 0 0 10px;
    font-size: clamp(24px, 3vw, 32px);
    color: ${nocturne.cream};
  }
  p {
    max-width: 48ch;
    margin: 0 auto 22px;
    font-size: 17px;
    line-height: 1.6;
    color: ${nocturne.muted};
  }
`;

const ctaStyle = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
  padding: 0 26px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Cta = styled(Link)`
  ${ctaStyle}
`;

const CtaButton = styled.button`
  ${ctaStyle}
`;

const Offers = styled.section`
  margin-top: 44px;
  padding-top: 36px;
  border-top: 1px solid ${nocturne.line};
`;

const MoreWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
`;

const MoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 50px;
  padding: 0 28px;
  border: 1px solid ${nocturne.accent};
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.accent};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: ${nocturne.accent};
    color: ${nocturne.onGreen};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const MoreNote = styled.span`
  font-size: 14px;
  color: ${nocturne.muted2};
`;

const PAGE = 6;

function initials(name: string | null | undefined) {
  return (name || "K")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function dayLabel(date: string | null) {
  if (!date) return "Flexible date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function clock(time: string | null) {
  return time ? time.slice(0, 5) : "--:--";
}

function vehicleLabel(t: HomeTrip) {
  const v = t.vehicle;
  const parts = [v?.color, v?.make, v?.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Verified ride";
}

export function FindRideView({
  profile,
  initialItems,
  initialForm,
  offersSlot,
}: {
  profile: Profile | null;
  initialItems: HomeTrip[];
  initialForm: SearchBarValue;
  offersSlot?: ReactNode;
}) {
  const router = useRouter();
  const search = useHomeSearch("passenger", initialItems);
  const [form, setForm] = useState<SearchBarValue>(initialForm);
  const [filters, setFilters] = useState<RideFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("time");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const trips = useMemo(
    () => search.items.filter((i): i is HomeTrip => i.kind === "trip"),
    [search.items],
  );

  const visible = useMemo(() => {
    const filtered = applyRideFilters(trips, filters);
    const sorted = [...filtered];
    if (sort === "price") {
      sorted.sort((a, b) => a.price_per_seat - b.price_per_seat);
    } else if (sort === "rating") {
      sorted.sort(
        (a, b) => Number(b.person?.rating ?? 0) - Number(a.person?.rating ?? 0),
      );
    } else {
      sorted.sort((a, b) =>
        `${a.departure_date ?? ""}${a.departure_time ?? ""}`.localeCompare(
          `${b.departure_date ?? ""}${b.departure_time ?? ""}`,
        ),
      );
    }
    return sorted;
  }, [trips, filters, sort]);

  const page = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const remaining = visible.length - page.length;

  useEffect(() => {
    setShown(PAGE);
  }, [filters, sort, trips]);

  function runSearch(next: SearchBarValue) {
    setForm(next);
    const params = new URLSearchParams();
    if (next.from.trim()) params.set("from", next.from.trim());
    if (next.to.trim()) params.set("to", next.to.trim());
    if (next.date) params.set("date", next.date);
    if (next.seats > 1) params.set("seats", String(next.seats));
    const qs = params.toString();
    router.replace(qs ? `/home?${qs}` : "/home", { scroll: false });
    void search.run(
      {
        from: next.from,
        to: next.to,
        date: next.date || null,
        departure_time: null,
        preferences: {},
        seats: next.seats,
      },
      { deliberate: true },
    );
  }

  const heading =
    form.from && form.to
      ? `${form.from} to ${form.to}`
      : form.to
        ? `Rides to ${form.to}`
        : form.from
          ? `Rides from ${form.from}`
          : "Every ride going your way";

  const busy = search.phase === "searching";

  return (
    <Page>
      <Overline>Find a ride</Overline>
      <Title>{heading}</Title>
      <Sub>
        {form.date ? dayLabel(form.date) : "Any day"} · {form.seats}{" "}
        {form.seats === 1 ? "passenger" : "passengers"}
      </Sub>

      <FindRideSearchBar
        value={form}
        busy={busy}
        onSubmit={runSearch}
        onClear={() => runSearch({ from: "", to: "", date: "", seats: 1 })}
      />

      <Layout>
        <FilterCol aria-label="Filter rides">
          <RideFilters value={filters} onChange={setFilters} />
        </FilterCol>

        <Results aria-busy={busy}>
          <Head>
            <span aria-live="polite">
              <strong>
                {visible.length} {visible.length === 1 ? "ride" : "rides"}
              </strong>{" "}
              available
            </span>
            <HeadTools>
              <FilterBtn type="button" onClick={() => setSheetOpen(true)}>
                <SlidersHorizontal size={18} aria-hidden />
                Filters
              </FilterBtn>
              <SortGroup role="group" aria-label="Sort rides">
                {SORTS.map((s) => (
                  <Chip
                    key={s.key}
                    type="button"
                    $on={sort === s.key}
                    aria-pressed={sort === s.key}
                    onClick={() => setSort(s.key)}
                  >
                    {s.label}
                  </Chip>
                ))}
              </SortGroup>
            </HeadTools>
          </Head>

          {visible.length ? (
            <>
            <List aria-label="Available rides">
              {page.map((t, i) => (
                <Card key={t.id} $i={i}>
                  <CardBody
                    data-ride-card
                    aria-label={`${t.from_location} to ${t.to_location}, ${formatKes(t.price_per_seat)} per passenger`}
                  >
                  {i === 0 && sort === "time" && <Badge>Best match</Badge>}

                  <Route>
                    <Timeline aria-hidden>
                      <i />
                      <span />
                      <i />
                    </Timeline>
                    <Times>
                      <div className="leg">
                        <span className="clock">{clock(t.departure_time)}</span>
                        <span className="place">{t.from_location}</span>
                      </div>
                      <span className="day">{dayLabel(t.departure_date)}</span>
                      <div className="leg">
                        <span className="clock" aria-hidden />
                        <span className="place">{t.to_location}</span>
                      </div>
                    </Times>
                  </Route>

                  <Driver>
                    <Avatar aria-hidden>
                      {t.person?.avatar_url ? (
                        <img src={t.person.avatar_url} alt="" />
                      ) : (
                        initials(t.person?.full_name)
                      )}
                    </Avatar>
                    <span className="who">
                      <b>
                        {t.person?.full_name || "Kipita driver"}
                        {t.person?.is_verified && (
                          <SealCheck size={16} aria-label="Verified driver" />
                        )}
                      </b>
                      <span className="meta">
                        <Star size={14} weight="fill" aria-hidden />
                        {Number(t.person?.rating ?? 0).toFixed(1)} ·{" "}
                        {t.person?.total_trips ?? 0} trips
                      </span>
                    </span>
                    <span className="car">
                      <Car size={16} aria-hidden />
                      {vehicleLabel(t)}
                    </span>
                  </Driver>

                  <Price>
                    <span className="amount">{formatKes(t.price_per_seat)}</span>
                    <span className="per">per passenger</span>
                    <span className="seats">
                      {t.seats_available}{" "}
                      {t.seats_available === 1 ? "seat" : "seats"} left
                    </span>
                    <View
                      href={`/ride/${t.id}`}
                      aria-label={`View ride from ${t.from_location} to ${t.to_location}`}
                    >
                      View ride <ArrowRight size={16} aria-hidden />
                    </View>
                  </Price>
                  </CardBody>
                </Card>
              ))}

            </List>

            {remaining > 0 && (
              <MoreWrap>
                <MoreBtn type="button" onClick={() => setShown((n) => n + PAGE)}>
                  See more rides
                </MoreBtn>
                <MoreNote aria-live="polite">
                  Showing {page.length} of {visible.length}
                </MoreNote>
              </MoreWrap>
            )}
            </>
          ) : (
            <Empty>
              <h2>
                {trips.length
                  ? "No rides match these filters"
                  : "No rides on this route yet"}
              </h2>
              <p>
                {trips.length
                  ? "Try clearing a filter or widening your departure window."
                  : "Nobody has posted this trip for your dates. Try a nearby day, or publish the ride yourself and let passengers come to you."}
              </p>
              {trips.length ? (
                <CtaButton
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Clear filters
                </CtaButton>
              ) : (
                <Cta
                  href={
                    profile
                      ? "/publish"
                      : "/auth/sign-in?next=%2Fpublish"
                  }
                >
                  Publish a ride <ArrowRight size={18} aria-hidden />
                </Cta>
              )}
            </Empty>
          )}

          {offersSlot ? (
            <Offers aria-label="Offers and coupons" data-offers>
              {offersSlot}
            </Offers>
          ) : null}
        </Results>
      </Layout>

      <Drawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter rides"
      >
        <RideFilters value={filters} onChange={setFilters} />
      </Drawer>
    </Page>
  );
}
