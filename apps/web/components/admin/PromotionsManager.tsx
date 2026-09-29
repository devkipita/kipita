"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Check, Pencil, Plus, Trash as Trash2, X } from "@/components/icons";
import {
  createPromotion,
  deletePromotion,
  fetchAllPromotions,
  formatPromotionValue,
  promotionStatus,
  updatePromotion,
  type Promotion,
  type PromotionKind,
  type PromotionValueType,
} from "@/lib/promotions";
import type { ToneName } from "@/lib/theme";
import {
  ButtonEl,
  Card,
  Field,
  Input,
  Notice,
  SmallButton,
} from "@/components/ui/primitives";

/** Must stay in step with the `promotions_tone` CHECK in migration 018. */
const TONES: ToneName[] = [
  "green",
  "mint",
  "tan",
  "blue",
  "amber",
  "lav",
  "deep",
  "dark",
  "surface",
  "forest",
  "peach",
  "lilac",
  "lime",
];

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
`;

const Form = styled(Card)`
  margin-bottom: 24px;
  display: grid;
  gap: 4px;

  textarea,
  select {
    padding: 14px 16px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1.5px solid ${({ theme }) => theme.color.line};
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.surface};

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
    }
  }
  textarea {
    resize: vertical;
    min-height: 84px;
  }

  .cols {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 680px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  label.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Row = styled.div<{ $muted: boolean; $tone: ToneName }>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.line};
  opacity: ${({ $muted }) => ($muted ? 0.6 : 1)};

  & + & {
    margin-top: 12px;
  }

  .swatch {
    width: 42px;
    height: 42px;
    flex: none;
    border-radius: 12px;
    background: ${({ theme, $tone }) => theme.tone[$tone]?.bg ?? theme.tone.green.bg};
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  h4 {
    margin: 0 0 4px;
    font-size: 1.05rem;
  }
  .value {
    font-weight: 800;
    color: ${({ theme }) => theme.color.primary};
  }
  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.color.textSoft};
    line-height: 1.5;
  }
  .tags {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .tag {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.warnBg};
    color: ${({ theme }) => theme.color.warnText};
  }
  .code {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.muted};
  }
  .actions {
    display: flex;
    gap: 8px;
    flex: none;
  }
