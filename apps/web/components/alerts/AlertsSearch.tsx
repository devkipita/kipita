"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass as Search, X } from "@/components/icons";
import { IconAction } from "@/components/ui/Chip";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Shell = styled.div`
  position: relative;
  margin-bottom: 16px;

  svg.lead {
    position: absolute;
    left: 12px;
    top: 12px;
    color: ${nocturne.muted};
    pointer-events: none;
  }
`;

const Input = styled.input`
  display: block;
  width: 100%;
  height: 44px;
  padding: 0 44px;
  border-radius: 12px;
  border: 1px solid ${nocturne.outline};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  &::placeholder {
    color: ${nocturne.muted2};
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
  &:focus {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Clear = styled(IconAction)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  min-height: 0;
`;

export function AlertsSearchField() {
  return (
    <Shell>
      <Search className="lead" size={20} aria-hidden="true" />
      <Input type="search" readOnly placeholder="Search roads and alerts" aria-label="Search roads and alerts" />
    </Shell>
  );
}

export function AlertsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const id = setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Shell role="search">
      <Search className="lead" size={20} aria-hidden="true" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            setValue("");
          }
        }}
        placeholder="Search roads and alerts"
        aria-label="Search roads and alerts"
      />
      {value && (
        <Clear
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <X size={20} />
        </Clear>
      )}
    </Shell>
  );
}
