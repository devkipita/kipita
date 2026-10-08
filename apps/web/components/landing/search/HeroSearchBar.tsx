"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
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
      <FindRideSearchBar
        placeholder="Where are you going?"
        value={value}
        onSubmit={go}
        onClear={() => setValue(EMPTY)}
      />
    </Holder>
  );
}
