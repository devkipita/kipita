"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import {
  CheckCircle,
  Clock,
  Info,
  MagnifyingGlass,
  ShieldCheck,
  Warning,
  X,
  XCircle,
  ArrowUUpLeft,
  Check,
} from "@/components/icons";

export type Tone = "warning" | "primary" | "info" | "success" | "error" | "neutral";

export function toneColors(theme: DefaultTheme, tone: Tone) {
  const c = theme.color;
  switch (tone) {
    case "warning":
      return { fg: c.warning, bg: c.warningContainer };
    case "primary":
      return { fg: c.onPrimaryContainer, bg: c.primaryContainer };
    case "info":
      return { fg: c.info, bg: c.infoContainer };
    case "success":
      return { fg: c.success, bg: c.successContainer };
    case "error":
      return { fg: c.error, bg: c.errorContainer };
    default:
      return { fg: c.textSoft, bg: c.surfaceVariant };
  }
}

const ORANGE = "#EA7747";
const ORANGE_TEXT = "#14301F";

export const PageHead = styled.div`
  min-height: 60px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 27px;
    line-height: 1.2;
    letter-spacing: -0.025em;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 13px;
  }
`;

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <PageHead>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </PageHead>
  );
}

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "tonal" | "green";

const buttonStyles = css<{ $variant?: ButtonVariant }>`
  min-height: 40px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;

  ${({ theme, $variant = "primary" }) => {
    const c = theme.color;
    const dark = theme.mode === "dark";
    switch ($variant) {
      case "secondary":
        return css`color: ${c.textSoft}; border-color: ${c.line}; background: ${c.surface};`;
      case "outline":
        return css`color: ${c.primary}; border-color: ${c.primary}; background: transparent;`;
      case "danger":
        return css`color: ${c.error}; border-color: ${c.error}; background: transparent;`;
      case "tonal":
        return css`color: ${c.onPrimaryContainer}; background: ${c.primaryContainer};`;
      case "green":
        return dark
          ? css`color: ${theme.tone.lime.on}; background: ${theme.tone.lime.bg};`
          : css`color: ${c.onPrimary}; background: ${c.primary};`;
      default:
        return dark
          ? css`min-height: 44px; color: ${theme.tone.lime.on}; background: ${theme.tone.lime.bg};`
          : css`min-height: 44px; color: ${ORANGE_TEXT}; background: ${ORANGE};`;
    }
  }}

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

export const Button = styled.button.attrs<{ type?: string }>((p) => ({ type: p.type ?? "button" }))<{ $variant?: ButtonVariant }>`
  ${buttonStyles}
`;

export const ButtonLink = styled(Link)<{ $variant?: ButtonVariant }>`
  ${buttonStyles}
`;

export const TextLink = styled(Link)`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.color.primary};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
`;

export const Card = styled.section<{ $flush?: boolean }>`
  min-width: 0;
  padding: ${({ $flush }) => ($flush ? "0" : "20px")};
  overflow: ${({ $flush }) => ($flush ? "hidden" : "visible")};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surface};
`;

const CardHeadWrap = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
`;

export function CardHead({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <CardHeadWrap>
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {aside}
    </CardHeadWrap>
  );
}

export const Pill = styled.span<{ $tone?: Tone }>`
  width: max-content;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $tone = "primary" }) => toneColors(theme, $tone).fg};
  background: ${({ theme, $tone = "primary" }) => toneColors(theme, $tone).bg};
`;

export function SamplePill() {
  return (
    <Pill $tone="warning" title="No backend yet. These numbers are placeholders.">
      Sample data
    </Pill>
  );
}

const ChipWrap = styled.span<{ $tone: Tone }>`
  width: max-content;
  min-height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $tone }) => toneColors(theme, $tone).fg};
  background: ${({ theme, $tone }) => toneColors(theme, $tone).bg};
`;

