import React from "react";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Search, Users, Loader2, MessageCircle, ArrowLeft, MoreVertical, Paperclip, Trash, Trash2, Check, CheckCheck, X, FileIcon, Download, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { chatService, Conversation, Message, User } from '../services/chatService';
import { WebSocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';
import { connectionService } from '../services/connectionService';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Define WebSocket callbacks interface
interface WebSocketCallbacks {
  onMessage: (message: Message) => void;
  onTyping: (senderId: number, isTyping: boolean) => void;
  onStatus?: (userId: number, status: string) => void;
  onError: (errorMsg: string) => void;
  onHistory: (history: Message[]) => void;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const { user, accessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group'>('all');

  // Group Chat State
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  // Block User States
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  const wsService = useRef<WebSocketService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [showMessageOptions, setShowMessageOptions] = useState<number | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberSearchText, setAddMemberSearchText] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [showHeaderOptions, setShowHeaderOptions] = useState(false);
  const [nicknames, setNicknames] = useState<Record<number, string>>({});
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [msgToDeleteId, setMsgToDeleteId] = useState<number | null>(null);
  const [showMsgDeleteModal, setShowMsgDeleteModal] = useState(false);
  const [showViewMembersModal, setShowViewMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showExitGroupModal, setShowExitGroupModal] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Prevent document-level scroll for an app-like experience
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Check for mobile number in URL parameter and start direct chat
    const urlParams = new URLSearchParams(window.location.search);
    const mobileNumber = urlParams.get('mobile');
    if (mobileNumber) {
      startDirectChatWithMobile(mobileNumber);
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Load conversations when tab changes or on mount
  useEffect(() => {
    const loadNicknames = async () => {
      try {
        const data = await chatService.getNicknames();
        const map: Record<number, string> = {};
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.contact_id && item.nickname) {
              map[item.contact_id] = item.nickname;
            }
          });
        }
        setNicknames(map);
      } catch (err) {
        console.error('Failed to load nicknames:', err);
      }
    };

    // Load everything when component mounts or activeTab changes
    loadConversations(activeTab);
    loadNicknames();

    // Always refresh blocked users from the GET api/chat/block/ endpoint
    chatService.getBlockedUsers().then(setBlockedUsers).catch(console.error);
  }, [activeTab]);

  // Mark messages as read when conversation is selected or changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setShowChatOptions(false);

      // Call markAllAsRead immediately when opening
      chatService.markAllAsRead(selectedConversation.id)
        .then(() => {
          // Update local unread count to 0 immediately
          setConversations(prev => prev.map(conv =>
            conv.id === selectedConversation.id ? { ...conv, unread_count: 0 } : conv
          ));
        })
        .catch(console.error);

      if (selectedConversation.room_type === 'direct') {
        // Reset states immediately before fetching new ones to avoid UI persistence from previous chat
        setIsBlockedByMe(false);
        setAmIBlocked(false);

        const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
        const currentUserMobile = localStorageUser?.mobile_number;
        const currentUserId = Number(user?.id || localStorageUser?.id || localStorageUser?.user_id || localStorageUser?.pk);
        const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
        const myMobile = normalizePhone(currentUserMobile);

        const targetParticipant = selectedConversation.participants.find(p => {
          const pId = Number(p.id);
          const pMobile = normalizePhone(p.mobile_number);
          const isMe = (pId !== 0 && pId === currentUserId) || (myMobile !== '' && pMobile === myMobile);
          return !isMe;
        }) || (selectedConversation.participants.length > 1 ? selectedConversation.participants[1] : selectedConversation.participants[0]);

        if (targetParticipant?.id) {
          chatService.checkBlockStatus(targetParticipant.id)
            .then((status: any) => {
              setIsBlockedByMe(status.i_blocked_them);
              setAmIBlocked(status.they_blocked_me);
            })
            .catch((err) => {
              console.error('Failed to check block status:', err);
              // Reset on error to allow messaging by default if check fails, or keep as is?
              // Better to reset to false to avoid accidentally locking out users on API failure
              setIsBlockedByMe(false);
              setAmIBlocked(false);
            });
        } else {
          setIsBlockedByMe(false);
          setAmIBlocked(false);
        }
      } else {
        // Reset block status for group chats so messaging is never restricted
        setIsBlockedByMe(false);
        setAmIBlocked(false);
      }

      // Mark as read when opening conversation
      chatService.markAllAsRead(selectedConversation.id).catch(console.error);
    }
  }, [selectedConversation, user?.id]);

  // Handle window focus to refresh messages
  useEffect(() => {
    const handleFocus = () => {
      if (selectedConversation) {
        console.log('Window focused, refreshing messages...');
        loadMessages(selectedConversation.id);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedConversation]);

  // Update message read status periodically
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const interval = setInterval(async () => {
      try {
        // Get fresh messages to check read status
        const freshMessages = await chatService.getMessages(selectedConversation.id);

        setMessages(prev => {
          return prev.map(msg => {
            const freshMsg = freshMessages.find(m => m.id === msg.id);
            // If the message was read, ensure it shows blue ticks
            if (freshMsg && freshMsg.read_at !== msg.read_at) {
              return { ...msg, read_at: freshMsg.read_at };
            }
            return msg;
          });
        });

        // Also refresh conversations to update last message status in list
        loadConversations(activeTab);
      } catch (error) {
        console.error('Error checking read status:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [selectedConversation, user, activeTab]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!selectedConversation) return;

    // Read token directly from localStorage (useAuth uses 'access_token' key but login stores as 'authToken')
    const token = accessToken || localStorage.getItem('authToken');
    if (!token) return;

    // Ensure user.id is a number, provide fallback
    const userId = user?.id || 0;

    wsService.current = new WebSocketService(
      selectedConversation.id,
      token,
      userId,
      {
        onMessage: (message: Message) => {
          // Process attachments if they exist
          const processedMessage = {
            ...message,
            attachments: message.attachments ||
              (message as any).attachment ? [(message as any).attachment] :
              (message as any).files ? (message as any).files : []
          };

          // Add delivered status for own messages sent via WebSocket
          const senderId = processedMessage.sender_id || undefined; // Use undefined as fallback
          const messageWithStatus = Number(senderId) === Number(user?.id)
            ? { ...processedMessage, sender_id: senderId, delivered_at: new Date().toISOString() }
            : { ...processedMessage, sender_id: senderId };

          setMessages(prev => [...prev, messageWithStatus as Message]);
          scrollToBottom();

          // Refresh conversation list to update last message
          loadConversations();
        },
        onTyping: (senderId: number, isTyping: boolean) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (isTyping) {
              newSet.add(senderId);
            } else {
              newSet.delete(senderId);
            }
            return newSet;
          });
        },
        onError: (errorMsg: string) => {
          setError(errorMsg);
          setTimeout(() => setError(null), 5000);
        },
        onHistory: (history: Message[]) => {
          setMessages(history);
          scrollToBottom();
        }
      } as WebSocketCallbacks
    );

    wsService.current.connect();

    return () => {
      wsService.current?.disconnect();
    };
  }, [selectedConversation, accessToken, scrollToBottom, user?.id]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count > 0) {
      chatService.markAllAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!wsService.current) return;

    if (!isTyping) {
      setIsTyping(true);
      wsService.current.sendTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (wsService.current && isTyping) {
        wsService.current.sendTyping(false);
        setIsTyping(false);
      }
    }, 1000);
  }, [isTyping]);

  // Function to start direct chat with mobile number without showing modal
  const startDirectChatWithMobile = async (mobileNumber: string) => {
    if (!mobileNumber.trim()) return;

    try {
      console.log('Starting direct chat with mobile number:', mobileNumber);

      // Use the existing handleCreateDirectChat function with the mobile number
      await handleCreateDirectChat(mobileNumber.trim());

      // Remove the mobile parameter from URL to prevent re-triggering
      const url = new URL(window.location.href);
      url.searchParams.delete('mobile');
      window.history.replaceState({}, '', url.toString());

    } catch (error) {
      console.error('Failed to start direct chat:', error);
      setError(t('failedCreateChat'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const loadConversations = async (tab?: string) => {
    try {
      // Don't set loading to true here to avoid flickering the list away
      const data = await chatService.getConversations(tab);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError(t('failedLoadConversations'));
    } finally {
      if (loading) setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      const data = await chatService.getMessages(conversationId);
      console.log('Messages loaded from API:', data.length, data);
      setMessages(data);
      // Mark messages as read when conversation is opened
      await chatService.markAsRead(conversationId);

      // Update local state to show read receipts for received messages immediately
      setMessages(prev => prev.map(msg => ({
        ...msg,
        read_at: msg.read_at || new Date().toISOString()
      })));
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError(t('failedLoadMessages'));
    }
  };

  // Load messages when conversation is selected or changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const handleEditMessage = async () => {
    if (editingMessageId === null || !editMessageContent.trim() || !selectedConversation) return;
    try {
      await chatService.editMessage(editingMessageId, editMessageContent);
      // Immediately refresh messages from server as requested
      await loadMessages(selectedConversation.id);
      setEditingMessageId(null);
      setEditMessageContent('');
      toast.success(t('messageUpdated'));
    } catch (err) {
      setError(t('failedUpdateName'));
    }
  };

  // Handle file download with tracking
  const handleDownload = async (attachmentId: number, fileName: string) => {
    try {
      await chatService.downloadAttachment(attachmentId, fileName);
      // Mark file as downloaded
      setDownloadedFiles(prev => new Set([...prev, attachmentId]));
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteMessage = async () => {
    if (msgToDeleteId === null) return;
    try {
      await chatService.deleteMessage(msgToDeleteId);
      setMessages(prev => prev.filter(m => m.id !== msgToDeleteId));
      setMsgToDeleteId(null);
      setShowMsgDeleteModal(false);
      toast.success(t('messageDeleted'));
    } catch (err) {
      setError(t('failedDeleteMessage'));
      toast.error(t('failedDeleteMessage'));
    }
  };

  const handleExitGroup = async () => {
    if (!selectedConversation) return;
    setShowExitGroupModal(true);
  };

  const confirmExitGroup = async () => {
    if (!selectedConversation) return;
    try {
      await chatService.exitGroup(selectedConversation.id);
      toast.success(t('exitedGroup'));
      loadConversations();
      setSelectedConversation(null);
      setShowExitGroupModal(false);
      setShowChatOptions(false);
    } catch (err) {
      setError(t('failedExitGroup'));
      toast.error(t('failedExitGroup'));
    }
  };

  const handleAddMember = async () => {
    if (!selectedConversation || !addMemberUserId.trim()) return;
    try {
      await chatService.addMemberToGroup(selectedConversation.id, addMemberUserId.trim());
      toast.success(t('memberAdded'));
      setAddMemberUserId('');
      setAddMemberSearchText('');
      setShowAddMemberModal(false);
      // Refresh conversation to show new member list if needed
      loadConversations();
    } catch (err: any) {
      console.error('Error adding member:', err);
      if (err.response?.data?.detail === "User not found") {
        toast.error(t('userNotFoundMobile'));
      } else {
        setError(t('failedAddMember'));
        toast.error(t('failedAddMember'));
      }
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedConversation) return;
    setRemovingMemberId(memberId);
    try {
      await api.post(`/api/chat/rooms/${selectedConversation.id}/remove-members/`, {
        member_ids: [memberId]
      });
      toast.success(t('memberRemoved'));
      // Refresh members list
      fetchGroupMembers(selectedConversation.id);
    } catch (err: any) {
      console.error('Remove member error:', err);
      setError(t('failedRemoveMember'));
      toast.error(t('failedRemoveMember'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const fetchGroupMembers = async (roomId: number) => {
    setFetchingMembers(true);
    try {
      // Hit the specific endpoint requested by user
      const response = await api.get(`/api/chat/rooms/${roomId}/members/`);
      const members = response.data.results || response.data;
      setGroupMembers(Array.isArray(members) ? members : []);
    } catch (err) {
      setError(t('failedLoadMembers'));
    } finally {
      setFetchingMembers(false);
    }
  };

  const handleSearchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Changed to the common mobile-search endpoint requested by user
      const response = await api.get(`/api/auth/api/mobile-search/?q=${query}`);
      const suggestions = response.data?.results || response.data?.suggestions || (Array.isArray(response.data) ? response.data : []);

      // Map to ensure field compatibility (label -> full_name)
      const mapped = suggestions.map((item: any) => ({
        ...item,
        full_name: item.full_name || item.label || item.name || 'User',
        mobile_number: item.mobile_number || item.value || ''
      }));

      setSearchSuggestions(mapped);
    } catch (err) {
      console.error('Suggestion search error:', err);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateNickname = async () => {
    if (!selectedConversation || !nicknameValue.trim()) return;
    try {
      const otherUser = selectedConversation.participants.find(p => p.id !== user?.id) || selectedConversation.participants[0];
      if (!otherUser) return;
      await chatService.updateContactNickname(otherUser.id, nicknameValue.trim());
      toast.success(t('nicknameUpdated'));
      setNicknameValue('');
      setShowNicknameModal(false);

      // Refresh nicknames and conversations
      const updatedNicknames = await chatService.getNicknames();
      const map: Record<number, string> = {};
      if (Array.isArray(updatedNicknames)) {
        updatedNicknames.forEach((item: any) => {
          if (item.contact_id && item.nickname) map[item.contact_id] = item.nickname;
        });
      }
      setNicknames(map);
      loadConversations(activeTab);
    } catch (err) {
      setError(t('failedUpdateName'));
      toast.error(t('failedUpdateName'));
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    try {
      await chatService.deleteConversation(selectedConversation.id);
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
      setShowChatOptions(false);
      setShowClearChatModal(false);
      toast.success(t('chatCleared'));
    } catch (err) {
      setError(t('failedClearChat'));
      toast.error(t('failedClearChat'));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (!selectedConversation) return;

    const messageContent = messageInput.trim();
    const files = selectedFiles;

    setMessageInput('');
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(true);

    try {
      // ✅ FIRST: WebSocket - only if no file
      if (wsService.current && wsService.current.isConnected() && files.length === 0) {
        wsService.current.sendMessage(messageContent);
      } else {
        throw new Error('WS not connected or file present');
      }
    } catch (wsError) {
      console.warn('WS failed or file present → using REST');

      try {
        // 🔁 Fallback REST
        const sentMessage = await chatService.sendMessage({
          conversation_id: selectedConversation.id,
          content: messageContent,
          files: files.length > 0 ? files : null
        });

        // Add message with delivered status
        const messageWithStatus = {
          ...sentMessage,
          delivered_at: new Date().toISOString()
        };

        setMessages((prev) => {
          if (!prev.find((m) => m.id === sentMessage.id)) {
            return [...prev, messageWithStatus];
          }
          return prev;
        });

        // Refresh conversation list to update last message
        loadConversations();

        // Immediately refresh messages from server after sending
        await loadMessages(selectedConversation.id);
      } catch (restError) {
        console.error('Both WS & REST failed');
        setError('Failed to send message');
        setTimeout(() => setError(null), 5000);
        setMessageInput(messageContent);
        setSelectedFiles(files);
      }
    } finally {
      setSending(false);
    }
  };

  const handleCreateDirectChat = async (identifierOverride?: string) => {
    const inputValue = (identifierOverride || newChatUserId).trim();
    if (!inputValue) {
      setError(t('pleaseEnterMobile'));
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      console.log('Creating chat with identifier:', inputValue);

      // First, try to search by mobile number if it's numeric
      let finalIdentifier = inputValue;

      if (/^\d+$/.test(inputValue)) {
        try {
          console.log('Searching by mobile number:', inputValue);
          // Changed to the common mobile-search endpoint as requested
          const searchResponse = await api.get(`/api/auth/api/mobile-search/?q=${inputValue}`);
          const suggestions = searchResponse.data?.results || searchResponse.data?.suggestions || (Array.isArray(searchResponse.data) ? searchResponse.data : []);

          if (suggestions.length > 0) {
            const matchedUser = suggestions[0];
            console.log('Found user by mobile:', matchedUser);
            finalIdentifier = matchedUser.id.toString();
            console.log('Using user ID from search:', finalIdentifier);
          }
        } catch (searchError) {
          console.log('Search failed, trying with original identifier:', searchError);
        }
      }

      const conversation = await chatService.createDirectConversation(finalIdentifier);
      console.log('Conversation created:', conversation);

      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setShowNewChatModal(false);
      setNewChatUserId('');
      setError(null);
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      setError(t('failedCreateChat'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!newGroupName.trim() || !newGroupMembers.trim()) {
      setError('Please provide a group name and a list of member IDs/Numbers');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      const memberArray = newGroupMembers.split(',').map(m => m.trim()).filter(Boolean);

      // Convert mobile numbers to user IDs
      const groupMembersList = [];
      for (const member of memberArray) {
        if (/^\d+$/.test(member)) {
          // This is a mobile number, search for user ID
          try {
            const searchResponse = await api.get(`/api/auth/api/mobile-search/?q=${member}`);
            const suggestions = searchResponse.data?.results || searchResponse.data?.suggestions || (Array.isArray(searchResponse.data) ? searchResponse.data : []);

            if (suggestions.length > 0) {
              const matchedUser = suggestions[0];
              groupMembersList.push(matchedUser.id);
            } else {
              throw new Error(`User not found for mobile number: ${member}`);
            }
          } catch (searchError) {
            throw new Error(`Failed to find user for mobile number: ${member}`);
          }
        } else {
          // This is already a user ID, convert to number
          const userId = parseInt(member);
          if (!isNaN(userId)) {
            groupMembersList.push(userId);
          } else {
            throw new Error(`Invalid member format: ${member}`);
          }
        }
      }

      const conversation = await chatService.createGroupConversation(newGroupName, groupMembersList);
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setShowNewChatModal(false);
      setNewGroupName('');
      setNewGroupMembers('');
      setIsGroupChat(false);
      setError(null);
    } catch (error: any) {
      console.error('Failed to create group:', error);
      setError(error.message || t('groupCreateError'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const users = await chatService.getBlockedUsers();
      setBlockedUsers(users);
      setShowBlockedUsersModal(true);
    } catch (err) {
      setError('Failed to load blocked users');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedConversation || selectedConversation.room_type !== 'direct') return;

    const participants = selectedConversation.participants || [];
    const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
    const currentUserMobile = localStorageUser?.mobile_number;
    const currentUserId = Number(user?.id || localStorageUser?.id || localStorageUser?.user_id || localStorageUser?.pk);

    const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
    const myMobile = normalizePhone(currentUserMobile);

    const targetParticipant = participants.find(p => {
      const pId = Number(p.id);
      const pMobile = normalizePhone(p.mobile_number);
      const isMe = (pId !== 0 && pId === currentUserId) || (myMobile !== '' && pMobile === myMobile);
      return !isMe;
    }) || (participants.length > 1 ? participants[1] : participants[0]);

    if (!targetParticipant) return;

    try {
      if (isBlockedByMe) {
        await chatService.unblockUser(targetParticipant.id);
        setIsBlockedByMe(false);
      } else {
        await chatService.blockUser(targetParticipant.id);
        setIsBlockedByMe(true);
      }

      // Refresh blocked users list after block/unblock action
      chatService.getBlockedUsers().then(setBlockedUsers).catch(console.error);

      setShowChatOptions(false);
    } catch (err) {
      setError('Failed to update block status');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUnblockFromList = async (userId: number) => {
    try {
      await chatService.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.user_id !== userId && u.blocked_user !== userId));

      if (selectedConversation && selectedConversation.room_type === 'direct') {
        const target = selectedConversation.participants.find(p => p.id !== user?.id);
        if (target && target.id === userId) {
          setIsBlockedByMe(false);
        }
      }
    } catch (err) {
      setError('Failed to unblock user');
      setTimeout(() => setError(null), 5000);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    // 1. Tab Filter
    const roomType = (conv.room_type || '').toLowerCase();

    if (activeTab === 'direct') {
      if (roomType !== 'direct') return false;
    } else if (activeTab === 'group') {
      if (roomType !== 'group') return false;
    }
    // If 'all', proceed to search filter

    // 2. Search Filter (if query exists)
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    if (roomType === 'group') {
      return conv.name?.toLowerCase().includes(query);
    } else {
      const other = conv.participants.find(p => Number(p.id) !== Number(user?.id)) || conv.participants[0];
      return other?.mobile_number?.includes(query) ||
        other?.name?.toLowerCase().includes(query) ||
        other?.mobile_number?.toLowerCase().includes(query);
    }
  });

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex bg-orange-50 h-[calc(100dvh-80px)] md:h-[calc(100dvh-130px)] overflow-hidden relative border-t border-orange-100">

      {/* Error Toast */}
      {
        error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )
      }

      {/* Sidebar */}
      <div className={`w-full md:w-1/3  bg-white border-r h-full flex flex-col overflow-hidden shrink-0 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar Header & Search - Fixed at top */}
        <div className="sticky top-0 z-40 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 shadow-md shrink-0">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">{t('chat')}</h2>
          </div>
          <div className="p-4 pt-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-200 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder={t('searchConversations')}
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 text-white placeholder-orange-100 rounded-xl border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs - Also Sticky */}
          <div className="flex border-b border-orange-500/30 bg-white">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'all' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-orange-600'}`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'direct' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-orange-600'}`}
            >
              {t('direct')}
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'group' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-orange-600'}`}
            >
              {t('group')}
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation);
                  loadMessages(conversation.id); // Force call API on every click
                }}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-orange-50 transition-colors border-b ${selectedConversation?.id === conversation.id ? 'bg-orange-50' : ''
                  }`}
              >
                <div className="w-12 h-12 bg-linear-to-br from-amber-800 to-amber-700 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  {conversation.room_type === 'group' ? (
                    <Users className="h-6 w-6 text-white" />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {(() => {
                        const participants = conversation.participants || [];
                        const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
                        const currentUserMobile = localStorageUser?.mobile_number;
                        const currentUserId = Number(user?.id || localStorageUser?.id || localStorageUser?.user_id || localStorageUser?.pk);

                        const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
                        const myMobile = normalizePhone(currentUserMobile);

                        // Find the other user (not current user) by ID or Mobile Number
                        const other = participants.find(p => {
                          const pId = Number(p.id);
                          const pMobile = normalizePhone(p.mobile_number);
                          const isMe = (pId !== 0 && pId === currentUserId) || (myMobile !== '' && pMobile === myMobile);
                          return !isMe;
                        }) || (participants.length > 1 ? participants[1] : participants[0]);

                        const nickname = other?.id ? nicknames[other.id] : null;
                        const label = nickname || other?.first_name || other?.name || other?.mobile_number || 'U';
                        return label.charAt(0).toUpperCase();
                      })()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">
                    {conversation.room_type === 'group'
                      ? (conversation.name || t('untitledGroup'))
                      : (() => {
                        const participants = conversation.participants || [];
                        const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
                        const currentUserMobile = localStorageUser?.mobile_number;
                        const currentUserId = Number(user?.id || localStorageUser?.id || localStorageUser?.user_id || localStorageUser?.pk);

                        const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
                        const myMobile = normalizePhone(currentUserMobile);

                        // Find the other user (not current user) by ID or Mobile Number
                        const other = participants.find(p => {
                          const pId = Number(p.id);
                          const pMobile = normalizePhone(p.mobile_number);
                          const isMe = (pId !== 0 && pId === currentUserId) || (myMobile !== '' && pMobile === myMobile);
                          return !isMe;
                        }) || (participants.length > 1 ? participants[1] : participants[0]);

                        const nickname = other?.id ? nicknames[other.id] : null;
                        const displayName = nickname || other?.first_name || other?.name || other?.mobile_number || t('unknownUser');
                        return displayName;
                      })()}
                  </h3>
                  {conversation.last_message && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conversation.last_message.content}
                    </p>
                  )}
                </div>
                {conversation.unread_count > 0 && selectedConversation?.id !== conversation.id && (
                  <div className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center shadow-sm">
                    {conversation.unread_count}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-8 text-center bg-gray-50 h-full flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">{t('noMessages')}</p>
            </div>
          )}
        </div>

        {/* Start Chat Button - Fixed at bottom */}
        <div className="p-4 bg-white border-t shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-full py-3 px-4 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:from-orange-700 hover:to-amber-700 hover:shadow-lg transition-all active:scale-[0.98] shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span>{t('startNewChat')}</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header - Fixed at top of its area */}
            <div className="p-3 bg-white border-b flex items-center justify-between shadow-sm z-40 sticky top-0 bg-opacity-100 shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 -ml-2 text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="w-10 h-10 bg-linear-to-br from-amber-800 to-amber-700 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">
                    {selectedConversation.room_type === 'group'
                      ? selectedConversation.name?.charAt(0).toUpperCase()
                      : (() => {
                        const participants = selectedConversation.participants || [];
                        const other = participants.find(p => Number(p.id) !== Number(user?.id)) || participants[0];
                        const nickname = other?.id ? nicknames[other.id] : null;
                        const label = nickname || other?.first_name || other?.name || other?.mobile_number || 'U';
                        return label.charAt(0).toUpperCase();
                      })()}
                  </span>
                </div>
                <div>
                  {selectedConversation.room_type === 'direct' ? (() => {
                    const participants = selectedConversation.participants || [];
                    const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
                    const currentUserMobile = localStorageUser?.mobile_number;
                    const currentUserId = Number(user?.id || localStorageUser?.id || localStorageUser?.user_id || localStorageUser?.pk);

                    const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
                    const myMobile = normalizePhone(currentUserMobile);

                    // Find the other user (not current user) by ID or Mobile Number
                    const other = participants.find(p => {
                      const pId = Number(p.id);
                      const pMobile = normalizePhone(p.mobile_number);
                      const isMe = (pId !== 0 && pId === currentUserId) || (myMobile !== '' && pMobile === myMobile);
                      return !isMe;
                    }) || (participants.length > 1 ? participants[1] : participants[0]);

                    const nickname = other?.id ? nicknames[other.id] : null;
                    const displayName = nickname || other?.first_name || other?.name || 'User';
                    const mobileNumber = other?.mobile_number || '';

                    return (
                      <>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {displayName}
                        </h3>
                        <p className="text-amber-600 font-semibold text-sm">
                          {mobileNumber}
                        </p>
                      </>
                    );
                  })() : (
                    <h3 className="font-bold text-gray-900 leading-tight">
                      {selectedConversation.name || t('untitledGroup')}
                    </h3>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1 relative">
                {selectedConversation.room_type === 'direct' && (
                  <button
                    onClick={() => setShowHeaderOptions(!showHeaderOptions)}
                    className="p-2 text-gray-400 hover:text-orange-600 rounded-full hover:bg-gray-100 transition-all"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowChatOptions(!showChatOptions)}
                  className={`p-2 text-gray-400 hover:text-orange-600 rounded-full hover:bg-gray-100 transition-all ${selectedConversation.room_type === 'group' ? '' : 'hidden md:block'}`}
                >
                  {selectedConversation.room_type === 'group' ? <MoreVertical className="h-5 w-5" /> : <div className="h-5 w-5 border-2 border-gray-400 rounded-full flex items-center justify-center"><div className="h-1 w-1 bg-gray-400 rounded-full"></div></div>}
                </button>

                {/* Nickname options */}
                {showHeaderOptions && (
                  <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-60 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => { setShowNicknameModal(true); setShowHeaderOptions(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-800"
                    >
                      {t('changeName')}
                    </button>
                  </div>
                )}
                {showChatOptions && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 block">
                    {selectedConversation.room_type === 'direct' && (
                      <button
                        onClick={handleToggleBlock}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-medium text-gray-800"
                      >
                        {isBlockedByMe ? t('unblockUser') : t('blockUser')}
                      </button>
                    )}
                    {selectedConversation.room_type === 'group' && (
                      <>
                        <button
                          onClick={() => { setShowAddMemberModal(true); setShowChatOptions(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-medium text-gray-800"
                        >
                          {t('addMember')}
                        </button>
                        <button
                          onClick={() => {
                            if (selectedConversation) {
                              fetchGroupMembers(selectedConversation.id);
                              setShowViewMembersModal(true);
                              setShowChatOptions(false);
                            }
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-medium text-gray-800"
                        >
                          {t('viewMember')}
                        </button>
                        <button
                          onClick={handleExitGroup}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-medium text-red-600"
                        >
                          {t('exitGroup')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowClearChatModal(true)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-medium text-red-600 border-t"
                    >
                      {t('clearChat')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5]">
              {(() => {
                console.log('Rendering messages:', messages.length, messages);
                return null;
              })()}
              {messages && messages.map((message, index) => {
                const currentSenderId = message.sender_id ? Number(message.sender_id) : null;
                const nextSenderId = messages[index + 1] ? (messages[index + 1].sender_id ? Number(messages[index + 1].sender_id) : null) : null;

                const normalizePhone = (p: string | undefined | null) => p ? p.replace(/\D/g, '').slice(-10) : '';
                const userMobile = user?.mobile_number ? normalizePhone(user.mobile_number) : '';
                const senderMobile = message.sender_mobile ? normalizePhone(message.sender_mobile) : '';

                // Final fail-safe isOwn check
                const isOwn = (currentSenderId !== null && Number(user?.id) !== 0 && currentSenderId === Number(user?.id)) ||
                  (senderMobile !== '' && senderMobile === userMobile) ||
                  (senderMobile !== '' && localStorage.getItem('user') && normalizePhone(JSON.parse(localStorage.getItem('user')!).mobile_number) === senderMobile);

                const isLastInGroup = index === messages.length - 1 || (nextSenderId !== currentSenderId);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!isLastInGroup ? 'mb-1' : 'mb-4'}`}
                  >
                    <div className={`max-w-xs md:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                      {/* Group chat sender name */}
                      {!isOwn && selectedConversation?.room_type === 'group' && isLastInGroup && (
                        <p className="text-xs text-gray-600 mb-1 ml-2 font-semibold">{message.sender_mobile}</p>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`group relative px-4 py-2 ${isOwn
                          ? 'bg-[#dcf8c6] text-gray-900 rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none'
                          } rounded-2xl shadow-sm`}
                      >
                        {/* Message Options for Edit/Delete (WhatsApp style arrow) */}
                        {isOwn && (
                          <div className={`absolute top-1 right-2 z-10 ${showMessageOptions === message.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMessageOptions(showMessageOptions === message.id ? null : message.id);
                              }}
                              className="p-0.5 rounded-full hover:bg-black/5"
                            >
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            </button>
                            {showMessageOptions === message.id && (
                              <div className="absolute right-0 top-6 w-32 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-20 overflow-hidden">
                                <button
                                  onClick={() => {
                                    setEditingMessageId(message.id);
                                    setEditMessageContent(message.content);
                                    setShowMessageOptions(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {t('edit')}
                                </button>
                                <button
                                  onClick={() => {
                                    setMsgToDeleteId(message.id);
                                    setShowMsgDeleteModal(true);
                                    setShowMessageOptions(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50"
                                >
                                  {t('delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {editingMessageId === message.id ? (
                          <div className="flex flex-col mt-3">
                            <input
                              type="text"
                              value={editMessageContent}
                              onChange={e => setEditMessageContent(e.target.value)}
                              className="px-2 py-1 text-sm border rounded w-full mb-1 bg-white"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => setEditingMessageId(null)} className="text-xs text-gray-500">{t('cancel')}</button>
                              <button onClick={handleEditMessage} className="text-xs font-bold text-orange-600">{t('save')}</button>
                            </div>
                          </div>
                        ) : (
                          <p className="wrap-break-word text-sm pr-4">{message.content || ''}</p>
                        )}

                        {/* Render all attachments - FIXED IMAGE DISPLAY */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((att) => {
                              const isImage = att.file_type?.startsWith('image/') ||
                                att.file_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

                              if (isImage) {
                                const isDownloaded = downloadedFiles.has(att.id);
                                return (
                                  <div key={att.id} className={`relative group/img ${!isDownloaded ? 'cursor-pointer' : ''}`}
                                    onClick={() => !isDownloaded && handleDownload(att.id, att.file_name)}>
                                    <img
                                      src={att.url || (att.id ? `/api/chat/attachments/${att.id}/download/` : '')}
                                      alt={att.file_name || 'Image'}
                                      className="rounded-lg max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity border"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          const fallback = document.createElement('div');
                                          fallback.className = 'flex items-center space-x-3 p-3 bg-black/5 rounded-lg cursor-pointer hover:bg-black/10 transition-colors border border-black/5';
                                          fallback.innerHTML = `
                                            <svg class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <div class="flex-1 min-w-0">
                                              <p class="text-sm font-bold text-gray-900 truncate">${att.file_name || 'Image'}</p>
                                              <p class="text-xs text-gray-500">Click to download</p>
                                            </div>
                                          `;
                                          parent.appendChild(fallback);
                                        }
                                      }}
                                    />
                                    {!isDownloaded && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/30 rounded-lg">
                                        <Download className="h-8 w-8 text-white drop-shadow-lg" />
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                const isDownloaded = downloadedFiles.has(att.id);
                                return (
                                  <div
                                    key={att.id}
                                    className={`flex items-center space-x-3 p-3 bg-black/5 rounded-lg ${!isDownloaded ? 'cursor-pointer hover:bg-black/10' : ''} transition-colors border border-black/5`}
                                    onClick={() => !isDownloaded && handleDownload(att.id, att.file_name)}
                                  >
                                    <FileIcon className="h-8 w-8 text-orange-600" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-900 truncate">{att.file_name || 'Document'}</p>
                                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{isDownloaded ? 'Downloaded' : 'Click to download'}</p>
                                    </div>
                                    {!isDownloaded && <Download className="h-5 w-5 text-gray-400" />}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}

                        {/* Message status and time for own messages */}
                        {isOwn && (
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className="text-xs text-gray-500">
                              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : ''}
                            </span>

                            <div className="flex items-center">
                              {message.read_at ? (
                                <CheckCheck className="h-4 w-4 text-[#53bdeb]" />
                              ) : message.delivered_at ? (
                                <CheckCheck className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Check className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Time for received messages */}
                        {!isOwn && (
                          <span className="text-xs text-gray-500 mt-1 block">
                            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('noMessages')}. {t('startChat')}!</p>
                </div>
              )}

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="flex items-center space-x-2 px-4 py-2 text-gray-500 text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>
                    {selectedConversation.room_type === 'group'
                      ? `${typingUsers.size} ${t('peopleTyping')}`
                      : t('typing')
                    }
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {isBlockedByMe || amIBlocked ? (
              <div className="p-4 bg-gray-100 border-t flex items-center justify-center text-gray-500 shrink-0">
                <p>{isBlockedByMe ? t('youHaveBlocked') : t('cannotReply')}</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t shrink-0">

                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center bg-gray-100 p-2 rounded w-fit max-w-full">
                        <span className="text-sm truncate mr-2">{file.name}</span>
                        <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-orange-600 transition-colors shrink-0">
                    <Paperclip className="h-6 w-6" />
                  </button>
                  <input type="file" className="hidden" ref={fileInputRef} multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    placeholder={t('typeMessage')}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!messageInput.trim() && selectedFiles.length === 0)}
                    className="p-3 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-full hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Send className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{t('selectConversation')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {
        showAddMemberModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('addMember')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('mobileNumber')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={addMemberSearchText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddMemberSearchText(val);
                        setAddMemberUserId(val); // Fallback for manual entry
                        handleSearchSuggestions(val);
                      }}
                      placeholder={t('enterMobileNumber')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-hidden"
                    />

                    {/* Suggestions Dropdown for Adding Member */}
                    {searchSuggestions.length > 0 && (
                      <div className="absolute top-11 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-110 max-h-48 overflow-y-auto">
                        {searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => {
                              setAddMemberUserId(suggestion.id.toString());
                              setAddMemberSearchText(suggestion.mobile_number);
                              setSearchSuggestions([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-gray-900">{suggestion.full_name}</div>
                            <div className="text-xs text-gray-500">{suggestion.mobile_number}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleAddMember}
                    className="flex-1 px-4 py-2 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 font-bold shadow-lg transition-all"
                  >
                    {t('add')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Clear Chat Confirmation Modal */}
      {
        showClearChatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-110 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('clearChatConfirm')}</h3>
                <p className="text-gray-500 mb-6 text-sm">
                  {t('clearChatDesc')}
                </p>
                <div className="flex w-full space-x-3">
                  <button
                    onClick={() => setShowClearChatModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDeleteConversation}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg transition-all"
                  >
                    {t('clearChat')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Message Delete Confirmation Modal */}
      {
        showMsgDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-110 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('deleteMessageConfirm')}</h3>
                <p className="text-gray-500 mb-6 text-sm">
                  {t('deleteMessageDesc')}
                </p>
                <div className="flex w-full space-x-3">
                  <button
                    onClick={() => setShowMsgDeleteModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDeleteMessage}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg transition-all"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Nickname Modal */}
      {
        showNicknameModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('setNickname')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('nickname') || 'Nickname'}</label>
                  <input
                    type="text"
                    value={nicknameValue}
                    onChange={(e) => setNicknameValue(e.target.value)}
                    placeholder={t('enterNickname')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-hidden"
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowNicknameModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleUpdateNickname}
                    className="flex-1 px-4 py-2 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 font-bold shadow-lg transition-all"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* New Chat Modal */}
      {
        showNewChatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative transform transition-all">
              <h3 className="text-xl font-bold mb-4">{t('startNewChat')}</h3>

              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setIsGroupChat(false)}
                  className={`flex-1 py-1 text-sm rounded ${!isGroupChat ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t('direct')}
                </button>
                <button
                  onClick={() => setIsGroupChat(true)}
                  className={`flex-1 py-1 text-sm rounded ${isGroupChat ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t('group')}
                </button>
              </div>

              {!isGroupChat ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateDirectChat();
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterMobileNumber')}
                      value={newChatUserId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewChatUserId(val);
                        handleSearchSuggestions(val);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
                      autoFocus
                    />

                    {/* Suggestions Dropdown for Direct Chat */}
                    {searchSuggestions.length > 0 && (
                      <div className="absolute top-11 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-110 max-h-48 overflow-y-auto">
                        {searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => {
                              setNewChatUserId(suggestion.mobile_number);
                              setSearchSuggestions([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-gray-900">{suggestion.full_name}</div>
                            <div className="text-xs text-gray-500">{suggestion.mobile_number}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {isSearching && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewChatModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-lg hover:from-orange-700 hover:to-amber-700"
                    >
                      {t('startChat')}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateGroupChat();
                  }}
                >
                  <input
                    type="text"
                    placeholder={t('groupName')}
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2"
                    autoFocus
                  />
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder={t('enterMobileNumbers')}
                      value={newGroupMembers}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewGroupMembers(val);

                        // If typing a single number (or at the end of comma list), try searching
                        const parts = val.split(',');
                        const lastPart = parts[parts.length - 1].trim();
                        if (lastPart.length >= 3) {
                          handleSearchSuggestions(lastPart);
                        } else {
                          setSearchSuggestions([]);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />

                    {/* Suggestions Dropdown for Group Chat */}
                    {searchSuggestions.length > 0 && (
                      <div className="absolute top-11 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-110 max-h-48 overflow-y-auto">
                        {searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => {
                              const parts = newGroupMembers.split(',');
                              // Use mobile number instead of ID for consistency
                              parts[parts.length - 1] = suggestion.mobile_number;
                              setNewGroupMembers(parts.join(',') + ',');
                              setSearchSuggestions([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-gray-900">{suggestion.full_name}</div>
                            <div className="text-xs text-gray-500">{suggestion.mobile_number}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewChatModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-lg hover:from-orange-700 hover:to-amber-700"
                    >
                      {t('createGroup')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      }

      {/* Blocked Users Modal */}
      {
        showBlockedUsersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 relative">
              <h3 className="text-xl font-bold mb-4">{t('blockedUsers')}</h3>
              <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
                {blockedUsers.length > 0 ? (
                  blockedUsers.map((bu, idx) => {
                    // depending on the backend response structure for blocked users
                    const userId = bu.user_id || bu.blocked_user || bu.id;
                    const mobile = bu.mobile_number || bu.mobile;
                    const name = bu.name || userId;

                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{name}</p>
                          {mobile && <p className="text-xs text-gray-500">{mobile}</p>}
                        </div>
                        <button
                          onClick={() => handleUnblockFromList(userId)}
                          className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded hover:bg-orange-200"
                        >
                          {t('unblockUser')}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('noBlockedUsers')}</p>
                )}
              </div>
              <button
                onClick={() => setShowBlockedUsersModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                {t('close')}
              </button>
            </div>
          </div>
        )
      }

      {/* View Members Modal */}
      {
        showViewMembersModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-gray-900">{t('groupMembers')}</h3>
                <button
                  onClick={() => setShowViewMembersModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto mb-4 space-y-3 pr-2 custom-scrollbar">
                {fetchingMembers ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-orange-600 animate-spin mb-2" />
                    <p className="text-sm text-gray-500 font-medium">{t('loadingMembers')}</p>
                  </div>
                ) : groupMembers.length > 0 ? (
                  groupMembers.map((member: any) => (
                    <div key={member.user_id || member.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100 group">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-linear-to-br from-amber-800 to-amber-700 rounded-full flex items-center justify-center shadow-sm text-white font-bold shrink-0">
                          {member.first_name?.charAt(0).toUpperCase() || member.profile_name?.charAt(0).toUpperCase() || member.name?.charAt(0).toUpperCase() || member.mobile_number?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-bold text-gray-900 truncate">
                            {Number(member.user_id || member.id) === Number(user?.id) ? t('you') : (member.first_name || member.profile_name || member.name || t('user'))}
                            {Number(member.user_id || member.id) === Number(selectedConversation?.created_by) && (
                              <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded-md uppercase tracking-wider">{t('admin')}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">{member.mobile_number}</p>
                        </div>
                      </div>

                      {Number(member.user_id || member.id) !== Number(user?.id) &&
                        Number(member.user_id || member.id) !== Number(selectedConversation?.created_by) && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id || member.id)}
                            disabled={removingMemberId === (member.user_id || member.id)}
                            className="flex items-center space-x-1 px-2 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                            title="Remove from group"
                          >
                            {removingMemberId === (member.user_id || member.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('remove')}</span>
                              </>
                            )}
                          </button>
                        )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500">{t('noMembersFound')}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowViewMembersModal(false)}
                  className="px-6 py-2.5 bg-linear-to-r from-amber-900 via-amber-800 to-orange-900 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 font-bold shadow-lg transition-all active:scale-95"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Exit Group Confirmation Modal */}
      {showExitGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('exitGroup')}</h3>
              <p className="text-gray-600 text-sm">
                {t('exitGroupDesc')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExitGroupModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmExitGroup}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {t('exitGroup')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}