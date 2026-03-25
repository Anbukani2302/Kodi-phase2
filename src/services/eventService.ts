// services/eventService.ts
import api from '../services/api';

export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: number;
  event_type_title: string;
  start_date: string;
  end_date?: string;
  is_all_day: boolean;
  location_name: string;
  city: string;
  is_virtual: boolean;
  virtual_link?: string;
  visibility: number;
  visibility_name: string;
  status: string;
  rsvp_going: number;
  rsvp_maybe: number;
  rsvp_not_going: number;
  user_rsvp?: {
    response: 'GOING' | 'MAYBE' | 'NOT_GOING';
    guests_count: number;
  };
  created_by: number;
  created_by_name: string;
  cover_image_url?: string;
  created_at: string;
  view_count: number;
  comments_count: number;
  comment_count: number;
}

export interface EventType {
  id: number;
  title: string;
  created_by: number;
  created_by_name: string;
  family?: number;
  is_public: boolean;
  usage_count: number;
}

export interface EventFilter {
  start_date_after?: string;
  start_date_before?: string;
  event_type?: number;
  city?: string;
  status?: string;
  created_by?: number;
}

export interface RSVPData {
  response: 'GOING' | 'MAYBE' | 'NOT_GOING';
  guests_count?: number;
  guest_names?: string;
  dietary_restrictions?: string;
  notes?: string;
}

