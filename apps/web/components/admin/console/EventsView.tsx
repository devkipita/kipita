"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { Info } from "@/components/icons";
import {
  Banner,
  Card,
  CardHead,
  DataTable,
  EmptyState,
  PageHeader,
  SamplePill,
  StatusChip,
  TabButton,
  TableScroll,
  Tabs,
  Toolbar,
  useToast,
} from "./ui";

type EventStatus = "pending" | "live" | "rejected";

type SampleEvent = { id: string; name: string; city: string; date: string; organiser: string; status: EventStatus; rides: number; seats: number; featured: boolean };

const SAMPLE: SampleEvent[] = [
  { id: "e1", name: "Nakuru open-air music day", city: "Nakuru", date: "Sat, 24 Nov", organiser: "Mwangaza Events", status: "pending", rides: 18, seats: 42, featured: false },
  { id: "e2", name: "Naivasha food and arts fair", city: "Naivasha", date: "Sun, 25 Nov", organiser: "Rift Collective", status: "live", rides: 26, seats: 71, featured: true },
  { id: "e3", name: "Kisumu lakeside marathon", city: "Kisumu", date: "Sat, 30 Nov", organiser: "Run Kenya", status: "live", rides: 34, seats: 98, featured: false },
  { id: "e4", name: "Eldoret harvest festival", city: "Eldoret", date: "Sun, 1 Dec", organiser: "Uasin Gishu Arts", status: "rejected", rides: 0, seats: 0, featured: false },
  { id: "e5", name: "Limuru live sessions", city: "Limuru", date: "Fri, 6 Dec", organiser: "Green Stage", status: "pending", rides: 8, seats: 16, featured: false },
];

const THUMBS = ["#B5D4C2", "#D7D0AE", "#B8CCE0", "#DBC1CF", "#C9D7B9"];

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Thumb = styled.span<{ $bg: string; $big?: boolean }>`
  position: relative;
  width: ${({ $big }) => ($big ? "100%" : "62px")};
  height: ${({ $big }) => ($big ? "130px" : "42px")};
  flex: none;
  overflow: hidden;
  display: block;
  border-radius: ${({ $big }) => ($big ? "0" : "7px")};
  background: ${({ $bg }) => $bg};

  i:first-child {
    position: absolute;
    width: ${({ $big }) => ($big ? "90px" : "28px")};
    height: ${({ $big }) => ($big ? "90px" : "28px")};
    left: 6px;
    bottom: -8px;
    border-radius: 50%;
    background: #2c694d;
  }
  i:nth-child(2) {
    position: absolute;
    width: ${({ $big }) => ($big ? "55px" : "22px")};
    height: ${({ $big }) => ($big ? "55px" : "22px")};
    right: ${({ $big }) => ($big ? "20px" : "5px")};
    top: 5px;
    border-radius: 50%;
    background: #ea7747;
  }
  b {
    position: absolute;
    width: ${({ $big }) => ($big ? "150px" : "46px")};
    height: ${({ $big }) => ($big ? "12px" : "5px")};
    left: ${({ $big }) => ($big ? "30px" : "10px")};
    top: ${({ $big }) => ($big ? "60px" : "20px")};
    border-radius: 4px;
    background: #f8f6ef;
    transform: rotate(-18deg);
  }
`;

const Name = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;

  strong {
    max-width: 180px;
    color: ${({ theme }) => theme.color.text};
  }
