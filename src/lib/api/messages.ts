import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types';

const CONVERSATION_SELECT = `
  *,
  participants:conversation_participants(
    user:users(id, full_name, avatar_url)
  )
`;

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function fetchMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(message: {
  conversation_id: string;
  sender_id: string;
  content: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function getOrCreateConversation(params: {
  participantIds: string[];
  tripId?: string;
  requestId?: string;
}): Promise<Conversation> {
  // Try to find existing
  const { data: existing } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .contains('participant_ids', params.participantIds)
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_ids: params.participantIds,
      trip_id: params.tripId ?? null,
      request_id: params.requestId ?? null,
    })
    .select(CONVERSATION_SELECT)
    .single();
  if (error) throw error;
  return data as Conversation;
}
