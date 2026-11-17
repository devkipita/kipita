"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass as Search, X } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

const Shell = styled.div`
  position: relative;
  margin-bottom: 16px;

  svg.lead {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${nocturne.muted};
    pointer-events: none;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 0 48px 0 42px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${nocturne.outline};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;

  &::placeholder {
    color: ${nocturne.muted};
  }
  &:focus {
    border-color: ${nocturne.accent};
  }
  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

const Clear = styled.button`
  position: absolute;
  right: 1px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.muted};
  cursor: pointer;

  &:hover {
    background: ${nocturne.surface2};
    color: ${nocturne.cream};
  }
`;

export function AlertsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const first = useRef(true);

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
    <Shell>
      <Search className="lead" size={17} aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search roads and alerts"
        aria-label="Search roads and alerts"
      />
      {value && (
        <Clear type="button" onClick={() => setValue("")} aria-label="Clear search">
          <X size={16} />
        </Clear>
      )}
    </Shell>
  );
}
