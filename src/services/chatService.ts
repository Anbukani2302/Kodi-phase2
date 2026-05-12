import api from './api';
import axios from 'axios';

export interface User {
  id: number;
  mobile_number: string;
  name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface Conversation {
  id: number;
  room_type: 'direct' | 'group';
  name: string | null;
  participants: User[];
  unread_count: number;
  last_message?: {
    content: string;
    sender_mobile: string;
    created_at: string;
  } | null;
  created_at: string;
  created_by?: number | null;
}

export interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_mobile: string;
  created_at: string;
  is_deleted?: boolean;
  image?: string | null;
  read_at?: string | null;
  delivered_at?: string | null;
  attachment_id?: number | null;
  file_name?: string | null;
  attachments?: {
    id: number;
    file_name: string;
    file_type: string;
    url: string;
  }[];
  // ✅ ADD THESE
  is_delivered: boolean;
  is_read: boolean;
}

export interface SendMessageData {
  conversation_id: number;
  content: string;
  image?: string | null;
  file?: File | null;
  files?: File[] | null;
}

export interface BlockStatus {
  user_id: number;
  mobile_number: string;
  i_blocked_them: boolean;
  they_blocked_me: boolean;
  chat_allowed: boolean;
}

const transformToConversation = (room: any): Conversation => ({
  id: room.id,
  room_type: room.room_type,
  name: room.name,
  participants: room.members || [],
  unread_count: room.unread_count || 0,
  last_message: room.last_message,
  created_at: room.created_at,
  created_by: room.created_by || room.admin_id || room.owner_id || room.creator_id,
});

// ✅ UPDATED transformToMessage – maps is_delivered and is_read
const transformToMessage = (msg: any): Message => {
  const senderId = msg.sender_id || (msg.sender && typeof msg.sender === 'object' ? msg.sender.id : msg.sender);

  return {
    id: msg.id,
    content: msg.content,
    sender_id: senderId,
    sender_mobile: msg.sender_mobile || (msg.sender && typeof msg.sender === 'object' ? msg.sender.mobile_number : null),
    created_at: msg.created_at,
    is_deleted: msg.is_deleted,
    image: msg.image || null,
    read_at: msg.read_at || (msg.is_read ? msg.created_at : null),
    delivered_at: msg.delivered_at || (msg.is_delivered ? msg.created_at : null),
    attachment_id: msg.attachment_id || (msg.attachment && msg.attachment.id) || (msg.attachments && msg.attachments[0]?.id) || null,
    file_name: msg.file_name || (msg.attachment && msg.attachment.file_name) || (msg.attachments && msg.attachments[0]?.file_name) || null,
    attachments: msg.attachments || (msg.attachment ? [msg.attachment] : []),
    // ✅ Map the boolean flags
    is_delivered: msg.is_delivered === true,
    is_read: msg.is_read === true,
  };
};

export const chatService = {
  getConversations: async (roomType?: string): Promise<Conversation[]> => {
    try {
      const url = roomType && roomType !== 'all' ? `/api/chat/rooms/?type=${roomType}` : '/api/chat/rooms/';
      const response = await api.get(url);
      const data = response.data.results || response.data;
      return Array.isArray(data) ? data.map(transformToConversation) : [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  getMessages: async (conversationId: number): Promise<Message[]> => {
    try {
      const response = await api.get(`/api/chat/rooms/${conversationId}/messages/`);
      const messages = response.data.results || response.data;
      return messages.map(transformToMessage);
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  sendMessage: async (data: SendMessageData): Promise<Message> => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Send message attempt ${attempt}/${maxRetries}`);
        let response;
        const files = data.files || (data.file ? [data.file] : []);

        if (files.length > 0) {
          const formData = new FormData();
          formData.append('content', data.content || '');
          files.forEach(file => formData.append('attachments', file));
          response = await api.post(`/api/chat/rooms/${data.conversation_id}/messages/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
          });
        } else {
          response = await api.post(`/api/chat/rooms/${data.conversation_id}/messages/`, {
            content: data.content,
          });
        }

        // Transform the response to include is_delivered/is_read
        return transformToMessage(response.data);
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw lastError;
  },

  downloadAttachment: async (attachmentId: number, fileName: string): Promise<void> => {
    // ... keep as is (no changes needed)
    const response = await api.get(`/api/chat/attachments/${attachmentId}/download/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  markAsRead: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/read/`);
  },

  markAllAsRead: async (conversationId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${conversationId}/read/`);
  },

  editMessage: async (messageId: number, content: string): Promise<Message> => {
    const response = await api.put(`/api/chat/messages/${messageId}/`, { content });
    return transformToMessage(response.data);
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await api.delete(`/api/chat/messages/${messageId}/delete/`);
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${conversationId}/delete/`);
  },

  createDirectConversation: async (identifier: string | number): Promise<Conversation> => {
    const targetUserId = typeof identifier === 'string' ? parseInt(identifier) : identifier;
    const response = await api.post('/api/chat/rooms/direct/', { target_user_id: targetUserId });
    return transformToConversation(response.data);
  },

  createGroupConversation: async (name: string, memberIds: number[]): Promise<Conversation> => {
    const response = await api.post('/api/chat/rooms/group/', { name, member_ids: memberIds });
    return transformToConversation(response.data);
  },

  getGroupMembers: async (roomId: number): Promise<User[]> => {
    const response = await api.get(`/api/chat/rooms/${roomId}/members/`);
    const members = response.data.results || response.data;
    return Array.isArray(members) ? members : [];
  },

  addMemberToGroup: async (roomId: number, identifier: string | number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/members/add`, { member_ids: [identifier] });
  },

  exitGroup: async (roomId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/exit/`);
  },

  removeMemberFromGroup: async (roomId: number, userId: number): Promise<void> => {
    await api.post(`/api/chat/rooms/${roomId}/remove-members/`, { member_ids: userId });
  },

  blockUser: async (userId: number): Promise<void> => {
    await api.post('/api/chat/block/', { user_id: userId });
  },

  unblockUser: async (userId: number): Promise<void> => {
    await api.post('/api/chat/unblock/', { user_id: userId });
  },

  getBlockedUsers: async (): Promise<any[]> => {
    const response = await api.get('/api/chat/blocked/');
    return response.data;
  },

  checkBlockStatus: async (userId: number): Promise<BlockStatus> => {
    const response = await api.get(`/api/chat/block-status/${userId}/`);
    return response.data;
  },

  updateContactNickname: async (contactId: number, nickname: string): Promise<void> => {
    await api.post('/api/chat/contacts/', { contact_id: contactId, nickname });
  },

  getNicknames: async (): Promise<any[]> => {
    const response = await api.get('/api/chat/contacts/');
    return response.data;
  },
};