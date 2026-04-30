// contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import notificationService, { Notification as AppNotification, NotificationPreference } from '../services/notificationService';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: (params?: any) => Promise<void>;
  getPreferences: () => Promise<NotificationPreference>;
  updatePreferences: (prefs: Partial<NotificationPreference>) => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({
        page: currentPage,
        page_size: 20,
        ...params
      });

      if (currentPage === 1) {
        setNotifications(response.results);
      } else {
        setNotifications(prev => [...prev, ...response.results]);
      }

      setHasMore(response.results.length === 20);
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Get preferences
  const getPreferences = async () => {
    return await notificationService.getPreferences();
  };

  // Update preferences
  const updatePreferences = async (prefs: Partial<NotificationPreference>): Promise<void> => {
    await notificationService.updatePreferences(prefs);
  };

  // WebSocket event handlers
  useEffect(() => {
    if (!localStorage.getItem('authToken')) return;

    const handleNewNotification = (notification: AppNotification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });

        browserNotification.onclick = () => {
          notificationService.handleNotificationClick(notification.id);
          window.focus();
        };
      }
    };

    const handleUnreadCountUpdated = (count: number) => {
      setUnreadCount(count);
    };

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleError = (err: string) => {
      setError(err);
    };

    // Setup event listeners
    notificationService.on('new_notification', handleNewNotification);
    notificationService.on('unread_count_updated', handleUnreadCountUpdated);
    notificationService.on('connected', handleConnected);
    notificationService.on('error', handleError);

    // Connect WebSocket
    notificationService.connectWebSocket().catch(console.error);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      notificationService.off('new_notification', handleNewNotification);
      notificationService.off('unread_count_updated', handleUnreadCountUpdated);
      notificationService.off('connected', handleConnected);
      notificationService.off('error', handleError);
      notificationService.disconnect();
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (localStorage.getItem('authToken')) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Polling fallback for unread count (every 30 seconds if WebSocket not connected)
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        getPreferences,
        updatePreferences,
        isConnected
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};