`;

const RowActions = styled.div`
  display: flex;
  gap: 4px;

  button {
    min-height: 30px;
    padding: 0 8px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 7px;
    color: ${({ theme }) => theme.color.primary};
    background: ${({ theme }) => theme.color.surface};
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Phone = styled.div`
  width: 230px;
  margin: 18px auto;
  padding: 14px;
  overflow: hidden;
  border: 6px solid #1d2b25;
  border-radius: 24px;
  background: ${({ theme }) => theme.color.background};

  h3 {
    margin: 8px 0 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 14px;
    color: ${({ theme }) => theme.color.text};
  }
  > div {
    position: relative;
    margin-top: 10px;
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 12px;
    background: ${({ theme }) => theme.color.surface};
  }
  > div > em {
    position: absolute;
    left: 8px;
    top: 106px;
    padding: 4px 7px;
    border-radius: 999px;
    color: ${({ theme }) => theme.color.onPrimaryContainer};
    background: ${({ theme }) => theme.color.primaryContainer};
    font-size: 8px;
    font-style: normal;
    font-weight: 700;
  }
  > div > p {
    margin: 0;
    padding: 9px;
    display: flex;
    flex-direction: column;
  }
  strong {
    font-size: 10px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 8px;
  }
  > span {
    width: 100%;
    height: 34px;
    margin-top: 9px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: ${({ theme }) => theme.color.onPrimaryContainer};
    background: ${({ theme }) => theme.color.primaryContainer};
    font-size: 10px;
    font-weight: 700;
  }
`;

const Facts = styled.dl`
  margin: 0;

  > div {
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    font-size: 11px;
  }
  dt {
    color: ${({ theme }) => theme.color.muted};
  }
  dd {
    margin: 0;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
`;

const TABS: { key: "all" | EventStatus; label: string }[] = [
  { key: "all", label: "All events" },
  { key: "pending", label: "Pending review" },
  { key: "live", label: "Live" },
  { key: "rejected", label: "Rejected" },
];

export function EventsView() {
  const toast = useToast();
  const [events, setEvents] = useState(SAMPLE);
  const [tab, setTab] = useState<"all" | EventStatus>("all");
  const [selectedId, setSelectedId] = useState(SAMPLE[0].id);

  const rows = useMemo(() => (tab === "all" ? events : events.filter((e) => e.status === tab)), [events, tab]);
  const selected = events.find((e) => e.id === selectedId) ?? events[0];
  const index = events.findIndex((e) => e.id === selected.id);

  const update = (id: string, patch: Partial<SampleEvent>, message: string) => {
    setEvents((all) => all.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    toast.show(`${message} Sample only, nothing was saved.`);
  };

  return (
    <>
      <PageHeader title="Events" description="Moderate events and the shared rides published around them." />
      <Banner $tone="info">
        <Info size={20} />
        <span>Events have no table yet. Everything on this page is sample data, and actions are not saved.</span>
      </Banner>
      <Layout>
        <Card $flush>
          <Toolbar $inline>
            <Tabs style={{ borderBottom: 0 }}>
              {TABS.map((t) => (
                <TabButton key={t.key} $on={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                  {t.key === "pending" && <b>{events.filter((e) => e.status === "pending").length}</b>}
                </TabButton>
              ))}
            </Tabs>
            <SamplePill />
          </Toolbar>
          {rows.length === 0 ? (
            <EmptyState title="No events" body="Nothing in this list." />
          ) : (
            <TableScroll>
              <DataTable>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>City</th>
                    <th>Date</th>
                    <th>Organiser</th>
                    <th>Status</th>
                    <th>Rides</th>
                    <th>Seats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} data-clickable="" onClick={() => setSelectedId(e.id)} style={{ height: 64 }}>
                      <td>
                        <Name>
                          <Thumb $bg={THUMBS[events.indexOf(e) % THUMBS.length]}>
                            <i />
                            <i />
                            <b />
                          </Thumb>
                          <strong>{e.name}</strong>
                        </Name>
                      </td>
                      <td>{e.city}</td>
                      <td>{e.date}</td>
                      <td>{e.organiser}</td>
                      <td>
                        <StatusChip status={e.status} />
                      </td>
                      <td>
                        <strong>{e.rides}</strong>
                      </td>
                      <td>
                        <strong>{e.seats}</strong>
                      </td>
                      <td>
                        <RowActions onClick={(ev) => ev.stopPropagation()}>
                          <button type="button" disabled={e.status === "live"} onClick={() => update(e.id, { status: "live" }, `${e.name} approved.`)}>
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={e.status !== "live"}
                            onClick={() => update(e.id, { featured: !e.featured }, e.featured ? `${e.name} removed from home.` : `${e.name} featured on home.`)}
                          >
                            {e.featured ? "Unfeature" : "Feature"}
                          </button>
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </TableScroll>
          )}
        </Card>
        <Card>
          <CardHead title="Mobile preview" sub="Home event card" aside={<SamplePill />} />
          <Phone>
            <h3>Going out this week</h3>
            <div>
              <Thumb $big $bg={THUMBS[index % THUMBS.length]}>
                <i />
                <i />
                <b />
              </Thumb>
              <em>{selected.date}</em>
              <p>
                <strong>{selected.name}</strong>
                <small>{selected.city} · from KES 500</small>
              </p>
            </div>
            <span>Find rides</span>
          </Phone>
          <Facts>
            <div>
              <dt>Home feature</dt>
              <dd>{selected.featured ? "On" : "Off"}</dd>
            </div>
            <div>
              <dt>Event rides</dt>
              <dd>{selected.rides} offered</dd>
            </div>
            <div>
              <dt>Moderation</dt>
              <dd>{selected.status === "pending" ? "Needs approval" : selected.status === "live" ? "Approved" : "Rejected"}</dd>
            </div>
          </Facts>
        </Card>
      </Layout>
      {toast.node}
    </>
  );
}
