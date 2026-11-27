"use client";

import { useState } from "react";
import styled from "styled-components";
import { CaretRight } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { TRIP_FAQS } from "@/lib/trips/copy";
import { HelpPanel, Unfold, rowPress } from "./helpRows";

const Row = styled.button<{ $open: boolean }>`
  ${rowPress}

  svg {
    transform: rotate(${({ $open }) => ($open ? 90 : 0)}deg);
  }
`;

const Answer = styled(Unfold)`
  p {
    margin: 0;
    padding: 4px 12px 12px;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
`;

export function TripFaqs() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <HelpPanel>
      {TRIP_FAQS.map((f, i) => {
        const on = open === f.q;
        const id = `trip-faq-${i}`;
        return (
          <div key={f.q}>
            <Row
              type="button"
              $open={on}
              aria-expanded={on}
              aria-controls={id}
              onClick={() => setOpen(on ? null : f.q)}
            >
              <span>{f.q}</span>
              <CaretRight size={16} aria-hidden />
            </Row>
            <Answer $open={on} id={id}>
              <div inert={!on} aria-hidden={!on}>
                <p>{f.a}</p>
              </div>
            </Answer>
          </div>
        );
      })}
    </HelpPanel>
  );
}