const STATUS: Record<string, [string, Tone, (p: { size: number }) => ReactNode]> = {
  posted: ["Published", "primary", Check],
  active: ["Confirmed", "primary", Check],
  awaiting_approval: ["Awaiting approval", "warning", Warning],
  in_progress: ["In progress", "info", Clock],
  completed: ["Completed", "success", CheckCircle],
  cancelled: ["Cancelled", "error", XCircle],
  requested: ["Requested", "warning", Warning],
  pending_payment: ["Awaiting payment", "warning", Clock],
  confirmed: ["Confirmed", "primary", Check],
  rejected: ["Rejected", "error", XCircle],
  held: ["Held", "warning", ShieldCheck],
  released: ["Released", "success", Check],
  refunded: ["Refunded", "info", ArrowUUpLeft],
  refund_pending: ["Refund pending", "warning", ArrowUUpLeft],
  failed: ["Failed", "error", XCircle],
  pending: ["Pending", "warning", Warning],
  approved: ["Approved", "success", CheckCircle],
  open: ["Open", "warning", Warning],
  reviewing: ["Investigating", "info", Clock],
  resolved: ["Resolved", "success", CheckCircle],
  dismissed: ["Dismissed", "neutral", XCircle],
  suspended: ["Suspended", "error", Warning],
  banned: ["Banned", "error", XCircle],
  live: ["Live", "primary", CheckCircle],
  paid: ["Paid", "success", Check],
  wallet: ["To wallet", "success", Check],
};

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const [text, tone, Icon] = STATUS[status] ?? [status.replace(/_/g, " "), "info" as Tone, Info];
  return (
    <ChipWrap $tone={tone}>
      <Icon size={14} />
      {label ?? text}
    </ChipWrap>
  );
}

export const Tabs = styled.div`
  min-height: 40px;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  overflow-x: auto;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const tabStyles = css<{ $on?: boolean }>`
  height: 40px;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-bottom: 2px solid ${({ theme, $on }) => ($on ? theme.color.primary : "transparent")};
  color: ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.muted)};
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;

  b {
    padding: 2px 5px;
    border-radius: 8px;
    background: ${({ theme }) => theme.color.surfaceVariant};
    font-size: 9px;
  }
`;

export const TabLink = styled(Link)<{ $on?: boolean }>`
  ${tabStyles}
`;

export const TabButton = styled.button.attrs({ type: "button" })<{ $on?: boolean }>`
  ${tabStyles}
`;

export const Toolbar = styled.div<{ $inline?: boolean }>`
  min-height: 58px;
  padding: ${({ $inline }) => ($inline ? "0 14px" : "0")};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`;

export const FilterChip = styled(Link)<{ $on?: boolean }>`
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.line)};
  border-radius: 999px;
  color: ${({ theme, $on }) => ($on ? theme.color.onPrimaryContainer : theme.color.textSoft)};
  background: ${({ theme, $on }) => ($on ? theme.color.primaryContainer : theme.color.surface)};
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
`;

const SearchWrap = styled.form`
  width: 220px;
  height: 36px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 10px;
  color: ${({ theme }) => theme.color.muted};
  background: ${({ theme }) => theme.color.surface};

  input {
    width: 100%;
    border: 0;
    outline: 0;
    color: ${({ theme }) => theme.color.text};
    background: transparent;
    font: inherit;
    font-size: 12px;
  }