export const eventService = {
  // ========== EVENT LISTINGS ==========

  getEvents: async (endpoint = 'upcoming/', params?: EventFilter) => {
    try {
      const response = await api.get(`/api/event_management/events/${endpoint}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  getEvent: async (id: number) => {
    try {
      const response = await api.get(`/api/event_management/events/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      throw error;
    }
  },

  getUpcomingEvents: async (params?: EventFilter) => {
    try {
      const response = await api.get('/api/event_management/events/upcoming/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  },

  getPastEvents: async (params?: EventFilter) => {
    try {
      const response = await api.get('/api/event_management/events/past/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching past events:', error);
      throw error;
    }
  },

  getMyEvents: async () => {
    try {
      const response = await api.get('/api/event_management/events/my_events/');
      return response.data;
    } catch (error) {
      console.error('Error fetching my events:', error);
      throw error;
    }
  },

  getMyCommentReplies: async () => {
    try {
      const response = await api.get('/api/event_management/events/my_comment_replies/');
      return response.data;
    } catch (error) {
      console.error('Error fetching my comment replies:', error);
      throw error;
    }
  },

  getMyRSVPs: async () => {
    try {
      const response = await api.get('/api/event_management/events/my_rsvps/');
      return response.data;
    } catch (error) {
      console.error('Error fetching my RSVPs:', error);
      throw error;
    }
  },

  getCalendarEvents: async (year: number, month: number) => {
    try {
      const response = await api.get('/api/event_management/events/calendar/', {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  },

  // ========== EVENT CRUD ==========

  createEvent: async (eventData: FormData | any) => {
    try {
      // Check if eventData is FormData (for file uploads) or plain object
      const isFormData = eventData instanceof FormData;

      const response = await api.post('/api/event_management/events/', eventData, {
        headers: isFormData ? {
          'Content-Type': 'multipart/form-data',
        } : {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  updateEvent: async (id: number, eventData: FormData | any) => {
    try {
      const isFormData = eventData instanceof FormData;

      const response = await api.put(`/api/event_management/events/${id}/`, eventData, {
        headers: isFormData ? {
          'Content-Type': 'multipart/form-data',
        } : {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }
  },

  deleteEvent: async (id: number) => {
    try {
      const response = await api.delete(`/api/event_management/events/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      throw error;
    }
  },

  // ========== RSVP ACTIONS ==========

  rsvpToEvent: async (eventId: number, data: RSVPData) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/rsvp/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error RSVP to event ${eventId}:`, error);
      throw error;
    }
  },

  cancelRSVP: async (eventId: number) => {
    try {
      const response = await api.delete(`/api/event_management/events/${eventId}/cancel_rsvp/`);
      return response.data;
    } catch (error) {
      console.error(`Error cancelling RSVP for event ${eventId}:`, error);
      throw error;
    }
  },

  getRSVPList: async (eventId: number, response?: string) => {
    try {
      const params = response ? { response } : {};
      const responseData = await api.get(`/api/event_management/events/${eventId}/rsvp_list/`, { params });
      return responseData.data;
    } catch (error) {
      console.error(`Error fetching RSVPs for event ${eventId}:`, error);
      throw error;
    }
  },

  // ========== EVENT TYPES ==========

  getEventTypes: async (params?: { search?: string }) => {
    try {
      const response = await api.get('/api/event_management/event-types/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching event types:', error);
      throw error;
    }
  },

  createEventType: async (data: { title: string; family?: number; is_public?: boolean }) => {
    try {
      const response = await api.post('/api/event_management/event-types/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating event type:', error);
      throw error;
    }
  },

  getPopularEventTypes: async () => {
    try {
      const response = await api.get('/api/event_management/event-types/popular/');
      return response.data;
    } catch (error) {
      console.error('Error fetching popular event types:', error);
      throw error;
    }
  },

  getMyEventTypes: async () => {
    try {
      const response = await api.get('/api/event_management/event-types/my_types/');
      return response.data;
    } catch (error) {
      console.error('Error fetching my event types:', error);
      throw error;
    }
  },

  // ========== EVENT MEDIA ==========

  addEventMedia: async (eventId: number, formData: FormData) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/add_media/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding media to event ${eventId}:`, error);
      throw error;
    }
  },

  getEventMedia: async (eventId: number) => {
    try {
      const response = await api.get(`/api/event_management/events/${eventId}/media/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching media for event ${eventId}:`, error);
      throw error;
    }
  },

  deleteEventMedia: async (eventId: number, mediaId: number) => {
    try {
      const response = await api.delete(`/api/event_management/events/${eventId}/media/${mediaId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting media ${mediaId}:`, error);
      throw error;
    }
  },

  // ========== EVENT COMMENTS ==========

  addComment: async (eventId: number, content: string, parentId?: number) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/comment/`, {
        content,
        parent: parentId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding comment to event ${eventId}:`, error);
      throw error;
    }
  },

  getComments: async (eventId: number) => {
    try {
      const response = await api.get(`/api/event_management/events/${eventId}/comments/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching comments for event ${eventId}:`, error);
      throw error;
    }
  },

  updateComment: async (eventId: number, commentId: number, content: string) => {
    try {
      const response = await api.put(`/api/event_management/events/${eventId}/comments/${commentId}/`, {
        content,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating comment ${commentId} for event ${eventId}:`, error);
      throw error;
    }
  },

  deleteComment: async (eventId: number, commentId: number) => {
    try {
      const response = await api.delete(`/api/event_management/events/${eventId}/comments/${commentId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting comment ${commentId} for event ${eventId}:`, error);
      throw error;
    }
  },

  replyToComment: async (eventId: number, commentId: number, content: string) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/comment/`, {
        content,
        parent: commentId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error replying to comment ${commentId} for event ${eventId}:`, error);
      throw error;
    }
  },

  flagComment: async (eventId: number, commentId: number, reason: string, description?: string) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/comments/${commentId}/flag/`, {
        reason,
        description,
      });
      return response.data;
    } catch (error) {
      console.error(`Error flagging comment ${commentId} for event ${eventId}:`, error);
      throw error;
    }
  },

  // ========== FLAG ACTIONS ==========

  flagEvent: async (eventId: number, reason: string, description?: string) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/flag/`, {
        reason,
        description,
      });
      return response.data;
    } catch (error) {
      console.error(`Error flagging event ${eventId}:`, error);
      throw error;
    }
  },

  // ========== VISIBILITY LEVELS ==========

  getVisibilityLevels: async () => {
    try {
      const response = await api.get('/api/event_management/visibility-levels/');
      return response.data;
    } catch (error) {
      console.error('Error fetching visibility levels:', error);
      throw error;
    }
  },

  // ========== ADMIN/MODERATOR ACTIONS ==========

  moderateEvent: async (eventId: number, action: 'approve' | 'reject', note?: string) => {
    try {
      const response = await api.post(`/api/event_management/events/${eventId}/moderate/`, {
        action,
        note,
      });
      return response.data;
    } catch (error) {
      console.error(`Error moderating event ${eventId}:`, error);
      throw error;
    }
  },

  getPendingEvents: async () => {
    try {
      const response = await api.get('/api/event_management/events/pending/');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending events:', error);
      throw error;
    }
  },

  getFlaggedEvents: async () => {
    try {
      const response = await api.get('/api/event_management/events/flagged/');
      return response.data;
    } catch (error) {
      console.error('Error fetching flagged events:', error);
      throw error;
    }
  },

  getEventStats: async () => {
    try {
      const response = await api.get('/api/event_management/events/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching event stats:', error);
      throw error;
    }
  },

  // ========== EVENT CONFIG (Admin only) ==========

  getEventConfig: async () => {
    try {
      const response = await api.get('/api/event_management/event-config/get/');
      return response.data;
    } catch (error) {
      console.error('Error fetching event config:', error);
      throw error;
    }
  },

  updateEventConfig: async (configData: any) => {
    try {
      const response = await api.post('/api/event_management/event-config/custom_update/', configData);
      return response.data;
    } catch (error) {
      console.error('Error updating event config:', error);
      throw error;
    }
  },

  restrictUser: async (userId: number, restrictionData: any) => {
    try {
      const response = await api.post('/api/event_management/event-config/restrict_user/', {
        user_id: userId,
        ...restrictionData,
      });
      return response.data;
    } catch (error) {
      console.error('Error restricting user:', error);
      throw error;
    }
  },
};

// Helper functions for formatting
export const eventHelpers = {
  formatEventDate: (startDate: string, endDate?: string, isAllDay?: boolean) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (isAllDay) {
      if (end && start.toDateString() !== end.toDateString()) {
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()} (All Day)`;
      }
      return `${start.toLocaleDateString()} (All Day)`;
    }

    if (end && start.toDateString() === end.toDateString()) {
      return `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } else if (end) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else {
      return start.toLocaleDateString() + ' • ' + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  },

  getRSVPStatus: (event: Event) => {
    if (!event.user_rsvp) return null;
    return event.user_rsvp.response;
  },

  isEventPast: (event: Event) => {
    return new Date(event.start_date) < new Date();
  },

  isEventUpcoming: (event: Event) => {
    return new Date(event.start_date) >= new Date();
  },
};