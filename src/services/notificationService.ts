// services/notificationService.ts
import api, { BASE_URL } from "./api";

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  extra_data: Record<string, any>;
  content_type?: string;
  object_id?: number;
  icon?: string;
}

export interface NotificationPreference {
  enable_websocket: boolean;
  enable_email: boolean;
  enable_sms: boolean;
  event_notifications: boolean;
  post_notifications: boolean;
  family_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  daily_digest: boolean;
  weekly_digest: boolean;
}

class NotificationService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  // REST API methods
  async getNotifications(params?: {
    page?: number;
    page_size?: number;
    read_status?: "read" | "unread";
    type?: string;
  }): Promise<{ results: Notification[]; count: number }> {
    const response = await api.get("/api/notifications/notifications/", { params });
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get("/api/notifications/notifications/unread_count/");
    return response.data.count;
  }

  async getNotification(notificationId: number): Promise<Notification> {
    const response = await api.get(`/api/notifications/notifications/${notificationId}/`);
    return response.data;
  }

  async markAsRead(notificationId: number): Promise<void> {
    await api.post(`/api/notifications/notifications/${notificationId}/mark_read/`);
  }

  async handleNotificationClick(notificationId: number): Promise<void> {
    try {
      await this.markAsRead(notificationId);
      this.emit("notification_clicked", notificationId);
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  }

  async markAllAsRead(): Promise<void> {
    await api.post("/api/notifications/notifications/mark_all_read/");
  }

  async getPreferences(): Promise<NotificationPreference> {
    const response = await api.get("/api/notifications/preferences/");
    return response.data;
  }

  async updatePreferences(
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const response = await api.put(
      "/api/notifications/preferences/",
      preferences
    );
    return response.data;
  }

  // WebSocket connection
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("authToken");
      const wsUrl = BASE_URL.replace("http", "ws") + "ws/notifications/";

      this.ws = new WebSocket(`${wsUrl}?token=${token}`);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connectWebSocket().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case "new_notification":
        this.emit("new_notification", data.notification);
        this.emit("unread_count_updated", data.unread_count);
        break;
      case "notification_marked_read":
        this.emit("notification_updated", data);
        this.emit("unread_count_updated", data.unread_count);
        break;
      case "all_notifications_marked_read":
        this.emit("all_marked_read");
        this.emit("unread_count_updated", 0);
        break;
      case "unread_count":
        this.emit("unread_count_updated", data.count);
        break;
      case "pending_notifications":
        data.notifications.forEach((notif: Notification) => {
          this.emit("new_notification", notif);
        });
        this.emit("unread_count_updated", data.unread_count);
        break;
      case "connection_established":
        console.log("Connected to notification service");
        this.emit("connected", data);
        break;
      case "error":
        console.error("Notification error:", data.message);
        this.emit("error", data.message);
        break;
      default:
        console.log("Unknown message type:", data.type);
    }
  }

  sendWebSocketMessage(type: string, data: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Helper method to get icon based on notification type
  getNotificationIcon(notificationType: string): string {
    const iconMap: Record<string, string> = {
      // Event notifications
      event_created: "📅",
      event_updated: "📝",
      event_cancelled: "❌",
      event_reminder: "🔔",
      event_starting_soon: "⏰",
      event_ended: "✅",
      rsvp_received: "📋",
      rsvp_updated: "🔄",
      event_comment: "💬",
      event_media_added: "🖼️",

      // Post notifications
      post_created: "📝",
      post_updated: "✏️",
      post_liked: "❤️",
      post_commented: "💭",
      post_shared: "🔄",
      post_mentioned: "@",
      post_reported: "🚩",

      // Family notifications
      relation_added: "👨‍👩‍👧",
      relation_confirmed: "✓",
      relation_updated: "🔄",
      birth_order_updated: "🔢",
      family_anniversary: "🎉",
      death_anniversary: "🕊️",
      birthday_reminder: "🎂",

      // System notifications
      profile_update: "👤",
      security_alert: "🔒",
      login_alert: "🔑",
      data_export_ready: "📥",
      backup_completed: "💾",
      system_maintenance: "⚙️",
    };

    return iconMap[notificationType] || "🔔";
  }

  // Helper to get priority color
  getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      low: "text-gray-500",
      medium: "text-blue-500",
      high: "text-orange-500",
      urgent: "text-red-500",
    };
    return colorMap[priority] || "text-gray-500";
  }

  // Helper to get priority badge class
  getPriorityBadgeClass(priority: string): string {
    const classMap: Record<string, string> = {
      low: "bg-gray-100 text-gray-600",
      medium: "bg-blue-100 text-blue-600",
      high: "bg-orange-100 text-orange-600",
      urgent: "bg-red-100 text-red-600 animate-pulse",
    };
    return classMap[priority] || "bg-gray-100 text-gray-600";
  }
}

export default new NotificationService();