`;

export function SearchBox({ placeholder, defaultValue, hidden }: { placeholder: string; defaultValue?: string; hidden?: Record<string, string> }) {
  return (
    <SearchWrap role="search">
      <MagnifyingGlass size={17} />
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input name="q" placeholder={placeholder} defaultValue={defaultValue} aria-label={placeholder} />
    </SearchWrap>
  );
}

export const TableScroll = styled.div`
  max-height: 560px;
  overflow: auto;
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  thead {
    position: sticky;
    z-index: 2;
    top: 0;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
  }
  th {
    height: 40px;
    padding: 0 12px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
  td {
    height: 52px;
    padding: 6px 12px;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 12px;
    vertical-align: middle;
  }
  td > strong,
  td > .primary {
    display: block;
    color: ${({ theme }) => theme.color.text};
  }
  td > small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
  tbody tr[data-clickable] {
    cursor: pointer;
  }
  tbody tr:hover {
    background: ${({ theme }) => theme.color.surfaceContainer};
  }
  tbody tr:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
  code {
    font-size: 11px;
  }
`;

export const Money = styled.strong`
  font-family: ${({ theme }) => theme.fontHeading};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`;

export const PersonCell = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;

  > span {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  strong {
    color: ${({ theme }) => theme.color.text};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const EmptyWrap = styled.div<{ $error?: boolean }>`
  min-height: 320px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  > span {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    color: ${({ theme, $error }) => ($error ? theme.color.error : theme.color.primary)};
    background: ${({ theme, $error }) => ($error ? theme.color.errorContainer : theme.color.primaryContainer)};
  }
  h3 {
    margin: 13px 0 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 15px;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    max-width: 44ch;
    margin: 5px 0 15px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
`;

export function EmptyState({ title, body, action, error }: { title: string; body: string; action?: ReactNode; error?: boolean }) {
  return (
    <EmptyWrap $error={error}>
      <span>{error ? <XCircle size={28} /> : <MagnifyingGlass size={28} />}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </EmptyWrap>
  );
}

const pulse = keyframes`50% { opacity: .4; }`;

const SkeletonWrap = styled.div`
  padding: 8px 14px;

  > span {
    height: 50px;
    display: grid;
    grid-template-columns: 0.7fr 1.5fr 1fr 1.2fr 1fr;
    align-items: center;
    gap: 18px;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  i {
    height: 9px;
    border-radius: 6px;
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    animation: ${pulse} 1.4s infinite ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    i {
      animation: none;
    }
  }
`;

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonWrap aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ))}
    </SkeletonWrap>
  );
}

export const Banner = styled.div<{ $tone?: "warning" | "error" | "info" }>`
  min-height: 48px;
  margin-bottom: 16px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  font-size: 12px;
  color: ${({ theme, $tone = "warning" }) => toneColors(theme, $tone).fg};
  background: ${({ theme, $tone = "warning" }) => toneColors(theme, $tone).bg};

  > span {
    flex: 1;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: inherit;
    font-weight: 700;
    text-decoration: none;
  }
`;

export const Pager = styled.div`
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.color.muted};
  font-size: 11px;

  > div {
    display: flex;
    gap: 4px;
  }
  a,
  span[aria-disabled] {
    min-width: 30px;
    height: 30px;
    padding: 0 10px;
    display: inline-grid;
    place-items: center;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 8px;
    color: ${({ theme }) => theme.color.textSoft};
    background: ${({ theme }) => theme.color.surface};
    text-decoration: none;
  }
  span[aria-disabled] {
    opacity: 0.45;
  }
  a[aria-current] {
    color: ${({ theme }) => theme.color.onPrimary};
    background: ${({ theme }) => theme.color.primary};
  }
`;

export function Pagination({ page, size, total, noun, href }: { page: number; size: number; total: number; noun: string; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const first = total === 0 ? 0 : (page - 1) * size + 1;
  const last = Math.min(total, page * size);
  const around = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages);
  return (
    <Pager>
      <span>
        Showing {first}–{last} of {total.toLocaleString("en-KE")} {noun}
      </span>
      <div>
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
        {around.map((p) => (
          <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined}>
            {p}
          </Link>
        ))}
        {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span aria-disabled="true">Next</span>}
      </div>
    </Pager>
  );
}

const Scrim = styled.button`
  position: fixed;
  z-index: 40;
  inset: 0;
  border: 0;
  background: rgba(10, 20, 15, 0.42);
`;

const DrawerPanel = styled.aside`
  position: fixed;
  z-index: 41;
  top: 0;
  right: 0;
  width: min(480px, 100vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: -20px 0 60px rgba(17, 43, 34, 0.16);

  > header {
    min-height: 76px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  h2 {
    margin: 4px 0 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    color: ${({ theme }) => theme.color.text};
  }
  > div {
    flex: 1;
    overflow: auto;
    padding: 16px 20px;
  }
  > footer {
    min-height: 72px;
    padding: 12px 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export const Eyebrow = styled.span`
  color: ${({ theme }) => theme.color.primary};
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const IconButton = styled.button.attrs({ type: "button" })`
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: ${({ theme }) => theme.color.textSoft};
  background: transparent;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceVariant};
  }
`;

function useEscape(close: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
}

export function Drawer({ eyebrow, title, close, children, footer }: { eyebrow: string; title: string; close: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(close);
  return (
    <>
      <Scrim aria-label="Close panel" onClick={close} />
      <DrawerPanel role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2>{title}</h2>
          </div>
          <IconButton onClick={close} aria-label="Close">
            <X size={20} />
          </IconButton>
        </header>
        <div>{children}</div>
        {footer && <footer>{footer}</footer>}
      </DrawerPanel>
    </>
  );
}

const ModalLayer = styled.div`
  position: fixed;
  z-index: 60;
  inset: 0;
  padding: 16px;
  display: grid;
  place-items: center;
`;

const ModalPanel = styled.section`
  position: relative;
  z-index: 61;
  width: min(560px, 100%);
  max-height: calc(100dvh - 32px);
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 18px;
  background: ${({ theme }) => theme.color.surface};
  box-shadow: 0 12px 36px rgba(17, 43, 34, 0.1);

  > header {
    height: 64px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    color: ${({ theme }) => theme.color.text};
  }
  > div {
    padding: 20px;
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 13px;
    line-height: 1.6;
  }
  > footer {
    min-height: 68px;
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export function Modal({ title, close, children, footer }: { title: string; close: () => void; children: ReactNode; footer: ReactNode }) {
  useEscape(close);
  return (
    <ModalLayer>
      <Scrim aria-label="Close dialog" onClick={close} style={{ position: "absolute" }} />
      <ModalPanel role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <IconButton onClick={close} aria-label="Close">
            <X size={20} />
          </IconButton>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </ModalPanel>
    </ModalLayer>
  );
}

export const ConsequenceList = styled.dl`
  margin: 14px 0 0;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 10px;

  div {
    min-height: 42px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  div:last-child {
    border: 0;
  }
  dt {
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
  dd {
    margin: 0;
    color: ${({ theme }) => theme.color.text};
    font-size: 12px;
    font-weight: 700;
  }
`;

const ToastBox = styled.div<{ $error?: boolean }>`
  position: fixed;
  z-index: 80;
  right: 24px;
  bottom: 24px;
  min-width: 300px;
  max-width: calc(100vw - 48px);
  min-height: 66px;
  padding: 11px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 13px;
  background: ${({ theme }) => theme.color.surface};
  box-shadow: 0 12px 36px rgba(17, 43, 34, 0.14);

  > span {
    width: 36px;
    height: 36px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: ${({ theme, $error }) => ($error ? theme.color.onError : theme.color.onSuccess)};
    background: ${({ theme, $error }) => ($error ? theme.color.error : theme.color.success)};
  }
  > div {
    display: flex;
    flex-direction: column;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

export function useToast() {
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((message: string, error = false) => {
    window.clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = toast ? (
    <ToastBox $error={toast.error} role="status" aria-live="polite">
      <span>{toast.error ? <X size={20} /> : <Check size={20} />}</span>
      <div>
        <strong>{toast.error ? "Action failed" : "Action completed"}</strong>
        <small>{toast.message}</small>
      </div>
    </ToastBox>
  ) : null;
  return { show, node };
}

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 11px;

  input,
  select,
  textarea {
    min-height: 38px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 9px;
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.background};
    font: inherit;
    font-size: 12px;
  }
  textarea {
    min-height: 90px;
    padding: 9px 10px;
    resize: vertical;
  }
`;

export const Note = styled.p<{ $tone?: Tone }>`
  margin: 10px 0 0;
  padding: 9px 10px;
  display: flex;
  gap: 7px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme, $tone = "info" }) => toneColors(theme, $tone).fg};
  background: ${({ theme, $tone = "info" }) => toneColors(theme, $tone).bg};

  svg {
    flex: none;
  }
`;