`;

type Draft = {
  title: string;
  blurb: string;
  kind: PromotionKind;
  value_type: PromotionValueType;
  value_amount: string;
  code: string;
  tone: ToneName;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const emptyDraft: Draft = {
  title: "",
  blurb: "",
  kind: "discount",
  value_type: "percent",
  value_amount: "",
  code: "",
  tone: "green",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

/**
 * `datetime-local` gives naive local time; the column is TIMESTAMPTZ. Convert
 * explicitly, or an offer scheduled for 9am EAT quietly goes live at 6am.
 */
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // id, or "new"
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAllPromotions()
      .then((rows) => {
        setPromotions(rows);
        setError(null);
      })
      .catch((e) =>
        setError(
          e?.message ??
            "Couldn't load offers. Has the promotions migration been applied?",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startNew = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };

  const startEdit = (p: Promotion) => {
    setDraft({
      title: p.title,
      blurb: p.blurb,
      kind: p.kind,
      value_type: p.value_type,
      value_amount: String(p.value_amount),
      code: p.code ?? "",
      tone: p.tone,
      is_active: p.is_active,
      starts_at: toLocalInput(p.starts_at),
      ends_at: toLocalInput(p.ends_at),
    });
    setEditing(p.id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const amount = Number(draft.value_amount);
  const canSave =
    draft.title.trim().length > 0 &&
    draft.blurb.trim().length > 0 &&
    amount > 0 &&
    (draft.value_type !== "percent" || amount <= 100);

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {
        title: draft.title.trim(),
        blurb: draft.blurb.trim(),
        kind: draft.kind,
        value_type: draft.value_type,
        value_amount: amount,
        code: draft.code.trim().toUpperCase() || null,
        tone: draft.tone,
        is_active: draft.is_active,
        starts_at: toIso(draft.starts_at),
        ends_at: toIso(draft.ends_at),
      };

      if (editing === "new") {
        await createPromotion({ ...payload, sort_order: promotions.length });
      } else if (editing) {
        await updatePromotion(editing, payload);
      }
      cancel();
      load();
    } catch (e) {
      const message = (e as Error)?.message ?? "Save failed.";
      setError(
        message.includes("uq_promotions_title")
          ? "An offer with that title already exists."
          : message.includes("uq_promotions_code")
            ? "That code is already in use."
            : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this offer? This can't be undone.")) return;
    setBusy(true);
    try {
      await deletePromotion(id);
      load();
    } catch (e) {
      setError((e as Error)?.message ?? "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Bar>
        <strong>{promotions.length} offer(s)</strong>
        {editing === null && (
          <ButtonEl type="button" $compact onClick={startNew}>
            <Plus size={18} />
            Add offer
          </ButtonEl>
        )}
      </Bar>

      {error && <Notice $variant="error">{error}</Notice>}

      {editing !== null && (
        <Form as="div">
          <Field>
            <label>Title</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. First ride, 20% off"
            />
          </Field>
          <Field>
            <label>Blurb</label>
            <textarea
              value={draft.blurb}
              onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
              placeholder="One line riders will see on the card…"
            />
          </Field>

          <div className="cols">
            <Field>
              <label>Kind</label>
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, kind: e.target.value as PromotionKind }))
                }
              >
                <option value="discount">Discount</option>
                <option value="gift_card">Gift card</option>
              </select>
            </Field>
            <Field>
              <label>Value type</label>
              <select
                value={draft.value_type}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    value_type: e.target.value as PromotionValueType,
                  }))
                }
              >
                <option value="percent">Percent off</option>
                <option value="amount">Fixed KES amount</option>
              </select>
            </Field>
          </div>

          <div className="cols">
            <Field>
              <label>
                {draft.value_type === "percent" ? "Percent (1-100)" : "Amount (KES)"}
              </label>
              <Input
                type="number"
                min={1}
                max={draft.value_type === "percent" ? 100 : undefined}
                value={draft.value_amount}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, value_amount: e.target.value }))
                }
              />
            </Field>
            <Field>
              <label>Code (optional)</label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder="FIRSTRIDE"
              />
            </Field>
          </div>

          <div className="cols">
            <Field>
              <label>Starts (optional)</label>
              <Input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, starts_at: e.target.value }))
                }
              />
            </Field>
            <Field>
              <label>Ends (optional)</label>
              <Input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <label>Card colour</label>
            <select
              value={draft.tone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tone: e.target.value as ToneName }))
              }
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </Field>

          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, is_active: e.target.checked }))
                }
              />
              Active (shown on /home inside its date window)
            </label>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <ButtonEl
                type="button"
                $variant="ghost"
                $compact
                onClick={cancel}
                disabled={busy}
              >
                <X size={18} />
                Cancel
              </ButtonEl>
              <ButtonEl type="button" $compact onClick={save} disabled={busy || !canSave}>
                <Check size={18} />
                {editing === "new" ? "Create" : "Save"}
              </ButtonEl>
            </div>
          </div>
        </Form>
      )}

      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : (
        promotions.map((p) => {
          const status = promotionStatus(p);
          return (
            <Row key={p.id} $muted={status !== "live"} $tone={p.tone}>
              <span className="swatch" />
              <div className="body">
                <h4>
                  {p.title} <span className="value">· {formatPromotionValue(p)}</span>
                </h4>
                <p>{p.blurb}</p>
                <div className="tags">
                  {status !== "live" && (
                    <span className="tag">
                      {status === "draft"
                        ? "Draft"
                        : status === "scheduled"
                          ? "Scheduled"
                          : "Expired"}
                    </span>
                  )}
                  {p.code && <span className="tag code">{p.code}</span>}
                </div>
              </div>
              <div className="actions">
                <SmallButton type="button" onClick={() => startEdit(p)}>
                  <Pencil size={15} />
                  Edit
                </SmallButton>
                <SmallButton type="button" $variant="reject" onClick={() => remove(p.id)}>
                  <Trash2 size={15} />
                  Delete
                </SmallButton>
              </div>
            </Row>
          );
        })
      )}
    </>
  );
}
