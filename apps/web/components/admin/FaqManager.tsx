"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createFaq,
  deleteFaq,
  fetchAllFaqs,
  updateFaq,
  type Faq,
} from "@/lib/faqs";
import {
  ButtonEl,
  Card,
  Field,
  Input,
  Notice,
  SmallButton,
} from "@/components/ui/primitives";

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

  textarea {
    padding: 14px 16px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1.5px solid ${({ theme }) => theme.color.line};
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.surface};
    resize: vertical;
    min-height: 96px;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
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

const Row = styled.div<{ $muted: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  opacity: ${({ $muted }) => ($muted ? 0.6 : 1)};

  & + & {
    margin-top: 12px;
  }

  .body {
    flex: 1;
    min-width: 0;
  }
  h4 {
    margin: 0 0 6px;
    font-size: 1.05rem;
  }
  p {
    margin: 0;
    color: ${({ theme }) => theme.color.textSoft};
    line-height: 1.5;
  }
  .tag {
    display: inline-block;
    margin-top: 10px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.warnBg};
    color: ${({ theme }) => theme.color.warnText};
  }
  .actions {
    display: flex;
    gap: 8px;
    flex: none;
  }
`;

const emptyDraft = { question: "", answer: "", is_published: true };

export function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // faq id, or "new"
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAllFaqs()
      .then((rows) => {
        setFaqs(rows);
        setError(null);
      })
      .catch((e) =>
        setError(
          e?.message ??
            "Couldn't load FAQs. Has the faqs migration been applied?",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startNew = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };
  const startEdit = (f: Faq) => {
    setDraft({
      question: f.question,
      answer: f.answer,
      is_published: f.is_published,
    });
    setEditing(f.id);
  };
  const cancel = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const save = async () => {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setBusy(true);
    try {
      if (editing === "new") {
        await createFaq({
          question: draft.question.trim(),
          answer: draft.answer.trim(),
          is_published: draft.is_published,
          sort_order: faqs.length,
        });
      } else if (editing) {
        await updateFaq(editing, {
          question: draft.question.trim(),
          answer: draft.answer.trim(),
          is_published: draft.is_published,
        });
      }
      cancel();
      load();
    } catch (e) {
      setError((e as Error)?.message ?? "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this FAQ? This can't be undone.")) return;
    setBusy(true);
    try {
      await deleteFaq(id);
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
        <strong>{faqs.length} question(s)</strong>
        {editing === null && (
          <ButtonEl type="button" $compact onClick={startNew}>
            <Plus size={18} strokeWidth={2.4} />
            Add FAQ
          </ButtonEl>
        )}
      </Bar>

      {error && <Notice $variant="error">{error}</Notice>}

      {editing !== null && (
        <Form as="div">
          <Field>
            <label>Question</label>
            <Input
              value={draft.question}
              onChange={(e) =>
                setDraft((d) => ({ ...d, question: e.target.value }))
              }
              placeholder="e.g. How does payment work?"
            />
          </Field>
          <Field>
            <label>Answer</label>
            <textarea
              value={draft.answer}
              onChange={(e) =>
                setDraft((d) => ({ ...d, answer: e.target.value }))
              }
              placeholder="Write the answer riders will see…"
            />
          </Field>
          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, is_published: e.target.checked }))
                }
              />
              Published (visible on /help)
            </label>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <ButtonEl
                type="button"
                $variant="ghost"
                $compact
                onClick={cancel}
                disabled={busy}
              >
                <X size={18} strokeWidth={2.4} />
                Cancel
              </ButtonEl>
              <ButtonEl
                type="button"
                $compact
                onClick={save}
                disabled={busy || !draft.question.trim() || !draft.answer.trim()}
              >
                <Check size={18} strokeWidth={2.4} />
                {editing === "new" ? "Create" : "Save"}
              </ButtonEl>
            </div>
          </div>
        </Form>
      )}

      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : (
        faqs.map((f) => (
          <Row key={f.id} $muted={!f.is_published}>
            <div className="body">
              <h4>{f.question}</h4>
              <p>{f.answer}</p>
              {!f.is_published && <span className="tag">Draft</span>}
            </div>
            <div className="actions">
              <SmallButton type="button" onClick={() => startEdit(f)}>
                <Pencil size={15} strokeWidth={2.4} />
                Edit
              </SmallButton>
              <SmallButton
                type="button"
                $variant="reject"
                onClick={() => remove(f.id)}
              >
                <Trash2 size={15} strokeWidth={2.4} />
                Delete
              </SmallButton>
            </div>
          </Row>
        ))
      )}
    </>
  );
}
