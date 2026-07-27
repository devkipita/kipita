import { create } from "zustand";
import { storage } from "@/lib/utils/mmkv";
import { sendMessage } from "@/lib/api/messages";
import { uploadChatMedia } from "@/lib/api/storage";
import type {
  Message,
  MessageAttachmentType,
  MessageAttachmentMeta,
} from "@/types";

const OUTBOX_KEY = "chat_outbox_v1";
const MAX_ATTEMPTS = 8;

export interface OutboxAttachment {
  type: MessageAttachmentType;
  /** Local file:// uri (image/audio) or a remote URL (gif). */
  uri: string;
  /** True once uploaded to storage (or for gifs, which are already remote). */
  remote: boolean;
  meta?: MessageAttachmentMeta;
}

let tempCounter = 0;
const nextTempId = (conversationId: string) =>
  `temp-${conversationId}-${Date.now()}-${tempCounter++}`;

export interface OutboxItem {
  tempId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  attempts: number;
  attachment?: OutboxAttachment;
}

/** Insert a message keeping the list ordered by time and unique by id. */
function upsert(list: Message[], msg: Message): Message[] {
  const filtered = list.filter((m) => m.id !== msg.id);
  filtered.push(msg);
  filtered.sort((a, b) =>
    a.created_at === b.created_at
      ? a.id.localeCompare(b.id)
      : a.created_at.localeCompare(b.created_at),
  );
  return filtered;
}

interface ChatState {
  messagesByConv: Record<string, Message[]>;
  unreadByConv: Record<string, number>;
  activeConversationId: string | null;
  outbox: OutboxItem[];
  flushing: boolean;

  setActive: (conversationId: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  /** Apply a message from realtime or a confirmed send (idempotent). */
  receive: (message: Message) => void;
  /** Optimistically queue an outgoing message and try to flush. */
  send: (params: {
    conversationId: string;
    senderId: string;
    content: string;
    attachment?: OutboxAttachment;
  }) => void;
  markRead: (conversationId: string) => void;
  flushOutbox: () => Promise<void>;
  totalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByConv: {},
  unreadByConv: {},
  activeConversationId: null,
  outbox: storage.getJSON<OutboxItem[]>(OUTBOX_KEY) ?? [],
  flushing: false,

  setActive: (conversationId) =>
    set((s) => ({
      activeConversationId: conversationId,
      unreadByConv: conversationId
        ? { ...s.unreadByConv, [conversationId]: 0 }
        : s.unreadByConv,
    })),

  setMessages: (conversationId, messages) =>
    set((s) => {
      // Merge server truth with any still-pending optimistic bubbles.
      let merged = [...messages];
      const pending = s.outbox.filter((o) => o.conversationId === conversationId);
      for (const o of pending) {
        merged = upsert(merged, {
          id: o.tempId,
          conversation_id: o.conversationId,
          sender_id: o.senderId,
          content: o.content,
          read: false,
          created_at: o.createdAt,
          attachment_type: o.attachment?.type ?? null,
          attachment_url: o.attachment?.uri ?? null,
          attachment_meta: o.attachment?.meta ?? null,
        });
      }
      return {
        messagesByConv: { ...s.messagesByConv, [conversationId]: merged },
      };
    }),

  receive: (message) =>
    set((s) => {
      const convId = message.conversation_id;
      const existing = s.messagesByConv[convId] ?? [];
      if (existing.some((m) => m.id === message.id)) return s;
      const isActive = s.activeConversationId === convId;
      return {
        messagesByConv: { ...s.messagesByConv, [convId]: upsert(existing, message) },
        unreadByConv: isActive
          ? s.unreadByConv
          : {
              ...s.unreadByConv,
              [convId]: (s.unreadByConv[convId] ?? 0) + 1,
            },
      };
    }),

  send: ({ conversationId, senderId, content, attachment }) => {
    const tempId = nextTempId(conversationId);
    const createdAt = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      read: false,
      created_at: createdAt,
      attachment_type: attachment?.type ?? null,
      attachment_url: attachment?.uri ?? null,
      attachment_meta: attachment?.meta ?? null,
    };
    set((s) => {
      const existing = s.messagesByConv[conversationId] ?? [];
      const outbox = [
        ...s.outbox,
        { tempId, conversationId, senderId, content, createdAt, attempts: 0, attachment },
      ];
      storage.setJSON(OUTBOX_KEY, outbox);
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: upsert(existing, optimistic),
        },
        outbox,
      };
    });
    void get().flushOutbox();
  },

  flushOutbox: async () => {
    if (get().flushing) return;
    const queue = get().outbox;
    if (queue.length === 0) return;
    set({ flushing: true });

    for (const item of queue) {
      try {
        let attachment = item.attachment;
        // Upload local media (image/audio) once, then reuse the public URL on
        // any retry. GIFs are already remote so they skip this.
        if (attachment && !attachment.remote) {
          const url = await uploadChatMedia(
            attachment.uri,
            item.senderId,
            attachment.type,
          );
          attachment = { ...attachment, uri: url, remote: true };
          // Persist the uploaded URL back into the outbox so a later failure
          // in sendMessage doesn't force a second upload.
          set((s) => {
            const outbox = s.outbox.map((o) =>
              o.tempId === item.tempId ? { ...o, attachment } : o,
            );
            storage.setJSON(OUTBOX_KEY, outbox);
            return { outbox };
          });
        }

        const real = await sendMessage({
          conversation_id: item.conversationId,
          sender_id: item.senderId,
          content: item.content,
          attachment_type: attachment?.type ?? null,
          attachment_url: attachment?.uri ?? null,
          attachment_meta: attachment?.meta ?? null,
        });
        set((s) => {
          const list = s.messagesByConv[item.conversationId] ?? [];
          // Swap the optimistic bubble for the server row (dedup via upsert).
          const swapped = upsert(
            list.filter((m) => m.id !== item.tempId),
            real,
          );
          const outbox = s.outbox.filter((o) => o.tempId !== item.tempId);
          storage.setJSON(OUTBOX_KEY, outbox);
          return {
            messagesByConv: { ...s.messagesByConv, [item.conversationId]: swapped },
            outbox,
          };
        });
      } catch {
        // Network/refused — bump attempts, stop this pass, retry on reconnect.
        set((s) => {
          const outbox = s.outbox
            .map((o) =>
              o.tempId === item.tempId ? { ...o, attempts: o.attempts + 1 } : o,
            )
            .filter((o) => o.attempts < MAX_ATTEMPTS);
          storage.setJSON(OUTBOX_KEY, outbox);
          return { outbox };
        });
        break;
      }
    }

    set({ flushing: false });
  },

  markRead: (conversationId) =>
    set((s) => ({
      unreadByConv: { ...s.unreadByConv, [conversationId]: 0 },
    })),

  totalUnread: () =>
    Object.values(get().unreadByConv).reduce((sum, n) => sum + n, 0),
}));
