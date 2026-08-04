import type { Message, Conversation } from '@/types';

// ── State ──
export interface MessagesState {
  conversations: Record<string, Conversation>;
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  unreadCounts: Record<string, number>;
}

export const initialMessagesState: MessagesState = {
  conversations: {},
  messagesByConversation: {},
  activeConversationId: null,
  unreadCounts: {},
};

// ── Actions ──
export type MessagesAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'OPTIMISTIC_SEND'; payload: Message }
  | { type: 'CONFIRM_SEND'; payload: { tempId: string; message: Message } }
  | { type: 'SET_ACTIVE'; payload: string | null }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'RESET' };

// ── Reducer ──
export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case 'SET_CONVERSATIONS': {
      const conversations: Record<string, Conversation> = {};
      const unreadCounts: Record<string, number> = {};
      for (const c of action.payload) {
        conversations[c.id] = c;
        unreadCounts[c.id] = c.unread_count ?? 0;
      }
      return { ...state, conversations, unreadCounts };
    }

    case 'SET_MESSAGES':
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.payload.conversationId]: action.payload.messages,
        },
      };

    case 'ADD_MESSAGE': {
      const msg = action.payload;
      const existing = state.messagesByConversation[msg.conversation_id] ?? [];
      // Prevent duplicates
      if (existing.some(m => m.id === msg.id)) return state;
      const updated = [...existing, msg];
      const conv = state.conversations[msg.conversation_id];
      const isActive = state.activeConversationId === msg.conversation_id;
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [msg.conversation_id]: updated,
        },
        conversations: conv
          ? {
              ...state.conversations,
              [msg.conversation_id]: {
                ...conv,
                last_message: msg.content,
                last_message_at: msg.created_at,
              },
            }
          : state.conversations,
        unreadCounts: isActive
          ? state.unreadCounts
          : {
              ...state.unreadCounts,
              [msg.conversation_id]: (state.unreadCounts[msg.conversation_id] ?? 0) + 1,
            },
      };
    }

    case 'OPTIMISTIC_SEND': {
      const msg = action.payload;
      const existing = state.messagesByConversation[msg.conversation_id] ?? [];
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [msg.conversation_id]: [...existing, msg],
        },
      };
    }

    case 'CONFIRM_SEND': {
      const { tempId, message } = action.payload;
      const existing = state.messagesByConversation[message.conversation_id] ?? [];
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversation_id]: existing.map(m => (m.id === tempId ? message : m)),
        },
      };
    }

    case 'SET_ACTIVE':
      return {
        ...state,
        activeConversationId: action.payload,
        unreadCounts: action.payload
          ? { ...state.unreadCounts, [action.payload]: 0 }
          : state.unreadCounts,
      };

    case 'MARK_READ':
      return {
        ...state,
        unreadCounts: { ...state.unreadCounts, [action.payload]: 0 },
      };

    case 'UPDATE_CONVERSATION': {
      const c = action.payload;
      return {
        ...state,
        conversations: { ...state.conversations, [c.id]: c },
      };
    }

    case 'RESET':
      return initialMessagesState;

    default:
      return state;
  }
}
