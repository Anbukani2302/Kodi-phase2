// E:\kodi website\src\services\websocket.ts

import { BASE_URL } from './api';

interface WebSocketMessage {
  type: string;
  message_id?: number;
  content?: string;
  sender_id?: number;
  sender_mobile?: string;
  created_at?: string;
  is_typing?: boolean;
  messages?: any[];
  user_id?: number;
  status?: string;
  detail?: string;
  online?: boolean;
  offline?: boolean;
}

interface WebSocketCallbacks {
  onMessage?: (message: any) => void;
  onTyping?: (senderId: number, isTyping: boolean) => void;
  onStatus?: (userId: number, status: string) => void;
  onError?: (error: string) => void;
  onHistory?: (history: any[]) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private roomId: number;
  private token: string;
  private userId: number;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;

  constructor(roomId: number, token: string, userId: number, callbacks: WebSocketCallbacks) {
    this.roomId = roomId;
    this.token = token;
    this.userId = userId;
    this.callbacks = callbacks;
  }

  connect() {
    // Derive WebSocket host from the backend BASE_URL
    const url = new URL(BASE_URL);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${url.host}/ws/chat/${this.roomId}/?token=${this.token}`;
    console.log('Connecting WebSocket to:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.callbacks.onError?.('Connection error');
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      if (event.code !== 1000) { // Normal closure
        this.reconnect();
      }
    };
  }

  private handleMessage(data: WebSocketMessage) {
    switch (data.type) {
      case 'message':
        this.callbacks.onMessage?.({
          id: data.message_id,
          content: data.content,
          sender_id: data.sender_id,
          sender_mobile: data.sender_mobile,
          created_at: data.created_at,
        });
        break;

      case 'typing':
        this.callbacks.onTyping?.(data.sender_id!, data.is_typing!);
        break;

      case 'status':
        // Handle different status message formats
        if (data.status) {
          this.callbacks.onStatus?.(data.user_id!, data.status!);
        } else if (data.online !== undefined) {
          this.callbacks.onStatus?.(data.user_id!, data.online ? 'online' : 'offline');
        } else if (data.offline !== undefined) {
          this.callbacks.onStatus?.(data.user_id!, data.offline ? 'offline' : 'online');
        }
        break;

      case 'history':
        this.callbacks.onHistory?.(data.messages || []);
        break;

      case 'error':
        this.callbacks.onError?.(data.detail || 'Unknown error');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  sendMessage(content: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message',
        content: content,
        sender_id: this.userId,
      }));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  sendTyping(isTyping: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
      }));
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError?.('Failed to reconnect. Please refresh the page.');
      return;
    }

    setTimeout(() => {
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts + 1}`);
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectTimeout * Math.pow(2, this.reconnectAttempts));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }
}