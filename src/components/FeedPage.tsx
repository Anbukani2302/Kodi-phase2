// FeedPage.tsx (updated)
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Calendar,
  Loader2,
  Send,
  Image as ImageIcon,
  Camera,
  Video,
  MapPin,
  Clock,
  Tag,
  Sparkles,
  Check,
  X,
  Users,
  List,
  Eye,
  User,
  Home,
  MessageCircle,
  Heart,
  Globe,
  Lock,
  MoreVertical,
  Plus,
  ChevronRight,
  Flag,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Coffee,
  FileText,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { postService, Post as PostType } from '../services/postService';
import { eventService, Event, EventType, RSVPData, eventHelpers } from '../services/eventService';
import { authService, UserProfile } from '../services/authService';
import { BASE_URL } from '../services/api';
import Post from '../components/Post';

// Interfaces
interface RSVPGuest {
  notes: ReactNode;
  id: number;
  user: {
    id: number;
    full_name: string;
    profile_image?: string;
  };
  status: 'GOING' | 'MAYBE' | 'NOT_GOING';
  guests_count?: number;
  created_at: string;
}

interface EventComment {
  user_name: any;
  id: number;
  event: number;
  user: {
    id: number;
    full_name: string;
    profile_image?: string;
  };
  content: string;
  created_at: string;
  parent?: number;
  replies?: EventComment[];
}

