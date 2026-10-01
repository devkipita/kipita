"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  closeSupportCaseAction,
  currentSupportUserId,
  openSupportCaseAction,
  sendSupportMessageAction,
} from "@/lib/support/actions";
import {
  fetchMessages,
  signOne,
  subscribeToCase,
  subscribeToSupport,
} from "@/lib/support/api";
import { uploadSupportImage } from "@/lib/support/upload";
import { isOpen, type SupportCase, type SupportMessage } from "@/lib/support/types";

/**
 * All support state in one place: which cases are open, which one the dock is
 * showing, its thread, and the three things a person can do with it. The dock
 * and the panels below it are then pure presentation.
 *
 * Messages are loaded lazily — nothing is fetched until the dock is opened —
 * and kept live over realtime so a staff reply lands without a refresh.
 */

interface SupportValue {
  cases: SupportCase[];
  open: SupportCase[];
  activeId: string | null;
  active: SupportCase | null;
  messages: SupportMessage[];
  loading: boolean;
  sending: boolean;
  error: string;
  unread: number;
  dismissed: boolean;
  dismiss: () => void;
  setActiveId: (id: string | null) => void;
  addCase: (next: SupportCase) => void;
  openCase: (input: {
    subject: string;
    detail: string;
    category?: string;
    bookingId?: string | null;
  }) => Promise<{ ok: boolean; id?: string; error?: string }>;
  send: (body: string, file?: File | null) => Promise<boolean>;
  close: (id: string) => Promise<boolean>;
  markRead: () => void;
}

const DISMISS_KEY = "kipita-support-dismissed";

const Ctx = createContext<SupportValue | null>(null);

export function useSupport(): SupportValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSupport must be used inside SupportProvider");
  return value;
}

export function SupportProvider({
  initial,
  children,
}: {
  initial: SupportCase[];
  children: ReactNode;
}) {
  const [cases, setCases] = useState<SupportCase[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial.find(isOpen)?.id ?? null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const loadedFor = useRef<string | null>(null);
  const caseIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    caseIds.current = new Set(cases.map((c) => c.id));
  }, [cases]);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* empty */
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* empty */
    }
  }, []);

  const restore = useCallback(() => {
    setDismissed(false);
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {
      /* empty */
    }
  }, []);

  const open = useMemo(() => cases.filter(isOpen), [cases]);
  const active = useMemo(
    () => cases.find((c) => c.id === activeId) ?? null,
    [cases, activeId],
  );

  const addCase = useCallback((next: SupportCase) => {
    setCases((prev) => [next, ...prev.filter((c) => c.id !== next.id)]);
    setActiveId(next.id);
    loadedFor.current = null;
  }, []);

  const loadMessages = useCallback(async (caseId: string) => {
    if (loadedFor.current === caseId) return;
    loadedFor.current = caseId;
    setLoading(true);
    try {
      setMessages(await fetchMessages(createClient(), caseId));
    } catch {
      setError("Couldn't load this conversation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  // Live staff replies for whichever case is on screen.
  useEffect(() => {
    if (!activeId) return;
    const supabase = createClient();

    return subscribeToCase(supabase, activeId, (incoming) => {
      void (async () => {
        const signed = incoming.image_path
          ? await signOne(supabase, incoming)
          : incoming;
        setMessages((prev) =>
          prev.some((m) => m.id === signed.id) ? prev : [...prev, signed],
        );
      })();
    });
  }, [activeId]);

  // Account-wide, so a dismissed dock still hears a reply on any case — and on
  // a case that isn't the active one.
  useEffect(() => {
    if (cases.length === 0) return;
    const supabase = createClient();

    return subscribeToSupport(supabase, (incoming) => {
      if (!incoming.from_support) return;
      if (!caseIds.current.has(incoming.case_id)) return;
      setUnread((n) => n + 1);
      setCases((prev) =>
        prev.map((c) =>
          c.id === incoming.case_id && c.status !== "resolved"
            ? { ...c, status: "awaiting_reply" }
            : c,
        ),
      );
      restore();
    });
  }, [cases.length, restore]);

  const openCase = useCallback<SupportValue["openCase"]>(async (input) => {
    setError("");
    const result = await openSupportCaseAction(input);
    if (!result.ok) {
      setError(result.error);
      return { ok: false, error: result.error };
    }

    addCase({
      id: result.id,
      booking_id: input.bookingId ?? null,
      category: input.category ?? "general",
      subject: input.subject,
      detail: input.detail,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { ok: true, id: result.id };
  }, [addCase]);

  const send = useCallback<SupportValue["send"]>(
    async (body, file) => {
      if (!activeId || sending) return false;
      setError("");
      setSending(true);

      try {
        let imagePath: string | null = null;

        if (file) {
          const userId = await currentSupportUserId();
          if (!userId) {
            setError("Sign in to send an attachment.");
            return false;
          }
          const upload = await uploadSupportImage(
            createClient(),
            file,
            userId,
            activeId,
          );
          if (!upload.ok) {
            setError(upload.error);
            return false;
          }
          imagePath = upload.path;
        }

        const result = await sendSupportMessageAction(activeId, body, imagePath);
        if (!result.ok) {
          setError(result.error);
          return false;
        }

        const signed = result.message.image_path
          ? await signOne(createClient(), result.message)
          : result.message;

        setMessages((prev) =>
          prev.some((m) => m.id === signed.id) ? prev : [...prev, signed],
        );
        return true;
      } catch {
        setError("That didn't send. Check your connection and try again.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeId, sending],
  );

  const close = useCallback<SupportValue["close"]>(async (id) => {
    setError("");
    const result = await closeSupportCaseAction(id);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "resolved" } : c)),
    );
    setActiveId((current) => (current === id ? null : current));
    return true;
  }, []);

  const markRead = useCallback(() => setUnread(0), []);

  const value = useMemo<SupportValue>(
    () => ({
      cases,
      open,
      activeId,
      active,
      messages,
      loading,
      sending,
      error,
      unread,
      dismissed,
      dismiss,
      setActiveId,
      addCase,
      openCase,
      send,
      close,
      markRead,
    }),
    [
      cases,
      open,
      activeId,
      active,
      messages,
      loading,
      sending,
      error,
      unread,
      dismissed,
      dismiss,
      addCase,
      openCase,
      send,
      close,
      markRead,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
