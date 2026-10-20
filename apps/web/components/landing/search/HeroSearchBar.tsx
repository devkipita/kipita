"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";
import {
  FindRideSearchBar,
  type SearchBarValue,
} from "@/components/home/FindRideSearchBar";

const EMPTY: SearchBarValue = { from: "", to: "", date: "", seats: 1 };

/**
 * Full search panel on desktop; the shared bar collapses itself to a single
 * input under 760px, where the sheet gives the room instead. Searching hands
 * off to /home, which is the find-a-ride page.
 */
const Holder = styled.div`
  width: 100%;
  max-width: 1120px;

  form {
    margin: 0;
  }

  @media (max-width: 760px) {
    max-width: 560px;
  }
`;

const SearchLabel = styled.h2`
  display: none;

  @media (max-width: 760px) {
    display: block;
    margin: 0 0 14px 2px;
    font-size: clamp(30px, 8.5vw, 40px);
    font-weight: 700;
    line-height: 1.04;
    letter-spacing: -0.035em;
    color: #ffffff;

    em {
      font-style: normal;
      color: ${nocturne.sage};
    }
  }
`;

export function HeroSearchBar() {
  const router = useRouter();
  const [value, setValue] = useState<SearchBarValue>(EMPTY);

  function go(next: SearchBarValue) {
    setValue(next);
    const params = new URLSearchParams();
    if (next.from.trim()) params.set("from", next.from.trim());
    if (next.to.trim()) params.set("to", next.to.trim());
    if (next.date) params.set("date", next.date);
    if (next.seats > 1) params.set("seats", String(next.seats));
    const qs = params.toString();
    router.push(qs ? `/home?${qs}` : "/home");
  }

  return (
    <Holder>
      <SearchLabel>
        Find <em>a ride</em>
      </SearchLabel>
      <FindRideSearchBar
        placeholder="Where to?"
        value={value}
        onSubmit={go}
        onClear={() => setValue(EMPTY)}
      />
    </Holder>
  );
}
