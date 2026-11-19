"use client";

import Link from "next/link";
import { useState } from "react";
import styled from "styled-components";
import { ArrowOut, Plus } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { TRIP_FAQS } from "@/lib/trips/copy";
import { HelpPanel, Unfold, rowLook } from "./helpRows";

const Row = styled.button<{ $open: boolean }>`
  ${rowLook}

  svg {
    transform: rotate(${({ $open }) => ($open ? 45 : 0)}deg);
  }
`;

const More = styled(Link)`
  ${rowLook}
  color: ${nocturne.green};
`;

const Answer = styled(Unfold)`
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: ${nocturne.muted};
  }
`;

export function TripFaqs() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <HelpPanel>
      {TRIP_FAQS.map((f) => {
        const on = open === f.q;
        return (
          <div key={f.q}>
            <Row type="button" $open={on} aria-expanded={on} onClick={() => setOpen(on ? null : f.q)}>
              {f.q}
              <Plus size={28} />
            </Row>
            {on && (
              <Answer>
                <p>{f.a}</p>
              </Answer>
            )}
          </div>
        );
      })}
      <More href="/help#faq">
        All help articles
        <ArrowOut size={18} />
      </More>
    </HelpPanel>
  );
}
