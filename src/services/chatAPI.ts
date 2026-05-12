// src/services/chatAPI.ts
import api from './api';      // your pre-configured Axios instance with auth interceptors
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  mobile_number: string;
}

export interface Conversation {
  id: number;
  room_type: 'direct' | 'group';
  name: string | null;
  participants: User[];             // from backend MemberSerializer: id + mobile_number
  unread_count: number;
  last_message: {
    content: string;
    sender_mobile: string;
    created_at: string;
  } | null;
  created_at: string;
  other_user_status?: string;       // added for online/offline status
}

export interface Attachment {
  id: number;
  filename: string;
  file_type: string;
  url: string;
}

export interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_mobile: string;
  created_at: string;
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  attachments: Attachment[];
  is_delivered: boolean;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
}

export interface SendMessageData {
  conversation_id: number;
  content: string;
  files?: File[];
}

export interface BlockStatus {
  user_id: number;
  mobile_number: string;
  i_blocked_them: boolean;
  they_blocked_me: boolean;
  chat_allowed: boolean;
}

// ── Transformers ───────────────────────────────────────────────────────────

/** Transform a room object from the backend into a Conversation */
const transformToConversation = (room: any): Conversation => ({
  id: room.id,
  room_type: room.room_type,
  name: room.name,
  participants: room.members || [],          // { id, mobile_number }[]
  unread_count: room.unread_count || 0,
  last_message: room.last_message ?? null,
  created_at: room.created_at,
});

/** Transform a message from REST or WebSocket into a Message */
const transformToMessage = (msg: any): Message => ({
  id: msg.id,
  content: msg.content ?? '',
  sender_id: msg.sender_id ?? (msg.sender?.id ?? 0),
  sender_mobile: msg.sender_mobile ?? (msg.sender?.mobile_number ?? ''),
  created_at: msg.created_at ?? new Date().toISOString(),
  is_deleted: msg.is_deleted ?? false,
  is_edited: msg.is_edited ?? false,
  edited_at: msg.edited_at ?? null,
  attachments: (msg.attachments || []).map((a: any) => ({
    id: a.id,
    filename: a.filename,
    file_type: a.content_type ?? a.file_type,
    url: a.file_url ?? a.url,
  })),
  is_delivered: msg.is_delivered === true,
  is_read: msg.is_read === true,
  read_at: msg.read_at ?? (msg.is_read ? msg.created_at : null),
  delivered_at: msg.delivered_at ?? (msg.is_delivered ? msg.created_at : null),
});

// ── Service ─────────────────────────────────────────────────────────────────

export const chatService = {
  /** Fetch all chat rooms, optionally filtered by type */
  getConversations: async (roomType?: string): Promise<Conversation[]> => {
    const url = roomType && roomType !== 'all'
      ? `/api/chat/rooms/?type=${roomType}`
      : '/api/chat/rooms/';
    const response = await api.get(url);
    // backend may or may not paginate – handle both
    const data = response.data.results ?? response.data;
    return Array.isArray(data) ? data.map(transformToConversation) : [];
  },

  /** Fetch messages with pagination */
  getMessages: async (
    conversationId: number,
    limit = 20,
    offset = 0
  ): Promise<{ messages: Message[]; count: number }> => {
    const response = await api.get(
      `/api/chat/rooms/${conversationId}/messages/`,
      { params: { limit, offset } }
    );
    // paginated response has { count, results }
    const results = response.data.results ?? response.data;
    return {
      messages: Array.isArray(results) ? results.map(transformToMessage) : [],
      count: response.data.count ?? results.length,
    };
  },

  /** Send a message – WebSocket is primary, but REST is used for file uploads */
  sendMessage: async (data: SendMessageData): Promise<Message> => {
    const files = data.files ?? [];
    let response;

    if (files.length > 0) {
      const formData = new FormData();
      formData.append('content', data.content ?? '');
      files.forEach(file => formData.append('attachments', file));
      response = await api.post(
        `/api/chat/rooms/${data.conversation_id}/messages/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000,     // longer timeout for uploads
        }
      );
    } else {
      response = await api.post(
        `/api/chat/rooms/${data.conversation_id}/messages/`,
        { content: data.content }
      );
    }

    return transformToMessage(response.data);
  },

  /** Download an attachment */
  downloadAttachment: async (attachmentId: number, fileName: string): Promise<void> => {
    const response = await api.get(
      `/api/chat/attachments/${attachmentId}/download/`,
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Mark all messages in a room as read */
  markAllAsRead: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/read/`);
  },

  /** Edit a message */
  editMessage: async (messageId: number, content: string): Promise<Message> => {
    const response = await api.put(`/api/chat/messages/${messageId}/`, { content });
    // backend returns { detail, message }
    return transformToMessage(response.data.message ?? response.data);
  },

  /** Soft-delete a message */
  deleteMessage: async (messageId: number): Promise<void> => {
    await api.delete(`/api/chat/messages/${messageId}/delete/`);
  },

  /** Create or get a direct chat room */
  createDirectConversation: async (targetUserId: number): Promise<Conversation> => {
    const response = await api.post('/api/chat/rooms/direct/', {
      target_user_id: targetUserId,
    });
    return transformToConversation(response.data);
  },

  /** Create a group chat room */
  createGroupConversation: async (
    name: string,
    memberIds: number[]
  ): Promise<Conversation> => {
    const response = await api.post('/api/chat/rooms/group/', {
      name,
      member_ids: memberIds,
    });
    return transformToConversation(response.data);
  },

  /** Fetch members of a group */
  getGroupMembers: async (roomId: number): Promise<any[]> => {
    const response = await api.get(`/api/chat/rooms/${roomId}/members/`);
    return response.data.results ?? response.data;
  },

  /** Add member(s) to a group */
  addMemberToGroup: async (roomId: number, userIds: number[]): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/members/add`, {
      member_ids: userIds,
    });
  },

  /** Remove member(s) from a group (admin only) */
  removeMemberFromGroup: async (roomId: number, userIds: number[]): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/remove-members/`, {
      member_ids: userIds,
    });
  },

  /** Leave a group */
  exitGroup: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/exit/`);
  },

  /** Clear chat history (sets cleared_at) */
  clearChat: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/delete/`);
  },

  /** Block a user */
  blockUser: async (userId: number): Promise<void> => {
    await api.post('/api/chat/block/', { user_id: userId });
  },

  /** Unblock a user */
  unblockUser: async (userId: number): Promise<void> => {
    await api.post('/api/chat/unblock/', { user_id: userId });
  },

  /** List blocked users */
  getBlockedUsers: async (): Promise<any[]> => {
    const response = await api.get('/api/chat/blocked/');
    return response.data;   // array of { id, blocked_id, blocked_mobile, created_at }
  },

  /** Check block status with another user */
  checkBlockStatus: async (userId: number): Promise<BlockStatus> => {
    const response = await api.get(`/api/chat/block-status/${userId}/`);
    return response.data;
  },

  /** Save / update a contact nickname */
  updateContactNickname: async (contactId: number, nickname: string): Promise<void> => {
    await api.post('/api/chat/contacts/', {
      contact_id: contactId,
      nickname,
    });
  },

  /** Get all saved nicknames */
  getNicknames: async (): Promise<{ contact_id: number; nickname: string }[]> => {
    const response = await api.get('/api/chat/contacts/');
    return response.data;   // array of { contact_id, nickname }
  },
};