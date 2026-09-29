"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass as Search, X } from "@/components/icons";

const Shell = styled.div`
  position: relative;
  margin-bottom: 16px;

  svg.lead {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.color.textSoft};
    pointer-events: none;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 0 42px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: 0.95rem;

  &::placeholder {
    color: ${({ theme }) => theme.color.textSoft};
  }
  &:focus {
    border-color: ${({ theme }) => theme.color.primary};
  }
  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

const Clear = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.color.textSoft};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
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
