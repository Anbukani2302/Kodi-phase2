// E:\kodi website\src\services\chatService.ts

import api from './api';
import axios from 'axios';

export interface User {
  id: number;
  mobile_number: string;
  name?: string;
  email?: string;
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
  read_at?: string | null; // When message was read by recipient
  delivered_at?: string | null; // When message was delivered
  attachment_id?: number | null; // Keep for backward compatibility
  file_name?: string | null; // Keep for backward compatibility
  attachments?: {
    id: number;
    file_name: string;
    file_type: string;
    url: string;
  }[];
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

// Helper function to transform ChatRoom to Conversation
const transformToConversation = (room: any): Conversation => {
  return {
    id: room.id,
    room_type: room.room_type,
    name: room.name,
    participants: room.members || [],
    unread_count: room.unread_count || 0,
    last_message: room.last_message,
    created_at: room.created_at,
    created_by: room.created_by || room.admin_id || room.owner_id || room.creator_id,
  };
};

// Helper function to transform Message
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
  };
};

export const chatService = {
  // Get all conversations for current user
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

  // Get messages for a specific conversation
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

  // Send a new message
  sendMessage: async (data: SendMessageData): Promise<Message> => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Send message attempt ${attempt}/${maxRetries} for conversation ${data.conversation_id}`);
        
        let response;
        const files = data.files || (data.file ? [data.file] : []);

        if (files.length > 0) {
          const formData = new FormData();
          formData.append('content', data.content || '');
          formData.append('type', 'file');

          // Append all files using the same 'attachments' key for multi-file support
          files.forEach(file => {
            formData.append('attachments', file);
          });

          response = await api.post(`/api/chat/rooms/${data.conversation_id}/messages/`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 120000, // 2 minutes for message sending
          });
        } else {
          response = await api.post(`/api/chat/rooms/${data.conversation_id}/messages/`, {
            conversation_id: data.conversation_id,
            content: data.content,
            timeout: 120000, // 2 minutes for message sending
          });
        }

        console.log(`Message sent successfully on attempt ${attempt}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`Send message attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError; // All attempts failed
  },

  // Download attachment
  downloadAttachment: async (attachmentId: number, fileName: string): Promise<void> => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Download attempt ${attempt}/${maxRetries} for attachment ${attachmentId}`);
        const response = await api.get(`/api/chat/attachments/${attachmentId}/download/`, {
          responseType: 'blob',
          timeout: 180000, // 3 minutes for downloads
        });

        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'download');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        console.log(`Download successful for attachment ${attachmentId}`);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.error(`Download attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError; // All attempts failed
  },

  // Mark messages as read
  markAsRead: async (roomId: number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${roomId}/read/`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Mark all messages in conversation as read
  markAllAsRead: async (conversationId: number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${conversationId}/read/`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Edit a message
  editMessage: async (messageId: number, content: string): Promise<Message> => {
    try {
      const response = await api.put(`/api/chat/messages/${messageId}/`, { content });
      return transformToMessage(response.data);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },

  // Delete a message
  deleteMessage: async (messageId: number): Promise<void> => {
    try {
      await api.delete(`/api/chat/messages/${messageId}/delete/`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Delete a conversation
  deleteConversation: async (conversationId: number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${conversationId}/delete/`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  createDirectConversation: async (identifier: string | number): Promise<Conversation> => {
    try {
      const targetUserId = typeof identifier === 'string' ? parseInt(identifier) : identifier;
      console.log('Creating direct conversation with user ID:', targetUserId);
      console.log('Endpoint:', '/api/chat/rooms/direct/');

      let response;
      try {
        // First try the local server
        response = await api.post('/api/chat/rooms/direct/', {
          target_user_id: targetUserId
        });
        console.log('Direct conversation created successfully via local server:', response.data);
      } catch (error: any) {
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.log('Local server failed, trying fallback server...');

          // Try the render.com fallback
          const fallbackApi = axios.create({
            baseURL: 'https://kodi-phase2.onrender.com/',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            timeout: 60000,
          });

          response = await fallbackApi.post('/api/chat/rooms/direct/', {
            target_user_id: targetUserId
          });
          console.log('Direct conversation created successfully via fallback server:', response.data);
        } else {
          throw error;
        }
      }

      return transformToConversation(response.data);
    } catch (error: any) {
      console.error('Error creating direct conversation:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        config: error.config
      });

      // If it's a network error, the server might be down
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.error('Network error - both servers unreachable');
        throw new Error('Unable to connect to chat server. Please check your network connection and try again.');
      }

      throw error;
    }
  },

  // Create a new group conversation
  createGroupConversation: async (name: string, memberIds: number[]): Promise<Conversation> => {
    try {
      const response = await api.post('/api/chat/rooms/group/', {
        name,
        member_ids: memberIds
      });
      return transformToConversation(response.data);
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  },

  // Get members of a group
  getGroupMembers: async (roomId: number): Promise<User[]> => {
    try {
      const response = await api.get(`/api/chat/rooms/${roomId}/members/`);
      const members = response.data.results || response.data;
      return Array.isArray(members) ? members : [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  },

  // Add member to group
  addMemberToGroup: async (roomId: number, identifier: string | number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${roomId}/members/add`, {
        member_ids: [identifier]
      });
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  },

  // Exit a group
  exitGroup: async (roomId: number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${roomId}/exit/`);
    } catch (error) {
      console.error('Error exiting group:', error);
      throw error;
    }
  },

  // Remove member from group
  removeMemberFromGroup: async (roomId: number, userId: number): Promise<void> => {
    try {
      await api.post(`/api/chat/rooms/${roomId}/remove-members`, {
        member_ids: userId
      });
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  },

  // Block a user
  blockUser: async (userId: number): Promise<void> => {
    try {
      await api.post('/api/chat/block/', { user_id: userId });
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  },

  // Unblock a user
  unblockUser: async (userId: number): Promise<void> => {
    try {
      await api.post('/api/chat/unblock/', { user_id: userId });
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  },

  // Get blocked users list
  getBlockedUsers: async (): Promise<any[]> => {
    try {
      const response = await api.get('/api/accounts/blocked/');
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }
  },

  // Check block status with a user
  checkBlockStatus: async (userId: number): Promise<BlockStatus> => {
    try {
      const response = await api.get(`/api/accounts/block-status/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error checking block status:', error);
      throw error;
    }
  },

  // Update contact nickname
  updateContactNickname: async (contactId: number, nickname: string): Promise<void> => {
    try {
      await api.post('/api/chat/contacts/', {
        contact_id: contactId,
        nickname: nickname
      });
    } catch (error) {
      console.error('Error updating contact nickname:', error);
      throw error;
    }
  },

  // Get contact nicknames
  getNicknames: async (): Promise<any[]> => {
    try {
      const response = await api.get('/api/chat/contacts/');
      return response.data;
    } catch (error) {
      console.error('Error fetching nicknames:', error);
      throw error;
    }
  },
};