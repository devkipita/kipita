"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { CalendarBlank as CalendarDays, Lightning as Zap } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl } from "@/components/ui/primitives";
import { HOME_COPY } from "@/lib/home/copy";
import type { RidePreferences } from "@/lib/ride-detail";
import { ROLE_COPY } from "@/lib/home/labels";
import type { AppMode } from "@/lib/home/mode";
import { FieldBlock, FieldHead, Segmented, SegmentButton, TextInput } from "./fields";
import { ComfortToggles } from "./ComfortToggles";

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextQuarter(): { date: string; time: string } {
  const quarter = 1000 * 60 * 15;
  const slot = new Date(Math.ceil(Date.now() / quarter) * quarter);
  const y = slot.getFullYear();
  const m = String(slot.getMonth() + 1).padStart(2, "0");
  const d = String(slot.getDate()).padStart(2, "0");
  const hh = String(slot.getHours()).padStart(2, "0");
  const mm = String(slot.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
}

export function WhenModal({
  open,
  mode,
  date,
  time,
  preferences,
  onClose,
  onApply,
}: {
  open: boolean;
  mode: AppMode;
  date: string | null;
  time: string | null;
  preferences: RidePreferences;
  onClose: () => void;
  onApply: (next: {
    date: string | null;
    time: string | null;
    preferences: RidePreferences;
  }) => void;
}) {
  const [scheduled, setScheduled] = useState(Boolean(date));
  const [localDate, setLocalDate] = useState(date);
  const [localTime, setLocalTime] = useState(time);
  const [prefs, setPrefs] = useState(preferences);

  useEffect(() => {
    if (!open) return;
    setScheduled(Boolean(date));
    setLocalDate(date);
    setLocalTime(time);
    setPrefs(preferences);
  }, [open, date, time, preferences]);

  function chooseSchedule() {
    setScheduled(true);
    if (!localDate || !localTime) {
      const slot = nextQuarter();
      setLocalDate((d) => d ?? slot.date);
      setLocalTime((t) => t ?? slot.time);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="md"
      title={HOME_COPY.whenTitle}
      description={HOME_COPY.whenDesc}
      footer={
        <DrawerFooter>
          <ButtonEl type="button" $variant="ghost" onClick={onClose}>
            Cancel
          </ButtonEl>
          <ButtonEl
            type="button"
            $variant="primary"
            onClick={() =>
              onApply({
                date: scheduled ? localDate : null,
                time: scheduled ? localTime : null,
                preferences: prefs,
              })
            }
          >
            Apply
          </ButtonEl>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        <FieldBlock>
          <Segmented>
            <SegmentButton
              type="button"
              $active={!scheduled}
              onClick={() => setScheduled(false)}
            >
              <Zap size={15} />
              {HOME_COPY.whenNow}
            </SegmentButton>
            <SegmentButton
              type="button"
              $active={scheduled}
              onClick={chooseSchedule}
            >
              <CalendarDays size={15} />
              Schedule
            </SegmentButton>
          </Segmented>
        </FieldBlock>

        {scheduled && (
          <Grid>
            <FieldBlock>
              <FieldHead>
                <label htmlFor="when-date">Date</label>
              </FieldHead>
              <TextInput
                id="when-date"
                type="date"
                min={todayLocalISO()}
                value={localDate ?? ""}
                onChange={(e) => setLocalDate(e.target.value || null)}
              />
            </FieldBlock>
            <FieldBlock>
              <FieldHead>
                <label htmlFor="when-time">Departure time</label>
              </FieldHead>
              <TextInput
                id="when-time"
                type="time"
                value={localTime ?? ""}
                onChange={(e) => setLocalTime(e.target.value || null)}
              />
            </FieldBlock>
          </Grid>
        )}

        <FieldBlock>
          <FieldHead>
            <span className="k">{ROLE_COPY[mode].preferencesLabel}</span>
          </FieldHead>
          <ComfortToggles value={prefs} onChange={setPrefs} />
        </FieldBlock>
      </DrawerBody>
    </Drawer>
  );
}
