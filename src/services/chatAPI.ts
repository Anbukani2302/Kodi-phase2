// E:\kodi website\src\services\chatAPI.ts

import api from './api';

export interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_mobile: string;
  created_at: string;
  is_deleted?: boolean;
}

export interface ChatRoom {
  id: number;
  room_type: 'direct' | 'group';
  name: string | null;
  members: Array<{
    id: number;
    mobile_number: string;
  }>;
  last_message: {
    content: string;
    sender_mobile: string;
    created_at: string;
  } | null;
  unread_count: number;
  created_at: string;
}

export interface BlockStatus {
  user_id: number;
  mobile_number: string;
  i_blocked_them: boolean;
  they_blocked_me: boolean;
  chat_allowed: boolean;
}

export const chatAPI = {
  // Get all chat rooms for current user
  getRooms: async (): Promise<ChatRoom[]> => {
    const response = await api.get('/api/chat/rooms/');
    return response.data;
  },

  // Get messages for a specific room
  getMessages: async (roomId: number, page: number = 1): Promise<Message[]> => {
    const response = await api.get(`/api/chat/rooms/${roomId}/messages/`, {
      params: { page }
    });
    return response.data.results || response.data;
  },

  // Send message to a room
  sendMessage: async (roomId: number, content: string): Promise<Message> => {
    const response = await api.post(`/api/chat/rooms/${roomId}/messages/`, {
      content
    });
    return response.data;
  },

  // Create or get direct message room
  createDirectRoom: async (targetUserId: number): Promise<ChatRoom> => {
    const response = await api.post('/api/chat/rooms/direct/', {
      target_user_id: targetUserId
    });
    return response.data;
  },

  // Create group room
  createGroupRoom: async (name: string, memberIds: number[]): Promise<ChatRoom> => {
    const response = await api.post('/api/chat/rooms/group/', {
      name,
      member_ids: memberIds
    });
    return response.data;
  },

  // Mark all messages in room as read
  markAsRead: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/read/`);
  },

  // Block a user
  blockUser: async (userId: number): Promise<any> => {
    const response = await api.post('/api/accounts/block/', {
      user_id: userId
    });
    return response.data;
  },

  // Unblock a user
  unblockUser: async (userId: number): Promise<any> => {
    const response = await api.post('/api/accounts/unblock/', {
      user_id: userId
    });
    return response.data;
  },

  // Get list of blocked users
  getBlockedUsers: async (): Promise<any[]> => {
    const response = await api.get('/api/accounts/blocked/');
    return response.data;
  },

  // Check block status with a specific user
  checkBlockStatus: async (userId: number): Promise<BlockStatus> => {
    const response = await api.get(`/api/accounts/block-status/${userId}/`);
    return response.data;
  }
};