export default function FeedPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);

  // Posts state
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Post creation states
  const [postContent, setPostContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaCaptions, setMediaCaptions] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState('public');

  // Event creation states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventType, setEventType] = useState<number | ''>('');
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  const [creatingEventType, setCreatingEventType] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [tempEventTypeTitle, setTempEventTypeTitle] = useState('');

  // Edit event states
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editEventType, setEditEventType] = useState<number | ''>('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editVisibility, setEditVisibility] = useState<number | ''>('');
  const [deletingEvent, setDeletingEvent] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<number | null>(null);

  // RSVP states for events
  const [rsvpLoading, setRsvpLoading] = useState<{ [key: number]: boolean }>({});
  const [showEventDetails, setShowEventDetails] = useState<{ [key: number]: boolean }>({});

  // Guest list modal states
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedEventForGuests, setSelectedEventForGuests] = useState<Event | null>(null);
  const [guests, setGuests] = useState<RSVPGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [guestFilter, setGuestFilter] = useState<'ALL' | 'GOING' | 'MAYBE' | 'NOT_GOING'>('ALL');
  const [guestStats, setGuestStats] = useState({
    going: 0,
    maybe: 0,
    notGoing: 0,
    total: 0,
    totalGuests: 0
  });

  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});

  // Event Comments state
  const [eventComments, setEventComments] = useState<{ [key: number]: EventComment[] }>({});
  const [loadingEventComments, setLoadingEventComments] = useState<{ [key: number]: boolean }>({});
  const [editingComment, setEditingComment] = useState<{ eventId: number; commentId: number; content: string } | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<{ eventId: number; commentId: number } | null>(null);
  const [activeEventMenu, setActiveEventMenu] = useState<number | null>(null);

  // Report Event States
  const [showReportModal, setShowReportModal] = useState(false);
  const [eventToReportId, setEventToReportId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('INAPPROPRIATE');
  const [reportDescription, setReportDescription] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Tab state: 'posts' or 'events'
  const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');

  // Media tab for posts: 'photos' or 'videos'
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos'>('photos');

  // Event filters
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past' | 'myevents' | 'myrsvps' | 'myreplies'>('all');

  // Post filters
  const [postFilter, setPostFilter] = useState<'all' | 'myposts'>('all');

  // Get current user ID from auth service or profile
  const currentUser = authService.getCurrentUser();
  const currentUserIdNum = currentUser?.id || (profile ? (profile.user || profile.id) : null);

  useEffect(() => {
    loadProfile();
    if (activeTab === 'posts') {
      loadPosts();
    } else {
      loadEvents();
      loadEventTypes();
    }
  }, [activeTab, eventFilter, postFilter]);

  const loadProfile = async () => {
    try {
      const data = await authService.getMyProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      let response;

      if (postFilter === 'myposts' && currentUserIdNum) {
        // Get current user's posts - hits /api/posts/user/YOUR_USER_ID/?page=1&page_size=20
        response = await postService.getUserPosts(currentUserIdNum);
      } else {
        // Get all posts feed
        response = await postService.getPosts();
      }

      if (response && response.posts) {
        setPosts(response.posts);
      } else if (response && response.results) {
        setPosts(response.results);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndUpdatePost = async (postId: number) => {
    try {
      const updatedPost = await postService.getPost(postId);
      if (updatedPost) {
        setPosts(currentPosts => currentPosts.map(post =>
          post.id === postId ? updatedPost : post
        ));
      }
    } catch (error) {
      console.error('Failed to refresh updated post:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      let response;

      switch (eventFilter) {
        case 'all':
          response = await eventService.getEvents('');
          break;
        case 'upcoming':
          response = await eventService.getUpcomingEvents();
          break;
        case 'past':
          response = await eventService.getPastEvents();
          break;
        case 'myevents':
          response = await eventService.getMyEvents();
          break;
        case 'myrsvps':
          response = await eventService.getMyRSVPs();
          break;
        case 'myreplies':
          response = await eventService.getMyCommentReplies();
          break;
        default:
          response = await eventService.getUpcomingEvents();
      }

      setEvents(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadEventTypes = async () => {
    try {
      setLoadingEventTypes(true);
      const types = await eventService.getEventTypes();
      setEventTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error('Failed to load event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const loadGuests = async (eventId: number, filter?: 'GOING' | 'MAYBE' | 'NOT_GOING') => {
    try {
      setLoadingGuests(true);
      const response = await eventService.getRSVPList(eventId, filter);
      setGuests(Array.isArray(response) ? response : []);

      if (selectedEventForGuests) {
        const going = selectedEventForGuests.rsvp_going;
        const maybe = selectedEventForGuests.rsvp_maybe;
        const notGoing = selectedEventForGuests.rsvp_not_going;
        const total = going + maybe + notGoing;

        const totalGuests = Array.isArray(response) ? response.reduce((sum, guest) =>
          sum + (guest.guests_count || 0) + 1, 0) : 0;

        setGuestStats({
          going,
          maybe,
          notGoing,
          total,
          totalGuests
        });
      }
    } catch (error) {
      console.error('Failed to load guests:', error);
      setGuests([]);
    } finally {
      setLoadingGuests(false);
    }
  };

  const handleViewGuests = async (event: Event) => {
    setSelectedEventForGuests(event);
    setGuestFilter('ALL');
    await loadGuests(event.id);
    setShowGuestModal(true);
  };

  const handleGuestFilterChange = async (filter: 'ALL' | 'GOING' | 'MAYBE' | 'NOT_GOING') => {
    setGuestFilter(filter);
    if (selectedEventForGuests) {
      if (filter === 'ALL') {
        await loadGuests(selectedEventForGuests.id);
      } else {
        await loadGuests(selectedEventForGuests.id, filter);
      }
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews: string[] = [];
    const newFiles: File[] = [...selectedMedia];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === files.length) {
            setMediaPreviews([...mediaPreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        newFiles.push(file);
        newPreviews.push('');
      }
    });

    setSelectedMedia(newFiles);
    setMediaCaptions([...mediaCaptions, ...files.map(() => '')]);
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
    setMediaCaptions(mediaCaptions.filter((_, i) => i !== index));
  };

  const updateMediaCaption = (index: number, caption: string) => {
    const newCaptions = [...mediaCaptions];
    newCaptions[index] = caption;
    setMediaCaptions(newCaptions);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isEventCreator = (event: Event) => {
    if (eventFilter === 'myevents') return true;
    if (!currentUserIdNum) return false;

    let creatorId: number | null = null;

    if (typeof event.created_by === 'object' && event.created_by !== null) {
      creatorId = (event.created_by as any).id || (event.created_by as any).user || (event.created_by as any).user_id;
    } else if (typeof event.created_by === 'string') {
      creatorId = parseInt(event.created_by, 10);
    } else if (typeof event.created_by === 'number') {
      creatorId = event.created_by;
    }

    return currentUserIdNum === creatorId;
  };

  const handleEditEvent = (event: Event) => {
    try {
      setEditingEvent(event);
      setEditTitle(event.title || '');
      setEditDescription(event.description || '');

      let dateValue = '';
      if (typeof event.start_date === 'string' && event.start_date.length >= 16) {
        dateValue = event.start_date.slice(0, 16);
      } else if (event.start_date) {
        try {
          const date = new Date(event.start_date);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString().slice(0, 16);
          }
        } catch (e) {
          console.error('Date parsing error:', e);
        }
      }
      setEditDate(dateValue);
      setEditLocation(event.location_name || '');

      let typeId: number | '' = '';
      if (event.event_type && typeof event.event_type === 'object') {
        typeId = (event.event_type as any).id || '';
      } else {
        typeId = (event.event_type as any) || '';
      }
      setEditEventType(typeId as number);

      let visibilityId: number | '' = '';
      if (event.visibility && typeof event.visibility === 'object') {
        visibilityId = (event.visibility as any).id || '';
      } else {
        visibilityId = (event.visibility as any) || '';
      }
      setEditVisibility(visibilityId);

      setEditImagePreview(event.cover_image_url ? getFullImageUrl(event.cover_image_url) : '');
      setShowEditModal(true);
    } catch (error) {
      console.error('Error in handleEditEvent:', error);
      setSuccessMessage('Failed to open edit modal. Please try again.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      setPosting(true);

      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      formData.append('start_date', new Date(editDate).toISOString());
      formData.append('event_type', editEventType.toString());

      if (editLocation) {
        formData.append('location_name', editLocation);
      }

      if (editImage) {
        formData.append('cover_image', editImage);
      }

      if (editVisibility) {
        formData.append('visibility', editVisibility.toString());
      }

      await eventService.updateEvent(editingEvent.id, formData);

      setSuccessMessage(`✨ "${editTitle}" updated successfully!`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      setShowEditModal(false);
      setEditingEvent(null);
      setEditTitle('');
      setEditDescription('');
      setEditDate('');
      setEditLocation('');
      setEditEventType('');
      setTempEventTypeTitle('');
      setEditImage(null);
      setEditImagePreview('');

      loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    setEventToDeleteId(eventId);
    setShowDeleteModal(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDeleteId) return;

    try {
      setDeletingEvent(eventToDeleteId);
      await eventService.deleteEvent(eventToDeleteId);

      setSuccessMessage(`✨ Event deleted successfully!`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      loadEvents();
      setShowDeleteModal(false);
      setEventToDeleteId(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setDeletingEvent(null);
    }
  };

  const handleCreateEventType = async () => {
    if (!newEventType.trim()) return;

    try {
      setCreatingEventType(true);
      const created = await eventService.createEventType({
        title: newEventType,
        is_public: true
      });
      setEventTypes(prev => [...prev, created]);
      setEventType(created.id);
      setTempEventTypeTitle(newEventType);
      setSuccessMessage(`✨ "${newEventType}" created successfully!`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setNewEventType('');
      setShowEventTypeDropdown(false);
      await loadEventTypes();
    } catch (error) {
      console.error('Failed to create event type:', error);
    } finally {
      setCreatingEventType(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'posts') {
      if (!postContent.trim() && selectedMedia.length === 0) return;

      try {
        setPosting(true);
        const formData = new FormData();
        formData.append('content', postContent);
        formData.append('visibility', postVisibility);

        selectedMedia.forEach((file, index) => {
          formData.append('media', file);
          formData.append('media_captions', mediaCaptions[index] || "");
        });

        await postService.createPost(formData);

        setPostContent('');
        setSelectedMedia([]);
        setMediaPreviews([]);
        setMediaCaptions([]);
        loadPosts();

        setSuccessMessage(`✨ Post created successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } catch (error) {
        console.error('Failed to create post:', error);
      } finally {
        setPosting(false);
      }
    } else {
      try {
        setPosting(true);
        const formData = new FormData();
        formData.append('title', eventTitle);
        formData.append('description', eventDescription);
        if (eventDate) {
          formData.append('start_date', new Date(eventDate).toISOString());
        }
        if (eventType) {
          formData.append('event_type', eventType.toString());
        }
        if (eventLocation) {
          formData.append('location_name', eventLocation);
        }
        if (selectedMedia[0]) {
          formData.append('cover_image', selectedMedia[0]);
        }

        await eventService.createEvent(formData);

        const selectedType = eventTypes.find(t => t.id === eventType);
        setSuccessMessage(`✨ "${eventTitle}" event created successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        setEventTitle('');
        setEventDescription('');
        setEventDate('');
        setEventLocation('');
        setEventType('');
        setTempEventTypeTitle('');
        setSelectedMedia([]);
        setMediaPreviews([]);
        setMediaCaptions([]);

        loadEvents();
      } catch (error) {
        console.error('Failed to create event:', error);
      } finally {
        setPosting(false);
      }
    }
  };

  const handleRSVP = async (eventId: number, response: 'GOING' | 'MAYBE' | 'NOT_GOING') => {
    try {
      setRsvpLoading(prev => ({ ...prev, [eventId]: true }));
      const rsvpData: RSVPData = { response, guests_count: 0 };
      await eventService.rsvpToEvent(eventId, rsvpData);
      setEvents(events.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            user_rsvp: { response, guests_count: 0 },
            rsvp_going: response === 'GOING' ? event.rsvp_going + 1 : event.rsvp_going,
            rsvp_maybe: response === 'MAYBE' ? event.rsvp_maybe + 1 : event.rsvp_maybe,
            rsvp_not_going: response === 'NOT_GOING' ? event.rsvp_not_going + 1 : event.rsvp_not_going
          };
        }
        return event;
      }));
    } catch (error) {
      console.error('Failed to RSVP:', error);
    } finally {
      setRsvpLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCancelRSVP = async (eventId: number) => {
    try {
      setRsvpLoading(prev => ({ ...prev, [eventId]: true }));
      await eventService.cancelRSVP(eventId);
      setEvents(events.map(event => {
        if (event.id === eventId) {
          const updatedEvent = { ...event, user_rsvp: undefined };
          if (event.user_rsvp?.response === 'GOING') {
            updatedEvent.rsvp_going = event.rsvp_going - 1;
          } else if (event.user_rsvp?.response === 'MAYBE') {
            updatedEvent.rsvp_maybe = event.rsvp_maybe - 1;
          } else if (event.user_rsvp?.response === 'NOT_GOING') {
            updatedEvent.rsvp_not_going = event.rsvp_not_going - 1;
          }
          return updatedEvent;
        }
        return event;
      }));
    } catch (error) {
      console.error('Failed to cancel RSVP:', error);
    } finally {
      setRsvpLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handlePostLike = (postId: number, data: any) => {
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            user_interaction: { 
              ...post.user_interaction, 
              is_liked: data.is_liked 
            },
            engagement: {
              ...post.engagement,
              likes_count: data.likes_count
            }
          }
        : post
    ));
  };

  const handlePostSave = (postId: number, data: any) => {
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            user_interaction: { 
              ...post.user_interaction, 
              is_saved: data.is_saved 
            }
          }
        : post
    ));
  };

  const handlePostShare = (postId: number) => {
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            engagement: {
              ...post.engagement,
              shares_count: (post.engagement?.shares_count || 0) + 1
            }
          }
        : post
    ));
  };

  const handlePostReport = (postId: number, reason: string, description: string) => {
    console.log('Post reported:', postId, reason, description);
  };

  const handlePostDeleted = (postId: number) => {
    setPosts(posts.filter(post => post.id !== postId));
    setSuccessMessage('Post deleted successfully');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts(posts.map(post =>
      post.id === updatedPost.id ? updatedPost : post
    ));
    setSuccessMessage('Post updated successfully');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const toggleEventComments = async (eventId: number) => {
    const isShowing = !showComments[eventId];
    setShowComments({ ...showComments, [eventId]: isShowing });
    if (isShowing) {
      await loadEventComments(eventId);
    }
  };

  const loadEventComments = async (eventId: number) => {
    try {
      setLoadingEventComments(prev => ({ ...prev, [eventId]: true }));
      const response = await eventService.getComments(eventId);
      setEventComments(prev => ({ ...prev, [eventId]: Array.isArray(response) ? response : [] }));
    } catch (error) {
      console.error(`Failed to load comments for event ${eventId}:`, error);
    } finally {
      setLoadingEventComments(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleAddEventComment = async (eventId: number) => {
    const content = commentInputs[eventId];
    if (!content?.trim()) return;
    try {
      await eventService.addComment(eventId, content);
      setCommentInputs({ ...commentInputs, [eventId]: '' });
      await loadEventComments(eventId);
      loadEvents();
    } catch (error) {
      console.error('Failed to add event comment:', error);
    }
  };

  const handleUpdateEventComment = async (eventId: number, commentId: number, content: string) => {
    if (!content.trim()) return;
    try {
      await eventService.updateComment(eventId, commentId, content);
      setEditingComment(null);
      await loadEventComments(eventId);
    } catch (error) {
      console.error('Failed to update event comment:', error);
    }
  };

  const handleDeleteEventComment = async (eventId: number, commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await eventService.deleteComment(eventId, commentId);
      await loadEventComments(eventId);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event comment:', error);
    }
  };

  const handleReplyToComment = async (eventId: number, commentId: number, content: string) => {
    if (!content.trim()) return;
    try {
      await eventService.replyToComment(eventId, commentId, content);
      setReplyingToComment(null);
      setCommentInputs({ ...commentInputs, [`reply-${commentId}`]: '' });
      await loadEventComments(eventId);
      loadEvents();
    } catch (error) {
      console.error('Failed to reply to comment:', error);
    }
  };

  const handleReportEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToReportId) return;
    try {
      setSendingReport(true);
      await eventService.flagEvent(eventToReportId, reportReason, reportDescription);
      setShowReportSuccess(true);
      setTimeout(() => setShowReportSuccess(false), 3000);
      setShowReportModal(false);
      setEventToReportId(null);
      setReportReason('INAPPROPRIATE');
      setReportDescription('');
    } catch (error) {
      console.error('Failed to report event:', error);
    } finally {
      setSendingReport(false);
    }
  };

  const toggleEventDetails = (eventId: number) => {
    setShowEventDetails({ ...showEventDetails, [eventId]: !showEventDetails[eventId] });
  };

  const getVisibilityIcon = (code: string) => {
    switch (code?.toUpperCase()) {
      case 'PUBLIC': return <Globe className="h-4 w-4" />;
      case 'PRIVATE': return <Lock className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getRSVPButtonClass = (event: Event, responseType: string) => {
    const baseClass = "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-1";

    if (event.user_rsvp?.response === responseType) {
      switch (responseType) {
        case 'GOING':
          return `${baseClass} bg-green-100 text-green-700 border-2 border-green-300 shadow-sm`;
        case 'MAYBE':
          return `${baseClass} bg-yellow-100 text-yellow-700 border-2 border-yellow-300 shadow-sm`;
        case 'NOT_GOING':
          return `${baseClass} bg-red-100 text-red-700 border-2 border-red-300 shadow-sm`;
      }
    }

    return `${baseClass} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-sm transition-all`;
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${BASE_URL}${cleanUrl}`;
  };

  const getResponseColor = (response: string) => {
    switch (response) {
      case 'GOING': return 'bg-green-50 text-green-700 border-green-200';
      case 'MAYBE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'NOT_GOING': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading && activeTab === 'posts') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">

          {/* Sidebar - Navigation Links */}
          <div className="hidden lg:block lg:col-span-3 sticky top-28 self-start h-[calc(100vh-7.5rem)] overflow-y-auto no-scrollbar pb-10 space-y-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-amber-100">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-linear-to-r from-amber-500 to-orange-500 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative w-20 h-20 bg-linear-to-br from-amber-600 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden border-2 border-white">
                    {profile?.image ? (
                      <img
                        src={typeof profile.image === 'string' ? getFullImageUrl(profile.image) : ''}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile?.firstname?.charAt(0) || <User className="h-10 w-10" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {profile?.firstname ? `${profile.firstname} ${profile.lastname || ''}` : 'Loading...'}
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full mt-2 py-2 px-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors border border-amber-100"
                >
                  View Profile
                </button>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-amber-100 space-y-1">
              <SidebarLink icon={<Home className="h-5 w-5" />} label="Home Feed" active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
              <SidebarLink icon={<Users className="h-5 w-5" />} label="My Connections" onClick={() => navigate('/connections')} />
              <SidebarLink icon={<MessageCircle className="h-5 w-5" />} label="Messenger" onClick={() => navigate('/chat')} />
              <SidebarLink icon={<Sparkles className="h-5 w-5" />} label="Genealogy" onClick={() => navigate('/genealogy')} />
              <hr className="my-2 border-amber-50" />
              <SidebarLink icon={<Calendar className="h-5 w-5" />} label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            </div>
          </div>

          {/* Main Content Column */}
          <div className="lg:col-span-6 space-y-6">

            {/* Success Message Toast */}
            {showSuccessMessage && (
              <div className="fixed top-28 right-4 z-110 animate-slide-in">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl p-4 flex items-center space-x-3 backdrop-blur-md">
                  <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-amber-900 font-bold">Success!</p>
                    <p className="text-amber-800 text-sm font-medium">{successMessage}</p>
                  </div>
                  <button onClick={() => setShowSuccessMessage(false)} className="text-amber-400 hover:text-amber-600 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Report Success Toast */}
            {showReportSuccess && (
              <div className="fixed top-28 right-4 z-110 animate-slide-in">
                <div className="bg-green-50 border border-green-200 rounded-2xl shadow-2xl p-4 flex items-center space-x-3 backdrop-blur-md">
                  <div className="w-10 h-10 bg-linear-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-green-900 font-bold">Success!</p>
                    <p className="text-green-800 text-sm font-medium">Report sent successfully</p>
                  </div>
                  <button onClick={() => setShowReportSuccess(false)} className="text-green-400 hover:text-green-600 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Edit Event Modal */}
            {showEditModal && editingEvent && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-120 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="bg-linear-to-r from-amber-600 via-orange-500 to-yellow-500 p-6 text-white sticky top-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                          <Edit2 className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold">Edit Event</h2>
                      </div>
                      <button
                        onClick={() => setShowEditModal(false)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateEvent} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date & Time <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl">
                          <Clock className="h-5 w-5 text-purple-400" />
                          <input
                            type="datetime-local"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="flex-1 bg-transparent focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <div className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl">
                          <MapPin className="h-5 w-5 text-purple-400" />
                          <input
                            type="text"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            className="flex-1 bg-transparent focus:outline-none"
                            placeholder="Add venue or online link"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Event Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editEventType}
                          onChange={(e) => setEditEventType(Number(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          required
                        >
                          <option value="">Select event type</option>
                          {eventTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Visibility <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editVisibility}
                          onChange={(e) => setEditVisibility(Number(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          required
                        >
                          <option value="">Select visibility</option>
                          <option value="1">Public (Everyone can see)</option>
                          <option value="2">Private (Only me)</option>
                          <option value="3">Connections (Only relatives)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cover Image
                      </label>
                      {editImagePreview && (
                        <div className="relative mb-3">
                          <img src={editImagePreview} alt="Cover" className="w-full h-40 object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              setEditImage(null);
                              setEditImagePreview('');
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-amber-50">
                        <div className="flex flex-col items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Click to upload new cover image</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={posting || !editTitle.trim() || !editDescription.trim() || !editDate || !editEventType}
                        className="px-6 py-2 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 flex items-center shadow-lg"
                      >
                        {posting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Update Event
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-130 p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Event?</h3>
                    <p className="text-gray-500 mb-6">
                      Are you sure you want to delete this event? This action cannot be undone and all data will be permanently removed.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setEventToDeleteId(null);
                        }}
                        className="flex-1 px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                      >
                        No, Keep it
                      </button>
                      <button
                        onClick={confirmDeleteEvent}
                        disabled={!!deletingEvent}
                        className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center disabled:opacity-50"
                      >
                        {deletingEvent ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          'Yes, Delete'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guest List Modal */}
            {showGuestModal && selectedEventForGuests && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-120 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
                  <div className="bg-linear-to-r from-amber-600 via-orange-500 to-yellow-500 p-6 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Users className="h-6 w-6" />
                          </div>
                          <h2 className="text-2xl font-bold">Guest List</h2>
                        </div>
                        <p className="text-white/90 text-lg font-medium">{selectedEventForGuests.title}</p>
                        <div className="flex items-center space-x-4 mt-3 text-sm">
                          <span className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(selectedEventForGuests.start_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                            <MapPin className="h-3 w-3 mr-1" />
                            {selectedEventForGuests.location_name || 'Location TBD'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowGuestModal(false)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGuestFilterChange('ALL')}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${guestFilter === 'ALL'
                          ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-lg transform scale-105'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        <List className="h-4 w-4" />
                        <span>All</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${guestFilter === 'ALL' ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                          {guestStats.total}
                        </span>
                      </button>
                      <button
                        onClick={() => handleGuestFilterChange('GOING')}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${guestFilter === 'GOING'
                          ? 'bg-green-600 text-white shadow-md transform scale-105'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                          }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Going</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${guestFilter === 'GOING' ? 'bg-white/20' : 'bg-green-200'
                          }`}>
                          {guestStats.going}
                        </span>
                      </button>
                      <button
                        onClick={() => handleGuestFilterChange('MAYBE')}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${guestFilter === 'MAYBE'
                          ? 'bg-yellow-600 text-white shadow-md transform scale-105'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                          }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Maybe</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${guestFilter === 'MAYBE' ? 'bg-white/20' : 'bg-yellow-200'
                          }`}>
                          {guestStats.maybe}
                        </span>
                      </button>
                      <button
                        onClick={() => handleGuestFilterChange('NOT_GOING')}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${guestFilter === 'NOT_GOING'
                          ? 'bg-red-600 text-white shadow-md transform scale-105'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Not Going</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${guestFilter === 'NOT_GOING' ? 'bg-white/20' : 'bg-red-200'
                          }`}>
                          {guestStats.notGoing}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {loadingGuests ? (
                      <div className="text-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-amber-600" />
                        <p className="text-gray-500 mt-4 font-medium">Loading guest list...</p>
                      </div>
                    ) : guests.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-24 h-24 bg-linear-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-12 w-12 text-amber-400" />
                        </div>
                        <p className="text-gray-700 text-lg font-medium">No guests found</p>
                        <p className="text-gray-500 text-sm mt-2">
                          {guestFilter === 'ALL'
                            ? 'No one has responded to this event yet'
                            : `No guests with "${guestFilter}" response`}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {guests.map((guest) => (
                          <div
                            key={guest.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`relative ${guest.response === 'GOING' ? 'bg-linear-to-br from-green-400 to-green-600' :
                                guest.response === 'MAYBE' ? 'bg-linear-to-br from-yellow-400 to-yellow-600' :
                                  'bg-linear-to-br from-red-400 to-red-600'
                                } p-3 rounded-xl text-white shadow-md`}>
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                                      {guest.user_full_name || guest.full_name || guest.user_name}
                                    </h4>
                                    <p className="text-xs text-gray-500">{guest.user_name}</p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getResponseColor(guest.response)}`}>
                                    {guest.response}
                                  </span>
                                </div>

                                {guest.guests_count > 0 && (
                                  <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-xs font-medium text-amber-700 mb-1">Plus {guest.guests_count} guest{guest.guests_count > 1 ? 's' : ''}</p>
                                    {guest.guest_names && (
                                      <p className="text-xs text-gray-600 flex items-center">
                                        <Users className="h-3 w-3 mr-1 text-amber-500" />
                                        {guest.guest_names}
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="mt-2 space-y-1">
                                  {guest.dietary_restrictions && (
                                    <p className="text-xs text-orange-600 flex items-center">
                                      <Coffee className="h-3 w-3 mr-1" />
                                      {guest.dietary_restrictions}
                                    </p>
                                  )}
                                  {guest.notes && (
                                    <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg">
                                      "{guest.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Showing {guests.length} of {guestStats.total} responses
                    </div>
                    <button
                      onClick={() => setShowGuestModal(false)}
                      className="px-6 py-2 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Report Event Modal */}
            {showReportModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-130 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in flex flex-col">
                  <div className="bg-linear-to-r from-red-500 to-orange-500 p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Flag className="h-5 w-5" />
                        <h2 className="text-xl font-bold">Report Event</h2>
                      </div>
                      <button
                        onClick={() => {
                          setShowReportModal(false);
                          setEventToReportId(null);
                        }}
                        className="p-1 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleReportEvent} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for reporting <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="INAPPROPRIATE">Inappropriate content</option>
                        <option value="SPAM">Spam</option>
                        <option value="WRONG_VISIBILITY">Wrong visibility settings</option>
                        <option value="HARASSMENT">Harassment</option>
                        <option value="FAKE">Fake event</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional details (Optional)
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
                        rows={3}
                        placeholder="Please provide more context..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReportModal(false);
                          setEventToReportId(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={sendingReport}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center font-medium shadow-md"
                      >
                        {sendingReport ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          'Submit Report'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Create Post/Event Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100 overflow-hidden hover:shadow-2xl transition-shadow">

              {/* Main Tabs */}
              <div className="flex border-b border-amber-100 bg-white/50 px-6 pt-2">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`relative flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'posts'
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <span>{language === 'ta' ? '📝 பதிவுகள்' : '📝 Posts'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`relative flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'events'
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{language === 'ta' ? '🎉 நிகழ்வுகள்' : '🎉 Events'}</span>
                </button>
              </div>

              {/* Posts Tab Content */}
              {activeTab === 'posts' && (
                <form onSubmit={handleCreatePost} className="p-6">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-gray-50 hover:bg-white transition-colors"
                    placeholder={language === 'ta' ? 'உங்கள் மனதில் என்ன இருக்கிறது? உங்கள் எண்ணங்களைப் பகிர்ந்து கொள்ளுங்கள்...' : "What's on your mind? Share your thoughts..."}
                    rows={3}
                  />

                  {/* Media Previews */}
                  {mediaPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          {preview ? (
                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400" />
                              <span className="text-xs text-gray-500 ml-2">{selectedMedia[index]?.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <input
                            type="text"
                            value={mediaCaptions[index]}
                            onChange={(e) => updateMediaCaption(index, e.target.value)}
                            placeholder="Add caption..."
                            className="absolute bottom-2 left-2 right-2 px-2 py-1 text-xs bg-black/50 text-white rounded-lg focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Visibility Selector */}
                  <div className="mt-4 flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Visibility:</label>
                    <select
                      value={postVisibility}
                      onChange={(e) => setPostVisibility(e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="public">🌍 Public</option>
                      <option value="connections">👥 Connections</option>
                      {/* <option value="custom">🔒 Custom</option> */}
                    </select>
                  </div>

                  {/* Media Upload */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('photos')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${activeMediaTab === 'photos'
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-sm font-medium">Photos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('videos')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${activeMediaTab === 'videos'
                          ? 'bg-red-50 text-red-600 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Video className="h-5 w-5" />
                        <span className="text-sm font-medium">Videos</span>
                      </button>
                    </div>

                    <div className="mt-4">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="h-8 w-8 text-gray-400 group-hover:text-amber-500 mb-2 transition-colors" />
                          <p className="text-sm text-gray-500 group-hover:text-amber-600">
                            Click to upload photos/videos
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Up to 10 files</p>
                        </div>
                        <input
                          type="file"
                          accept={activeMediaTab === 'photos' ? 'image/*' : 'video/*'}
                          multiple
                          onChange={handleMediaSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={posting || (!postContent.trim() && selectedMedia.length === 0)}
                      className="px-6 py-2 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl"
                    >
                      {posting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Share Post
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Events Tab Content */}
              {activeTab === 'events' && (
                <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                      placeholder="e.g., Birthday Party, Wedding, Family Gathering"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-gray-50 hover:bg-white transition-colors"
                      placeholder="Tell people about your event..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date & Time <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition-colors">
                        <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                        <input
                          type="datetime-local"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="flex-1 bg-transparent focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <div className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition-colors">
                        <MapPin className="h-5 w-5 text-amber-400 shrink-0" />
                        <input
                          type="text"
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          className="flex-1 bg-transparent focus:outline-none"
                          placeholder="Add venue or online link"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center">
                        <Tag className="h-4 w-4 mr-1 text-amber-500" />
                        Event Type <span className="text-red-500 ml-1">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition-colors text-left flex items-center justify-between group"
                      >
                        <span className="flex items-center">
                          {eventType || tempEventTypeTitle ? (
                            <>
                              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                              <span className="font-medium text-gray-900">
                                {tempEventTypeTitle
                                  ? tempEventTypeTitle
                                  : eventType
                                    ? eventTypes.find(t => t.id === eventType)?.title || 'Select type'
                                    : 'Select type'
                                }
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">Choose event type</span>
                          )}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform group-hover:text-amber-500 ${showEventTypeDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showEventTypeDropdown && (
                        <div className="absolute z-20 mt-2 w-full bg-white border border-amber-100 rounded-xl shadow-xl max-h-80 overflow-hidden">
                          <div className="p-3 border-b border-amber-100 bg-linear-to-r from-amber-50 to-orange-50">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newEventType}
                                onChange={(e) => setNewEventType(e.target.value)}
                                placeholder="Search or create new type..."
                                className="flex-1 px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleCreateEventType}
                                disabled={creatingEventType || !newEventType.trim()}
                                className="px-4 py-2 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md text-sm font-medium"
                              >
                                {creatingEventType ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Create
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {eventTypes.length > 0 && (
                            <div className="p-2 border-b border-gray-100 bg-gray-50">
                              <p className="text-xs font-medium text-gray-500 px-2 mb-1">POPULAR TYPES</p>
                              <div className="flex flex-wrap gap-1">
                                {eventTypes.slice(0, 5).map(type => (
                                  <button
                                    key={type.id}
                                    onClick={() => {
                                      setEventType(type.id);
                                      setTempEventTypeTitle('');
                                      setNewEventType('');
                                      setShowEventTypeDropdown(false);
                                    }}
                                    className="px-3 py-1 bg-white border border-amber-200 text-amber-700 rounded-full text-xs hover:bg-amber-50 transition-colors"
                                  >
                                    {type.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="max-h-48 overflow-y-auto">
                            {loadingEventTypes ? (
                              <div className="p-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-600" />
                                <p className="text-sm text-gray-500 mt-2">Loading types...</p>
                              </div>
                            ) : eventTypes.length === 0 ? (
                              <div className="p-8 text-center">
                                <Tag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No event types yet</p>
                                <p className="text-xs text-gray-400">Create your first type above</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {eventTypes.map(type => (
                                  <button
                                    key={type.id}
                                    onClick={() => {
                                      setEventType(type.id);
                                      setTempEventTypeTitle('');
                                      setNewEventType('');
                                      setShowEventTypeDropdown(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center justify-between group ${eventType === type.id ? 'bg-amber-50' : ''
                                      }`}
                                  >
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-linear-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center mr-3">
                                        <Tag className="h-4 w-4 text-amber-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{type.title}</p>
                                        <p className="text-xs text-gray-500">Used {type.usage_count} times</p>
                                      </div>
                                    </div>
                                    {eventType === type.id && (
                                      <Check className="h-4 w-4 text-amber-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center">
                        <Camera className="h-4 w-4 mr-1 text-amber-500" />
                        Cover Image
                      </span>
                    </label>
                    {mediaPreviews[0] ? (
                      <div className="relative group">
                        <img src={mediaPreviews[0]} alt="Cover preview" className="w-full h-48 object-cover rounded-xl shadow-md" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMedia([]);
                            setMediaPreviews([]);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="h-8 w-8 text-gray-400 group-hover:text-amber-500 mb-2 transition-colors" />
                          <p className="text-sm text-gray-500 group-hover:text-amber-600">Click to upload cover image</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMediaSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={posting || !eventTitle.trim() || !eventDescription.trim() || !eventDate || eventType === ''}
                      className="px-6 py-2 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl"
                    >
                      {posting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Creating Event...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Create Event
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Event Filter Tabs */}
            {activeTab === 'events' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-2 flex flex-wrap gap-2 border border-amber-100">
                <button
                  onClick={() => setEventFilter('all')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'all'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <List className="h-4 w-4 inline mr-1" />
                  All Events
                </button>
                <button
                  onClick={() => setEventFilter('upcoming')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'upcoming'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  📅 Upcoming
                </button>
                <button
                  onClick={() => setEventFilter('past')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'past'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  ⏰ Past
                </button>
                <button
                  onClick={() => setEventFilter('myevents')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'myevents'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  ✨ My Events
                </button>
                <button
                  onClick={() => setEventFilter('myrsvps')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'myrsvps'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  📋 My RSVPs
                </button>
                <button
                  onClick={() => setEventFilter('myreplies')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${eventFilter === 'myreplies'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  💬 My Replies
                </button>
              </div>
            )}

            {/* Post Filter Tabs */}
            {activeTab === 'posts' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-2 flex flex-wrap gap-2 border border-amber-100 mb-6">
                <button
                  onClick={() => setPostFilter('all')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${postFilter === 'all'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <List className="h-4 w-4 inline mr-1" />
                  All Posts
                </button>
                <button
                  onClick={() => setPostFilter('myposts')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${postFilter === 'myposts'
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  My Posts
                </button>
              </div>
            )}

            {/* Content Feed */}
            {activeTab === 'posts' ? (
              /* Posts Feed - Using the Post component */
              posts.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100">
                  <div className="w-20 h-20 bg-linear-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-amber-500" />
                  </div>
                  <p className="text-gray-700 text-lg font-medium">No posts yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {postFilter === 'myposts' ? "You haven't shared any posts yet." : "Be the first to share something!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <Post
                      key={post.id}
                      post={post}
                      onLike={handlePostLike}
                      onSave={handlePostSave}
                      onShare={handlePostShare}
                      onReport={handlePostReport}
                      onCommentAdded={() => fetchAndUpdatePost(post.id)}
                      onPostDeleted={handlePostDeleted}
                      onPostUpdated={handlePostUpdated}
                      currentUser={profile}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Events Feed */
              eventsLoading ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100">
                  <Loader2 className="h-12 w-12 text-amber-600 animate-spin mx-auto" />
                  <p className="text-gray-600 mt-4 font-medium">Loading amazing events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100">
                  <div className="w-20 h-20 bg-linear-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-10 w-10 text-amber-500" />
                  </div>
                  <p className="text-gray-700 text-lg font-medium">No events found</p>
                  <p className="text-gray-500 text-sm mt-2">Create your first event and start the party! 🎉</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100 overflow-hidden hover:shadow-2xl transition-all">
                    {/* Event Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{event.created_by_name}</h3>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-500 flex items-center">
                                {new Date(event.created_at).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                                <span className="mx-2">•</span>
                                <span className="flex items-center text-amber-600">
                                  {getVisibilityIcon(event.visibility_name)}
                                  <span className="ml-1 text-xs font-medium">{event.visibility_name || 'Default'}</span>
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {eventFilter === 'myevents' && (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${event.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' :
                              event.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                event.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                  'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                              {event.status}
                            </span>
                          )}

                          {eventFilter === 'myevents' && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEventMenu(activeEventMenu === event.id ? null : event.id);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>

                              {activeEventMenu === event.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-scale-in py-1">
                                  <button
                                    onClick={() => {
                                      handleEditEvent(event);
                                      setActiveEventMenu(null);
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    <span>Edit Event</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteEvent(event.id);
                                      setActiveEventMenu(null);
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete Event</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {eventFilter === 'myevents' && (
                        <button
                          onClick={() => handleViewGuests(event)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center border shadow-sm hover:shadow-md ${isEventCreator(event)
                            ? 'bg-linear-to-r from-amber-100 to-orange-100 text-amber-700 hover:from-amber-200 hover:to-orange-200 border-amber-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                            }`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          <span>View Guests</span>
                          <span className="ml-1.5 px-1.5 py-0.5 bg-white rounded-full text-[10px] font-bold text-amber-600">
                            {event.rsvp_going + event.rsvp_maybe + event.rsvp_not_going}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="p-6 pt-0">
                      <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>
                        <p className="text-gray-600 mb-4 leading-relaxed">{event.description}</p>

                        <div className="space-y-2 text-sm bg-amber-50/50 p-3 rounded-xl">
                          <div className="flex items-center text-gray-700">
                            <Clock className="h-4 w-4 mr-2 text-amber-500" />
                            <span className="font-medium">{eventHelpers.formatEventDate(event.start_date, event.end_date, event.is_all_day)}</span>
                          </div>

                          {event.location_name && (
                            <div className="flex items-center text-gray-700">
                              <MapPin className="h-4 w-4 mr-2 text-amber-500" />
                              <span className="font-medium">{event.location_name}{event.city ? `, ${event.city}` : ''}</span>
                            </div>
                          )}

                          {event.event_type_title && (
                            <div className="flex items-center">
                              <Tag className="h-4 w-4 mr-2 text-purple-500" />
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                {event.event_type_title}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {event.cover_image_url && (
                        <div className="mb-4 rounded-xl overflow-hidden shadow-md">
                          <img
                            src={getFullImageUrl(event.cover_image_url)}
                            alt={event.title}
                            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center bg-green-50 px-3 py-1.5 rounded-full">
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            <span className="font-bold">{event.rsvp_going}</span>
                          </span>
                          <span className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full">
                            <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
                            <span className="font-bold">{event.rsvp_maybe}</span>
                          </span>
                          <span className="flex items-center bg-red-50 px-3 py-1.5 rounded-full">
                            <XCircle className="h-4 w-4 mr-1 text-red-500" />
                            <span className="font-bold">{event.rsvp_not_going}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-gray-400">
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="font-medium">{event.view_count || 0}</span>
                          </div>
                          <button
                            onClick={() => toggleEventComments(event.id)}
                            className="flex items-center text-gray-500 hover:text-amber-600 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            <span className="font-medium">{event.comment_count || event.comments_count || 0}</span>
                          </button>

                          <button
                            onClick={() => {
                              setEventToReportId(event.id);
                              setShowReportModal(true);
                            }}
                            className="flex items-center text-gray-400 hover:text-red-500 transition-colors ml-4"
                          >
                            <Flag className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {new Date(event.start_date) > new Date() && (
                        <div className="flex items-center space-x-2 mb-4">
                          <button
                            onClick={() => handleRSVP(event.id, 'GOING')}
                            disabled={rsvpLoading[event.id]}
                            className={getRSVPButtonClass(event, 'GOING')}
                          >
                            {rsvpLoading[event.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Going</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRSVP(event.id, 'MAYBE')}
                            disabled={rsvpLoading[event.id]}
                            className={getRSVPButtonClass(event, 'MAYBE')}
                          >
                            {rsvpLoading[event.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4" />
                                <span>Maybe</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => event.user_rsvp ? handleCancelRSVP(event.id) : handleRSVP(event.id, 'NOT_GOING')}
                            disabled={rsvpLoading[event.id]}
                            className={getRSVPButtonClass(event, 'NOT_GOING')}
                          >
                            {rsvpLoading[event.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                <span>
                                  {event.user_rsvp?.response === 'NOT_GOING' ? 'Cancel' : 'Not Going'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {showComments[event.id] && (
                        <div className="mt-4 border-t border-gray-100 pt-6 animate-scale-in">
                          <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                            <MessageCircle className="h-5 w-5 mr-2 text-amber-500" />
                            Comments ({event.comment_count || event.comments_count || 0})
                          </h4>

                          <div className="flex items-start space-x-3 mb-6">
                            <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-400 rounded-full flex items-center justify-center shadow-sm shrink-0">
                              <span className="text-white font-bold text-sm">
                                {profile?.firstname?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                              </span>
                            </div>
                            <div className="flex-1 relative">
                              <textarea
                                value={commentInputs[event.id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [event.id]: e.target.value })}
                                placeholder="Write a comment..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm resize-none"
                                rows={1}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = `${target.scrollHeight}px`;
                                }}
                              />
                              <button
                                onClick={() => handleAddEventComment(event.id)}
                                disabled={!commentInputs[event.id]?.trim()}
                                className="absolute right-2 bottom-2 p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-30"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {loadingEventComments[event.id] ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                              </div>
                            ) : !eventComments[event.id] || eventComments[event.id].length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-4 italic">
                                No comments yet. Be the first to comment!
                              </p>
                            ) : (
                              eventComments[event.id].map(comment => (
                                <EventCommentItem
                                  key={comment.id}
                                  comment={comment}
                                  eventId={event.id}
                                  onReply={handleReplyToComment}
                                  onEdit={handleUpdateEventComment}
                                  onDelete={handleDeleteEventComment}
                                  currentUserId={currentUserIdNum}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {showEventDetails[event.id] && (
                        <div className="mt-4 p-4 bg-linear-to-br from-amber-50 to-orange-50 rounded-xl space-y-2 border border-amber-100 animate-scale-in">
                          <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Detailed Information
                          </h4>

                          {event.is_virtual && event.virtual_link && (
                            <div className="text-sm flex items-center">
                              <span className="font-medium text-gray-700 w-24">Link:</span>
                              <a href={event.virtual_link} target="_blank" rel="noopener noreferrer"
                                className="text-amber-600 hover:underline flex-1 truncate font-bold">
                                Join Virtual Meeting
                              </a>
                            </div>
                          )}

                          <div className="text-sm flex items-center">
                            <span className="font-medium text-gray-700 w-24">Creator:</span>
                            <span className="text-gray-600 font-medium">{event.created_by_name}</span>
                          </div>

                          <div className="text-sm flex items-center">
                            <span className="font-medium text-gray-700 w-24">Type:</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                              {event.event_type_title}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 sticky top-28 self-start h-[calc(100vh-7.5rem)] overflow-y-auto no-scrollbar pb-10 space-y-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-amber-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-amber-600" />
                  Upcoming Events
                </h3>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <div className="space-y-4">
                {events.slice(0, 3).map(event => (
                  <div key={event.id} className="group p-2 rounded-xl border border-transparent hover:border-amber-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl flex flex-col items-center justify-center text-amber-700 font-bold border border-amber-200 shadow-sm">
                        <span className="text-[10px] uppercase leading-none">{new Date(event.start_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg leading-none">{new Date(event.start_date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-500 truncate flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location_name || 'Online'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs italic">No upcoming events</p>
                  </div>
                )}
                <button
                  onClick={() => { setActiveTab('events'); setEventFilter('upcoming'); }}
                  className="w-full pt-2 text-sm text-amber-700 font-bold hover:text-orange-700 transition-colors flex items-center justify-center"
                >
                  See All Events
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>

            <div className="bg-linear-to-br from-amber-700 to-orange-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <h3 className="font-bold mb-2 relative z-10 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Grow your tree
              </h3>
              <p className="text-sm text-white/80 mb-4 relative z-10">
                Connect with relatives and discover your roots across generations.
              </p>
              <button
                onClick={() => navigate('/genealogy')}
                className="w-full py-2.5 bg-white text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-50 hover:shadow-lg transition-all relative z-10 transform active:scale-95"
              >
                Go to Genealogy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar Link Component
function SidebarLink({ icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group ${active
        ? 'bg-amber-600 shadow-md text-white font-bold'
        : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
        }`}
    >
      <div className={`${active ? 'text-white' : 'text-amber-600 group-hover:text-amber-700'} transition-colors`}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

// Event Comment Item Component
function EventCommentItem({
  comment,
  eventId,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  isReply = false
}: {
  comment: EventComment;
  eventId: number;
  onReply: (eventId: number, commentId: number, content: string) => void;
  onEdit: (eventId: number, commentId: number, content: string) => void;
  onDelete: (eventId: number, commentId: number) => void;
  currentUserId: number | null;
  isReply?: boolean;
}) {
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleEditSubmit = () => {
    onEdit(eventId, comment.id, editContent);
    setIsEditing(false);
  };

  const handleReplySubmit = () => {
    onReply(eventId, comment.id, replyContent);
    setIsReplying(false);
    setReplyContent('');
  };

  return (
    <div className={`group ${isReply ? 'ml-10 mt-2' : 'mb-4'}`}>
      <div className="flex items-start space-x-2">
        <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-xs shrink-0`}>
          <span className="text-gray-600 font-bold text-xs">
            {comment.user_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
          </span>
        </div>
        <div className="flex-1 max-w-full overflow-hidden">
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2 shadow-xs group-hover:border-amber-100 transition-colors">
            <h5 className="font-bold text-gray-900 text-xs mb-0.5">{comment.user_name}</h5>
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-sm p-2 border border-amber-200 rounded-lg focus:ring-1 focus:ring-amber-500 bg-amber-50"
                  rows={2}
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-xs text-gray-500">
                    Cancel
                  </button>
                  <button onClick={handleEditSubmit} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>

          <div className="flex items-center space-x-4 mt-1 ml-2 text-[10px] font-bold text-gray-400">
            <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => setIsReplying(!isReplying)} className="hover:text-amber-600 transition-colors uppercase">
              Reply
            </button>
            {currentUserId === comment.user && (
              <>
                <button onClick={() => setIsEditing(true)} className="hover:text-blue-600 transition-colors uppercase">
                  Edit
                </button>
                <button onClick={() => onDelete(eventId, comment.id)} className="hover:text-red-600 transition-colors uppercase">
                  Delete
                </button>
              </>
            )}
          </div>

          {isReplying && (
            <div className="mt-3 flex items-start space-x-2 animate-scale-in">
              <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-xs resize-none"
                  rows={1}
                />
                <button
                  onClick={handleReplySubmit}
                  disabled={!replyContent.trim()}
                  className="absolute right-1 bottom-1 p-1 text-amber-600 hover:bg-amber-50 rounded-full disabled:opacity-30"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 border-l-2 border-gray-50">
              {comment.replies.map(reply => (
                <EventCommentItem
                  key={reply.id}
                  comment={reply}
                  eventId={eventId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add custom CSS
const style = document.createElement('style');
style.textContent = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out forwards;
  }
  .animate-scale-in {
    animation: scale-in 0.2s ease-out forwards;
  }
`;
document.head.appendChild(style);