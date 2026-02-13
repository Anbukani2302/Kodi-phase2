import api from './api';

export interface ChatUser {
  id: number;
  name: string;
  avatar?: string;
  online?: boolean;
}

export interface Message {
  id: number;
  conversation: number;
  sender: ChatUser;
  content: string;
  image?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  name?: string;
  participants: ChatUser[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationData {
  participant_ids: number[];
  is_group: boolean;
  name?: string;
}

export interface SendMessageData {
  conversation_id: number;
  content: string;
  image?: File | null;
}

class ChatService {
  // GET /api/conversations/ - Get all conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/api/conversations/');
    return response.data;
  }

  // GET /api/conversations/:id/ - Get single conversation
  async getConversation(conversationId: number): Promise<Conversation> {
    const response = await api.get(`/api/conversations/${conversationId}/`);
    return response.data;
  }

  // POST /api/conversations/ - Create new conversation
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    const response = await api.post('/api/conversations/', data);
    return response.data;
  }

  // GET /api/conversations/:id/messages/ - Get messages for a conversation
  async getMessages(conversationId: number, page: number = 1): Promise<Message[]> {
    const response = await api.get(`/api/conversations/${conversationId}/messages/`, {
      params: { page },
    });
    return response.data;
  }

  // POST /api/messages/ - Send a message
  async sendMessage(data: SendMessageData): Promise<Message> {
    const formData = new FormData();
    formData.append('conversation', String(data.conversation_id));
    formData.append('content', data.content);
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await api.post('/api/messages/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // PUT /api/messages/:id/read/ - Mark message as read
  async markAsRead(messageId: number): Promise<void> {
    await api.put(`/api/messages/${messageId}/read/`);
  }

  // PUT /api/conversations/:id/read-all/ - Mark all messages in conversation as read
  async markAllAsRead(conversationId: number): Promise<void> {
    await api.put(`/api/conversations/${conversationId}/read-all/`);
  }

  // DELETE /api/messages/:id/ - Delete a message
  async deleteMessage(messageId: number): Promise<void> {
    await api.delete(`/api/messages/${messageId}/`);
  }

  // POST /api/conversations/:id/add-participant/ - Add participant to group
  async addParticipant(conversationId: number, userId: number): Promise<Conversation> {
    const response = await api.post(`/api/conversations/${conversationId}/add-participant/`, {
      user_id: userId,
    });
    return response.data;
  }

  // POST /api/conversations/:id/remove-participant/ - Remove participant from group
  async removeParticipant(conversationId: number, userId: number): Promise<Conversation> {
    const response = await api.post(`/api/conversations/${conversationId}/remove-participant/`, {
      user_id: userId,
    });
    return response.data;
  }
}

export const chatService = new ChatService();
export default chatService;
