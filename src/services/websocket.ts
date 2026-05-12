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
  onMessageDelivered?: (messageId: number) => void;
  onMessageSeen?: (messageId: number) => void;
  onTyping?: (senderId: number, isTyping: boolean) => void;
  onUserStatus?: (userId: number, status: string) => void;
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
    // Use the host from the error message if BASE_URL doesn't match
    const host = url.host || '192.168.1.20:8002';
    // Ensure we remove any trailing slashes from host and that it doesn't contain the protocol
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check if the current environment is using a secure context but trying to connect to insecure WS
    const isSecureContext = window.location.protocol === 'https:';
    const finalWsProtocol = isSecureContext ? 'wss:' : wsProtocol;

    const wsUrl = `${finalWsProtocol}//${cleanHost}/ws/chat/${this.roomId}/?token=${this.token}`;
    console.log('Connecting WebSocket to:', wsUrl, 'Protocol:', finalWsProtocol);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error('Failed to create WebSocket instance:', e);
      this.reconnect();
      return;
    }

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
        // Process all messages - let ChatPage handle filtering
        this.callbacks.onMessage?.({
          id: data.message_id,
          content: data.content,
          sender_id: Number(data.sender_id),   // always a number
          sender_mobile: data.sender_mobile,
          created_at: data.created_at,
          is_delivered: (data as any).is_delivered ?? false,
          is_read: (data as any).is_read ?? false,
          attachments: (data as any).attachments ?? [],
          is_deleted: (data as any).is_deleted ?? false,
          is_edited: (data as any).is_edited ?? false,
          edited_at: (data as any).edited_at ?? null,
          read_at: (data as any).read_at ?? null,
          delivered_at: (data as any).delivered_at ?? null,
        });
        break;

      case 'delivered':           // actual backend event: {type:"delivered", message_id, delivered_to}
      case 'message_delivered':
        if (data.message_id) {
          // "delivered" from backend = recipient received+read → show blue ticks
          this.callbacks.onMessageSeen?.(data.message_id);
        }
        break;

      case 'message_seen':
      case 'message_read':
        if (data.message_id) {
          this.callbacks.onMessageSeen?.(data.message_id);
        }
        break;

      case 'typing':
        this.callbacks.onTyping?.(data.sender_id!, data.is_typing!);
        break;

      case 'status':
      case 'user_status':
        // Handle different status message formats
        if (data.status) {
          this.callbacks.onUserStatus?.(Number(data.user_id!), data.status!);
        } else if (data.online !== undefined) {
          this.callbacks.onUserStatus?.(Number(data.user_id!), data.online ? 'online' : 'offline');
        } else if (data.offline !== undefined) {
          this.callbacks.onUserStatus?.(Number(data.user_id!), data.offline ? 'offline' : 'online');
        }
        break;

      case 'history':
        this.callbacks.onHistory?.(data.messages || []);
        break;

      case 'error':
        this.callbacks.onError?.(data.detail || 'Unknown error');
        break;

      default:
        console.log('Unknown WS message type:', data.type, data);
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