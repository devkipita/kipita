"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import type { Town } from "@kipita/shared";
import { AlertComposer } from "@/components/alerts/AlertComposer";
import { ContentWidth, useAppMode } from "@/components/nav/AppShell";
import type { Alert } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { HOME_COPY } from "@/lib/home/copy";
import { detectOrigin, type Coords } from "@/lib/home/geo";
import { buildMapModel } from "@/lib/home/mapData";
import type { HomeItem } from "@/lib/home/search";
import { AlertsPanel } from "./AlertsPanel";
import { HomeMapBand } from "./HomeMapBand";
import { LocalWeather } from "./LocalWeather";
import { PlaceModal, pushRecent, type PlaceField } from "./PlaceModal";
import { PostDrawer, type PostDraft } from "./PostDrawer";
import { PromoBand } from "./PromoBand";
import { RideCarousel } from "./RideCarousel";
import type { SearchForm } from "./RouteSearchForm";
import { SearchDock, type OriginStatus } from "./SearchDock";
import { WhenModal } from "./WhenModal";
import { useHomeSearch } from "./useHomeSearch";

const Wrap = styled(ContentWidth)`
  padding-bottom: 56px;
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const Greeting = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 26px;

  .text {
    flex: 1;
    min-width: 200px;
  }
  h1 {
    margin: 0;
    font-size: ${({ theme }) => theme.type.heading};
    font-weight: 700;
    letter-spacing: -0.025em;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 3px 0 0;
    font-size: ${({ theme }) => theme.type.body};
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

function scheduleLabelFor(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const dt = new Date(`${date}T${time ?? "00:00"}`);
  if (Number.isNaN(dt.getTime())) return null;
  const day = dt.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: time ? undefined : "short",
  });
  return time ? `${day}, ${time}` : day;
}

export function HomeView({
  profile,
  initialItems,
  initialAlerts,
  offersSlot,
  destinationsSlot,
}: {
  profile: Profile;
  initialItems: HomeItem[];
  initialAlerts: Alert[];
  offersSlot: ReactNode;
  destinationsSlot: ReactNode;
}) {
  const router = useRouter();
  const { mode } = useAppMode();
  const [alertOpen, setAlertOpen] = useState(false);
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<SearchForm["preferences"]>({});

  const [placeField, setPlaceField] = useState<PlaceField | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);

  const [originStatus, setOriginStatus] = useState<OriginStatus>("idle");
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const fromTouched = useRef(false);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);

  const search = useHomeSearch(mode, initialItems);
  const { items, phase, lastForm, searchRequested, run, clearSearchRequest } =
    search;

  const mapModel = useMemo(() => buildMapModel(items), [items]);

  useEffect(() => {
    const controller = new AbortController();
    setOriginStatus("detecting");

    detectOrigin(controller.signal)
      .then((origin) => {
        if (!origin) {
          setOriginStatus("failed");
          return;
        }
        setOriginCoords(origin.coords);
        setOriginStatus("ready");
        if (!fromTouched.current) setFrom((current) => current || origin.town.name);
      })
      .catch(() => setOriginStatus("failed"));

    return () => controller.abort();
  }, []);

  const firstMode = useRef(mode);
  useEffect(() => {
    if (mode === firstMode.current) return;
    void run(lastForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const runSearch = useCallback(
    (overrides: Partial<SearchForm> = {}) => {
      const form: SearchForm = {
        from,
        to,
        date,
        departure_time: time,
        preferences,
        ...overrides,
      };
      void run(form, { deliberate: true }).then(() => setFitKey((k) => k + 1));
    },
    [from, to, date, time, preferences, run],
  );

  const openPost = useCallback(
    (form: SearchForm | null) => {
      const nextFrom = form?.from ?? from;
      const nextTo = form?.to ?? to;
      if (nextFrom.trim().length < 2 || nextTo.trim().length < 2) return;

      setPostDraft({
        role: mode,
        from: nextFrom,
        to: nextTo,
        date: form?.date ?? date,
        departure_time: form?.departure_time ?? time,
        preferences: form?.preferences ?? preferences,
      });
    },
    [mode, from, to, date, time, preferences],
  );

  useEffect(() => {
    if (!searchRequested || phase !== "ready") return;
    clearSearchRequest();
    if (items.length === 0) openPost(null);
  }, [searchRequested, phase, items.length, clearSearchRequest, openPost]);

  function pickTown(field: PlaceField, town: Town) {
    if (field === "from") {
      fromTouched.current = true;
      setFrom(town.name);
      setPlaceField("to");
      return;
    }
    setTo(town.name);
    setPlaceField(null);
    runSearch({ to: town.name });
  }

  function pickRoute(fromName: string, toName: string) {
    fromTouched.current = true;
    setFrom(fromName);
    setTo(toName);
    pushRecent(toName);
    setPlaceField(null);
    runSearch({ from: fromName, to: toName });
  }

  return (
    <>
      <HomeMapBand
        items={items}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        fitKey={fitKey}
      />

      <Wrap $max={1180}>
        <SearchDock
          from={from}
          to={to}
          scheduleLabel={scheduleLabelFor(date, time)}
          originStatus={originStatus}
          onOpenField={setPlaceField}
          onOpenWhen={() => setWhenOpen(true)}
        />

        <Greeting>
          <div className="text">
            <h1>{HOME_COPY.greeting(firstName(profile.full_name))}</h1>
            <p>{HOME_COPY.greetingSub[mode]}</p>
          </div>
          <LocalWeather town={from} />
        </Greeting>

        <RideCarousel
          mode={mode}
          phase={phase}
          items={items}
          onPost={() => openPost(null)}
          onRetry={() => void run(lastForm)}
          hoveredId={hoveredId}
          onHoverChange={setHoveredId}
        />

        {offersSlot}

        {destinationsSlot}

        <PromoBand />

        <AlertsPanel
          alerts={initialAlerts}
          viewerId={profile.id}
          onPost={() => setAlertOpen(true)}
        />
      </Wrap>

      <PlaceModal
        field={placeField}
        from={from}
        to={to}
        originCoords={originCoords}
        onFieldChange={setPlaceField}
        onPickTown={pickTown}
        onPickRoute={pickRoute}
        onClose={() => setPlaceField(null)}
      />

      <WhenModal
        open={whenOpen}
        mode={mode}
        date={date}
        time={time}
        preferences={preferences}
        onClose={() => setWhenOpen(false)}
        onApply={(next) => {
          setDate(next.date);
          setTime(next.time);
          setPreferences(next.preferences);
          setWhenOpen(false);
          runSearch({
            date: next.date,
            departure_time: next.time,
            preferences: next.preferences,
          });
        }}
      />

      <PostDrawer
        open={!!postDraft}
        draft={postDraft}
        onClose={() => setPostDraft(null)}
        onPosted={() => {
          setPostDraft(null);
          void run(lastForm);
        }}
      />

      <AlertComposer
        open={alertOpen}
        viewerId={profile.id}
        onClose={() => setAlertOpen(false)}
        onPosted={() => {
          setAlertOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
