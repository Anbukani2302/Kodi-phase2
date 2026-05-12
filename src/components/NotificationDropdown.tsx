import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageSquare,
  Heart,
  UserPlus,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification as AppNotification } from '../services/notificationService';

interface NotificationDropdownProps {
  onNotificationClick?: (notification: AppNotification) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNotificationClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationItemClick = async (notification: AppNotification) => {
    // Call mark as read first
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Call custom callback if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Navigate to FeedPage with relevant query params
    const { extra_data } = notification;

    if (extra_data?.event_id) {
      navigate(`/home?tab=events&eventId=${extra_data.event_id}`);
    } else if (extra_data?.post_id) {
      navigate(`/home?tab=posts&postId=${extra_data.post_id}`);
    } else {
      navigate('/home');
    }

    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_liked':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
            <Heart className="w-5 h-5 text-white" fill="white" />
          </div>
        );
      case 'comment':
      case 'post_commented':
      case 'event_comment':
        return (
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" fill="white" />
          </div>
        );
      case 'connection_request':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
        );
      case 'event_reminder':
      case 'event_created':
      case 'event_updated':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-sm">
            <Clock className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center shadow-sm">
            <Bell className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  // Facebook-style relative time
  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    if (diffWeek < 4) return `${diffWeek}w`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all duration-200 relative"
        aria-label="Notifications"
      >
        <Bell className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Facebook-style Dropdown */}
      {isOpen && (
        <div className="fixed md:absolute top-0 left-0 right-0 md:top-full md:left-auto md:right-0 w-full md:w-[360px] h-full md:h-auto bg-white md:rounded-xl shadow-2xl md:shadow-[0_12px_28px_0_rgba(0,0,0,0.2),0_2px_4px_0_rgba(0,0,0,0.1)] overflow-hidden z-[9999] md:mt-2">
          {/* Mobile Safe Area Spacer */}
          <div className="h-safe-top md:hidden bg-white" />

          <div className="flex flex-col h-full md:h-auto">
            {/* Header */}
            <div className="px-4 py-3 md:py-4 flex items-center justify-between border-b md:border-b-0 border-gray-100 bg-white">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 md:w-5 md:h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto fb-scrollbar md:max-h-[420px] pb-24 md:pb-0 overscroll-contain">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification)}
                      className={`px-3 py-2 mx-2 my-0.5 flex items-start gap-3 cursor-pointer rounded-lg transition-colors duration-150 ${!notification.is_read
                        ? 'bg-blue-50/60 hover:bg-blue-50'
                        : 'hover:bg-gray-100'
                        }`}
                    >
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notification.notification_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-[18px] ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                          <span className="font-semibold">{notification.title}</span>
                          {' '}
                          <span>{notification.message}</span>
                        </p>
                        <p className={`text-xs mt-0.5 font-semibold ${!notification.is_read ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>

                      {/* Mark Read button on the right */}
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          className="shrink-0 ml-auto px-2 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors self-center whitespace-nowrap"
                        >
                          Mark Read
                        </button>
                      )}

                      {/* Unread blue dot */}
                      {!notification.is_read && (
                        <div className="shrink-0 self-center ml-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-10 h-10 text-gray-300" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-1">No notifications yet</h4>
                  <p className="text-sm text-gray-500">We'll let you know when something happens.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-200">
                <button
                  onClick={() => {
                    navigate('/home');
                    setIsOpen(false);
                  }}
                  className="w-full py-3 text-center text-[15px] font-semibold text-blue-600 hover:bg-gray-50 transition-colors"
                >
                  See all
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .fb-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .fb-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .fb-scrollbar::-webkit-scrollbar-thumb {
          background: #bcc0c4;
          border-radius: 10px;
          border: 2px solid white;
        }
        .fb-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8a8d91;
        }
      `}
      </style>
    </div>
  );
};

export default NotificationDropdown;
