// ChatPage.tsx — Full Production Chat UI
// Integrates with Django Channels WebSocket + DRF REST API
// Matches backend: consumers.py, serializers.py, views.py, models.py
import { BASE_URL } from '../services/api';
import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import {
  Send, Plus, Search, Users, Loader2, MessageCircle,
  ArrowLeft, MoreVertical, Paperclip, Check, CheckCheck,
  X, FileIcon, Download, ChevronDown, Trash2, Copy,
  Pencil, Reply, Shield, Bell, BellOff, UserMinus,
  LogOut, UserPlus, Eye, Hash, Phone, AlertCircle,
  Smile, Image as ImageIcon, ChevronUp, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES  (mirrors backend serializers exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  mobile_number: string;
}

export interface Attachment {
  id: number;
  filename: string;
  file_type: string;
  url: string;
}

export interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_mobile: string;
  created_at: string;
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  attachments: Attachment[];
  is_delivered: boolean;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  isOwn?: boolean; // computed client-side
}

export interface Conversation {
  id: number;
  room_type: 'direct' | 'group';
  name: string | null;
  participants: User[];
  unread_count: number;
  last_message: {
    content: string;
    sender_mobile: string;
    created_at: string;
  } | null;
  created_at: string;
  other_user_status?: 'online' | 'offline';
}

export interface BlockStatus {
  i_blocked_them: boolean;
  they_blocked_me: boolean;
  chat_allowed: boolean;
}

interface GroupMember {
  user_id: number;
  mobile_number: string;
  profile_name: string | null;
  profile_image: string | null;
  role: 'admin' | 'member';
  joined_at: string;
  is_muted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET SERVICE
// ─────────────────────────────────────────────────────────────────────────────

interface WSCallbacks {
  onMessage: (msg: Message) => void;
  onHistory: (msgs: Message[]) => void;
  onTyping: (senderId: number, isTyping: boolean) => void;
  onUserStatus: (userId: number, status: 'online' | 'offline') => void;
  onDelivered: (messageId: number, deliveredTo: number) => void;
  onSeen: (messageId: number, seenBy: number) => void;
  onError: (detail: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

class ChatWebSocket {
  private ws: WebSocket | null = null;
  private roomId: number;
  private token: string;
  private cbs: WSCallbacks;
  private retryCount = 0;
  private maxRetries = 8;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(roomId: number, token: string, cbs: WSCallbacks) {
    this.roomId = roomId;
    this.token = token;
    this.cbs = cbs;
  }

  connect() {
    this.intentionalClose = false;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const base = (import.meta as any).env?.VITE_WS_URL ?? `${proto}://${window.location.host}`;
    const url = `${base}/ws/chat/${this.roomId}/?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleRetry();
      return;
    }

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.cbs.onConnected();
      // keepalive ping every 25s
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), 25000);
    };

    this.ws.onmessage = (e: MessageEvent) => {
      let data: any;
      try { data = JSON.parse(e.data); } catch { return; }
      this.route(data);
    };

    this.ws.onerror = () => {
      this.cbs.onError('Network error');
    };

    this.ws.onclose = (ev) => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.cbs.onDisconnected();
      if (!this.intentionalClose && ev.code !== 4001 && ev.code !== 4003) {
        this.scheduleRetry();
      }
    };
  }

  private route(data: any) {
    switch (data.type) {
      case 'message':
        this.cbs.onMessage(this.normalize(data));
        break;
      case 'history':
        if (Array.isArray(data.messages))
          this.cbs.onHistory(data.messages.map((m: any) => this.normalize(m)));
        break;
      case 'typing':
        this.cbs.onTyping(Number(data.sender_id), Boolean(data.is_typing));
        break;
      case 'user_status':
        this.cbs.onUserStatus(Number(data.user_id), data.status);
        break;
      case 'delivered':
      case 'delivery_receipt':
        this.cbs.onDelivered(Number(data.message_id), Number(data.delivered_to));
        break;
      case 'seen':
      case 'message_seen':
        this.cbs.onSeen(Number(data.message_id), Number(data.seen_by));
        break;
      case 'error':
        this.cbs.onError(data.detail ?? 'Server error');
        break;
      // pong / ping — ignore
    }
  }

  private normalize(raw: any): Message {
    return {
      id: Number(raw.id ?? raw.message_id),
      content: raw.content ?? '',
      sender_id: Number(raw.sender_id ?? 0),
      sender_mobile: raw.sender_mobile ?? '',
      created_at: raw.created_at ?? new Date().toISOString(),
      is_deleted: raw.is_deleted ?? false,
      is_edited: raw.is_edited ?? false,
      edited_at: raw.edited_at ?? null,
      attachments: (raw.attachments ?? []).map((a: any) => ({
        id: a.id,
        filename: a.filename,
        file_type: a.file_type ?? a.content_type ?? '',
        url: a.url ?? a.file_url ?? '',
      })),
      is_delivered: Boolean(raw.is_delivered),
      is_read: Boolean(raw.is_read),
      read_at: raw.read_at ?? null,
      delivered_at: raw.delivered_at ?? null,
    };
  }

  private scheduleRetry() {
    if (this.retryCount >= this.maxRetries) {
      this.cbs.onError('Unable to reconnect. Please refresh.');
      return;
    }
    const delay = Math.min(500 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(payload: object) {
    if (!this.connected) return;
    this.ws!.send(JSON.stringify(payload));
  }

  sendMessage(content: string) { this.send({ type: 'message', content }); }
  sendTyping(isTyping: boolean) { this.send({ type: 'typing', is_typing: isTyping }); }
  sendRead(messageId: number) { this.send({ type: 'read', message_id: messageId }); }

  disconnect() {
    this.intentionalClose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE  (maps to views.py endpoints)
// ─────────────────────────────────────────────────────────────────────────────

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken') ??
    (() => { try { return JSON.parse(localStorage.getItem('user') ?? '{}').token; } catch { return null; } })();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiFetch = async (url: string, opts: RequestInit = {}) => {
  const fullUrl = `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(opts.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.detail ?? `HTTP ${res.status}`), { status: res.status, body });
  }
  if (res.status === 204) return null;
  return res.json();
};

const transformConv = (r: any): Conversation => ({
  id: r.id,
  room_type: r.room_type,
  name: r.name ?? null,
  participants: r.members ?? [],
  unread_count: r.unread_count ?? 0,
  last_message: r.last_message ?? null,
  created_at: r.created_at,
});

const transformMsg = (m: any): Message => ({
  id: Number(m.id),
  content: m.content ?? '',
  sender_id: Number(m.sender_id ?? m.sender?.id ?? 0),
  sender_mobile: m.sender_mobile ?? m.sender?.mobile_number ?? '',
  created_at: m.created_at ?? new Date().toISOString(),
  is_deleted: m.is_deleted ?? false,
  is_edited: m.is_edited ?? false,
  edited_at: m.edited_at ?? null,
  attachments: (m.attachments ?? []).map((a: any) => ({
    id: a.id,
    filename: a.filename ?? a.file_name ?? '',
    file_type: a.content_type ?? a.file_type ?? '',
    url: a.file_url ?? a.url ?? '',
  })),
  is_delivered: Boolean(m.is_delivered),
  is_read: Boolean(m.is_read),
  read_at: m.read_at ?? null,
  delivered_at: m.delivered_at ?? null,
});

const API = {
  // GET /api/chat/rooms/?type=direct|group
  getRooms: async (type?: string): Promise<Conversation[]> => {
    const url = type && type !== 'all' ? `api/chat/rooms/?type=${type}` : 'api/chat/rooms/';
    const data = await apiFetch(url);
    const list = data.results ?? data;
    return Array.isArray(list) ? list.map(transformConv) : [];
  },

  // GET /api/chat/rooms/:id/messages/?limit=N&offset=N
  getMessages: async (roomId: number, limit = 30, offset = 0) => {
    const data = await apiFetch(`api/chat/rooms/${roomId}/messages/?limit=${limit}&offset=${offset}`);
    const results = data.results ?? data;
    return {
      messages: Array.isArray(results) ? results.map(transformMsg) : [],
      count: data.count ?? results.length,
    };
  },

  // POST /api/chat/rooms/:id/messages/  (REST fallback / file upload)
  sendMessage: async (roomId: number, content: string, files?: File[]): Promise<Message> => {
    if (files && files.length > 0) {
      const fd = new FormData();
      fd.append('content', content);
      files.forEach(f => fd.append('attachments', f));
      const res = await fetch(`${BASE_URL}api/chat/rooms/${roomId}/messages/`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return transformMsg(await res.json());
    }
    const data = await apiFetch(`api/chat/rooms/${roomId}/messages/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return transformMsg(data);
  },

  // POST /api/chat/rooms/:id/read/
  markRoomRead: (roomId: number) =>
    apiFetch(`api/chat/rooms/${roomId}/read/`, { method: 'POST' }),

  // PUT /api/chat/messages/:id/
  editMessage: async (msgId: number, content: string): Promise<Message> => {
    const data = await apiFetch(`api/chat/messages/${msgId}/`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return transformMsg(data.message ?? data);
  },

  // DELETE /api/chat/messages/:id/delete/
  deleteMessage: (msgId: number) =>
    apiFetch(`api/chat/messages/${msgId}/delete/`, { method: 'DELETE' }),

  // POST /api/chat/rooms/direct/
  createDirect: async (targetUserId: number): Promise<Conversation> => {
    const data = await apiFetch('api/chat/rooms/direct/', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    return transformConv(data);
  },

  // POST /api/chat/rooms/group/
  createGroup: async (name: string, memberIds: number[]): Promise<Conversation> => {
    const data = await apiFetch('api/chat/rooms/group/', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids: memberIds }),
    });
    return transformConv(data);
  },

  // GET /api/chat/rooms/:id/members/
  getGroupMembers: async (roomId: number): Promise<GroupMember[]> => {
    const data = await apiFetch(`api/chat/rooms/${roomId}/members/`);
    const list = data.results ?? data;
    return Array.isArray(list) ? list : [];
  },

  // POST /api/chat/rooms/:id/members/add   (note: no trailing slash per views.py)
  addMembers: (roomId: number, ids: number[]) =>
    apiFetch(`api/chat/rooms/${roomId}/members/add`, {
      method: 'POST',
      body: JSON.stringify({ member_ids: ids }),
    }),

  // POST /api/chat/rooms/:id/remove-members
  removeMembers: (roomId: number, ids: number[]) =>
    apiFetch(`api/chat/rooms/${roomId}/remove-members`, {
      method: 'POST',
      body: JSON.stringify({ member_ids: ids }),
    }),

  // POST /api/chat/rooms/:id/exit/
  exitGroup: (roomId: number) =>
    apiFetch(`api/chat/rooms/${roomId}/exit/`, { method: 'POST' }),

  // POST /api/chat/rooms/:id/delete/  → clears chat (sets cleared_at)
  clearChat: (roomId: number) =>
    apiFetch(`api/chat/rooms/${roomId}/delete/`, { method: 'POST' }),

  // POST /api/chat/block/
  blockUser: (userId: number) =>
    apiFetch('api/chat/block/', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),

  // POST /api/chat/unblock/
  unblockUser: (userId: number) =>
    apiFetch('api/chat/unblock/', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),

  // GET /api/chat/blocked/
  getBlocked: async () => {
    const data = await apiFetch('api/chat/blocked/');
    return Array.isArray(data) ? data : [];
  },

  // GET /api/chat/block-status/:id/
  blockStatus: async (userId: number): Promise<BlockStatus> =>
    apiFetch(`api/chat/block-status/${userId}/`),

  // GET /api/chat/contacts/
  getNicknames: async (): Promise<{ contact_id: number; nickname: string }[]> => {
    const data = await apiFetch('api/chat/contacts/');
    return Array.isArray(data) ? data : [];
  },

  // POST /api/chat/contacts/
  setNickname: (contactId: number, nickname: string) =>
    apiFetch('api/chat/contacts/', {
      method: 'POST',
      body: JSON.stringify({ contact_id: contactId, nickname }),
    }),

  // GET /api/auth/api/mobile-search/?q=
  mobileSearch: async (q: string): Promise<any[]> => {
    if (!q || q.length < 2) return [];
    try {
      const data = await apiFetch(`api/auth/api/mobile-search/?q=${encodeURIComponent(q)}`);
      const list = data.results ?? data;
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  },

  // GET /api/chat/attachments/:id/download/
  downloadAttachment: async (id: number, filename: string) => {
    const res = await fetch(`${BASE_URL}api/chat/attachments/${id}/download/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentUser = (): { id: number; mobile_number: string } | null => {
  try {
    const s = JSON.parse(localStorage.getItem('user') ?? '{}');
    if (s.id) return { id: Number(s.id), mobile_number: s.mobile_number ?? '' };
  } catch { }
  return null;
};

const getToken = () =>
  localStorage.getItem('authToken') ??
  (() => { try { return JSON.parse(localStorage.getItem('user') ?? '{}').token; } catch { return null; } })();

const dedup = (msgs: Message[]): Message[] => {
  const map = new Map<number, Message>();
  for (const m of msgs) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const sameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

// ─────────────────────────────────────────────────────────────────────────────
// TOAST  (lightweight inline toast — no external dependency needed)
// ─────────────────────────────────────────────────────────────────────────────

const useToast = () => {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' | 'info' }[]>([]);
  const show = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, toast: show };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Avatar: React.FC<{
  name: string; size?: 'sm' | 'md' | 'lg'; isGroup?: boolean; online?: boolean
}> = ({ name, size = 'md', isGroup = false, online }) => {
  const sz = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 18 : 15;
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: sz, height: sz, borderRadius: '50%',
        background: isGroup
          ? 'linear-gradient(135deg, #78350f 0%, #431407 100%)'
          : 'var(--accent-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(67, 20, 7, 0.12)',
      }}>
        {isGroup
          ? <Users size={fs} color="rgba(255,255,255,0.7)" />
          : <span style={{ color: '#fff', fontSize: fs, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{initial}</span>
        }
      </div>
      {online !== undefined && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 10, height: 10, borderRadius: '50%',
          background: online ? 'var(--online)' : 'var(--text-muted)',
          border: '2px solid var(--bg-secondary)',
        }} />
      )}
    </div>
  );
};

const Tick: React.FC<{ msg: Message }> = ({ msg }) => {
  if (msg.is_read) return <CheckCheck size={14} color="#3b82f6" />;
  if (msg.is_delivered) return <CheckCheck size={14} color="#9ca3af" />;
  return <Check size={14} color="#9ca3af" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { language, t } = useLanguage();
  const { toasts, toast } = useToast();
  const currentUser = useMemo(() => getCurrentUser(), []);

  // ── Conversations ────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group'>('all');
  const [convSearch, setConvSearch] = useState('');
  const [nicknames, setNicknames] = useState<Record<number, string>>({});

  // ── Selected conversation ────────────────────────────────────────────────
  const [selected, setSelected] = useState<Conversation | null>(null);

  // ── Messages ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 30;

  // ── Input ─────────────────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // ── WS state ──────────────────────────────────────────────────────────────
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const wsRef = useRef<ChatWebSocket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Block state ───────────────────────────────────────────────────────────
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [blockedList, setBlockedList] = useState<any[]>([]);

  // ── Group state ───────────────────────────────────────────────────────────
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // ── Message options menu ──────────────────────────────────────────────────
  const [optionsFor, setOptionsFor] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const [downloadedAtts, setDownloadedAtts] = useState<Set<number>>(new Set());
  const handleDownload = async (attId: number, filename: string) => {
    try {
      await API.downloadAttachment(attId, filename);
      setDownloadedAtts(prev => new Set(prev).add(attId));
    } catch {
      toast('Download failed', 'error');
    }
  };

  // ── Modals ────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<
    | 'none'
    | 'new-chat'
    | 'new-group'
    | 'clear-chat'
    | 'delete-msg'
    | 'nickname'
    | 'blocked-users'
    | 'group-members'
    | 'add-member'
    | 'exit-group'
    | 'info'
  >('none');

  // Disable body scroll on chat page
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // ── New chat form ─────────────────────────────────────────────────────────
  const [newChatInput, setNewChatInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [addMemberInput, setAddMemberInput] = useState('');
  const [addMemberId, setAddMemberId] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');

  // ── Scroll / refs ─────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atBottom = useRef(true);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const isOwn = useCallback((msg: Message) => {
    if (!currentUser) return false;
    return (
      Number(msg.sender_id) === Number(currentUser.id) ||
      msg.sender_mobile === currentUser.mobile_number
    );
  }, [currentUser]);

  const getOther = useCallback((conv: Conversation) => {
    if (conv.room_type !== 'direct') return null;
    return conv.participants.find(p =>
      Number(p.id) !== Number(currentUser?.id) &&
      p.mobile_number !== currentUser?.mobile_number
    ) ?? conv.participants[0] ?? null;
  }, [currentUser]);

  const displayName = useCallback((conv: Conversation) => {
    if (conv.room_type === 'group') return conv.name || 'Unnamed Group';
    const other = getOther(conv);
    if (!other) return 'Unknown';
    return nicknames[other.id] ?? other.mobile_number ?? `User ${other.id}`;
  }, [getOther, nicknames]);

  const filteredConvs = useMemo(() => {
    const q = convSearch.toLowerCase().trim();
    return conversations.filter(c => {
      if (activeTab !== 'all' && c.room_type !== activeTab) return false;
      if (!q) return true;
      if (c.room_type === 'group') return (c.name ?? '').toLowerCase().includes(q);
      const other = getOther(c);
      return other?.mobile_number?.includes(q) ?? false;
    });
  }, [conversations, activeTab, convSearch, getOther]);

  // ─── Load conversations + nicknames ───────────────────────────────────────

  const loadConversations = useCallback(async (tab = activeTab) => {
    try {
      const data = await API.getRooms(tab);
      setConversations(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        data.forEach(c => {
          const existing = map.get(c.id);
          map.set(c.id, existing ? { ...c, other_user_status: existing.other_user_status } : c);
        });
        return Array.from(map.values()).sort((a, b) => {
          const ta = a.last_message?.created_at ?? a.created_at;
          const tb = b.last_message?.created_at ?? b.created_at;
          return new Date(tb).getTime() - new Date(ta).getTime();
        });
      });
    } catch (e: any) {
      toast('Failed to load conversations', 'error');
    } finally {
      setConvLoading(false);
    }
  }, [activeTab]);

  const loadNicknames = useCallback(async () => {
    try {
      const data = await API.getNicknames();
      const map: Record<number, string> = {};
      data.forEach(n => { map[n.contact_id] = n.nickname; });
      setNicknames(map);
    } catch { }
  }, []);

  useEffect(() => {
    loadConversations(activeTab);
    loadNicknames();
    API.getBlocked().then(setBlockedList).catch(() => { });
  }, [activeTab]);

  // ─── Load messages ────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convId: number, off: number, reset: boolean) => {
    if (reset) setMsgLoading(true);
    try {
      const { messages: msgs, count } = await API.getMessages(convId, LIMIT, off);
      setTotalCount(count);
      if (reset) {
        setMessages(dedup(msgs));
        setOffset(msgs.length);
        setHasMore(msgs.length < count);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 60);
      } else {
        // Prepend older messages; preserve scroll position
        const container = msgContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        setMessages(prev => dedup([...msgs, ...prev]));
        setOffset(o => o + msgs.length);
        setHasMore(off + msgs.length < count);
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      }
    } catch {
      toast('Failed to load messages', 'error');
    } finally {
      if (reset) setMsgLoading(false);
    }
  }, []);

  // ─── Select conversation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!selected) return;

    setMessages([]);
    setOffset(0);
    setHasMore(false);
    setTypingUsers(new Set());
    setEditId(null);
    setEditContent('');
    setReplyTo(null);
    setOptionsFor(null);
    setBlockStatus(null);
    setGroupMembers([]);

    loadMessages(selected.id, 0, true);

    // Mark room read
    API.markRoomRead(selected.id).catch(() => { });
    setConversations(prev =>
      prev.map(c => c.id === selected.id ? { ...c, unread_count: 0 } : c)
    );

    // Block status for direct rooms
    if (selected.room_type === 'direct') {
      const other = getOther(selected);
      if (other) {
        API.blockStatus(other.id)
          .then(setBlockStatus)
          .catch(() => { });
      }
    }
  }, [selected?.id]);

  // ─── WebSocket lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    if (!selected) return;
    const token = getToken();
    if (!token) { toast('Not authenticated', 'error'); return; }

    const ws = new ChatWebSocket(selected.id, token, {
      onConnected: () => setWsConnected(true),
      onDisconnected: () => setWsConnected(false),

      onMessage: (msg) => {
        const own = isOwn(msg);
        const normalized = { ...msg, isOwn: own };

        setMessages(prev => {
          // Replace optimistic temp message if it exists
          if (own) {
            const tempIdx = prev.findLastIndex(
              m => m.id > 1_000_000_000_000 && m.content === msg.content
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = normalized;
              return dedup(next);
            }
          }
          if (prev.some(m => m.id === msg.id)) return prev;
          return dedup([...prev, normalized]);
        });

        if (atBottom.current) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }

        // Refresh conversation list for last_message
        loadConversations();
      },

      onHistory: (history) => {
        const normalized = history.map(m => ({ ...m, isOwn: isOwn(m) }));
        setMessages(prev => dedup([...prev, ...normalized]));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
      },

      onTyping: (senderId, isTyping) => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          isTyping ? next.add(senderId) : next.delete(senderId);
          return next;
        });
      },

      onUserStatus: (userId, status) => {
        setConversations(prev => prev.map(c => {
          if (c.room_type !== 'direct') return c;
          const other = c.participants.find(p => Number(p.id) === userId);
          return other ? { ...c, other_user_status: status } : c;
        }));
        if (selected.room_type === 'direct') {
          const other = getOther(selected);
          if (other && Number(other.id) === userId) {
            setSelected(s => s ? { ...s, other_user_status: status } : s);
          }
        }
      },

      onDelivered: (messageId) => {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, is_delivered: true } : m)
        );
      },

      onSeen: (messageId) => {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
        );
      },

      onError: (detail) => toast(detail, 'error'),
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [selected?.id]);

  // ─── Intersection observer for read receipts ──────────────────────────────

  useEffect(() => {
    if (!msgContainerRef.current || !wsRef.current || !selected) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = Number(entry.target.getAttribute('data-msg-id'));
        const msg = messages.find(m => m.id === id);
        if (msg && !isOwn(msg) && !msg.is_read) {
          wsRef.current?.sendRead(id);
          setMessages(prev =>
            prev.map(m => m.id === id ? { ...m, is_read: true } : m)
          );
        }
      });
    }, { threshold: 0.6, root: msgContainerRef.current });

    const els = msgContainerRef.current.querySelectorAll('[data-msg-id]');
    els.forEach(el => observer.observe(el));

    const mo = new MutationObserver(() => {
      const newEls = msgContainerRef.current?.querySelectorAll('[data-msg-id]');
      newEls?.forEach(el => observer.observe(el));
    });
    mo.observe(msgContainerRef.current, { childList: true, subtree: true });

    return () => { observer.disconnect(); mo.disconnect(); };
  }, [messages, selected?.id]);

  // ─── Scroll tracking ──────────────────────────────────────────────────────

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (el.scrollTop < 80 && hasMore && !msgLoading) {
      loadMessages(selected!.id, offset, false);
    }
  }, [hasMore, msgLoading, offset, selected?.id]);

  // ─── Typing indicator ─────────────────────────────────────────────────────

  const handleInputChange = (val: string) => {
    if (editId) { setEditContent(val); return; }
    setInput(val);
    if (!wsRef.current?.connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsRef.current.sendTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      wsRef.current?.sendTyping(false);
      isTypingRef.current = false;
    }, 1500);
  };

  // ─── Send message ─────────────────────────────────────────────────────────

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selected) return;

    // Edit mode
    if (editId) {
      if (!editContent.trim()) return;
      try {
        const updated = await API.editMessage(editId, editContent.trim());
        setMessages(prev => dedup(prev.map(m => m.id === editId ? { ...updated, isOwn: true } : m)));
        toast(t('messageUpdated'), 'success');
      } catch { toast(t('failedUpdateName'), 'error'); }
      setEditId(null);
      setEditContent('');
      return;
    }

    const content = input.trim();
    const hasFiles = files.length > 0;
    if (!content && !hasFiles) return;

    // Clear reply/input immediately
    const sentReply = replyTo;
    const sentFiles = files;
    setInput('');
    setFiles([]);
    setReplyTo(null);
    if (fileRef.current) fileRef.current.value = '';

    // Optimistic message
    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      content,
      sender_id: Number(currentUser?.id ?? 0),
      sender_mobile: currentUser?.mobile_number ?? '',
      created_at: new Date().toISOString(),
      is_deleted: false,
      is_edited: false,
      edited_at: null,
      attachments: [],
      is_delivered: false,
      is_read: false,
      read_at: null,
      delivered_at: null,
      isOwn: true,
    };
    setMessages(prev => dedup([...prev, optimistic]));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    setSending(true);
    try {
      if (!hasFiles && wsRef.current?.connected) {
        // Send via WebSocket (faster)
        wsRef.current.sendMessage(content);
        // The WS will echo back; we replace temp then
      } else {
        // REST fallback (required for file uploads)
        const sent = await API.sendMessage(selected.id, content, hasFiles ? sentFiles : undefined);
        const normalized = { ...sent, isOwn: true };
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === tempId);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = normalized;
            return dedup(next);
          }
          return dedup([...prev.filter(m => m.id !== tempId), normalized]);
        });
        loadConversations();
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(content);
      setFiles(sentFiles);
      toast(err.message ?? t('failedAddMember'), 'error');
    } finally {
      setSending(false);
    }
  }, [selected, editId, editContent, input, files, replyTo, currentUser]);

  // ─── Delete message ───────────────────────────────────────────────────────

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await API.deleteMessage(deleteTarget);
      setMessages(prev => prev.filter(m => m.id !== deleteTarget));
      toast(t('messageDeleted'), 'success');
    } catch { toast(t('failedDeleteMessage'), 'error'); }
    setDeleteTarget(null);
    setModal('none');
  }, [deleteTarget]);

  // ─── Block / unblock ──────────────────────────────────────────────────────

  const toggleBlock = useCallback(async () => {
    if (!selected || selected.room_type !== 'direct') return;
    const other = getOther(selected);
    if (!other) return;
    try {
      if (blockStatus?.i_blocked_them) {
        await API.unblockUser(other.id);
        setBlockStatus(s => s ? { ...s, i_blocked_them: false, chat_allowed: true } : s);
        toast(t('unblockedSuccess'), 'success');
      } else {
        await API.blockUser(other.id);
        setBlockStatus(s => s ? { ...s, i_blocked_them: true, chat_allowed: false } : s);
        toast(t('blockedSuccess'), 'success');
      }
      API.getBlocked().then(setBlockedList).catch(() => { });
    } catch { toast('Failed', 'error'); }
  }, [selected, blockStatus, getOther]);

  // ─── Clear chat ───────────────────────────────────────────────────────────

  const confirmClear = useCallback(async () => {
    if (!selected) return;
    try {
      await API.clearChat(selected.id);
      setMessages([]);
      setModal('none');
      toast(t('chatCleared'), 'success');
    } catch { toast(t('failedClearChat'), 'error'); }
  }, [selected]);

  // ─── Exit group ───────────────────────────────────────────────────────────

  const confirmExit = useCallback(async () => {
    if (!selected) return;
    try {
      await API.exitGroup(selected.id);
      setSelected(null);
      setConversations(prev => prev.filter(c => c.id !== selected.id));
      setModal('none');
      toast(t('exitedGroup'), 'success');
    } catch { toast(t('failedExitGroup'), 'error'); }
  }, [selected]);

  // ─── Group members ────────────────────────────────────────────────────────

  const openGroupMembers = useCallback(async () => {
    if (!selected) return;
    setModal('group-members');
    setMembersLoading(true);
    try {
      const members = await API.getGroupMembers(selected.id);
      setGroupMembers(members);
    } catch { toast(t('failedLoadConnected'), 'error'); }
    finally { setMembersLoading(false); }
  }, [selected]);

  const removeMember = useCallback(async (userId: number) => {
    if (!selected) return;
    try {
      await API.removeMembers(selected.id, [userId]);
      setGroupMembers(prev => prev.filter(m => m.user_id !== userId));
      toast(t('memberAdded'), 'success');
    } catch (error: any) {
      // Show the actual error message from the server
      const errorMessage = error?.detail || t('failedExitGroup');
      toast(errorMessage, 'error');
    }
  }, [selected]);

  const addMember = useCallback(async () => {
    if (!selected) return;
    const idStr = addMemberId || addMemberInput;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) { toast(t('userNotFoundMobile'), 'error'); return; }
    try {
      await API.addMembers(selected.id, [id]);
      setAddMemberInput('');
      setAddMemberId('');
      setModal('none');
      // Check if the added user is the current user
      if (id === Number(currentUser?.id)) {
        toast(t('memberAdded'), 'success');
      } else {
        toast(t('memberAdded'), 'success');
      }
    } catch (e: any) {
      toast(e.message ?? t('failedAddMember'), 'error');
    }
  }, [selected, addMemberInput, addMemberId, currentUser]);

  // ─── New chat ─────────────────────────────────────────────────────────────

  const handleNewDirect = useCallback(async () => {
    const inp = newChatInput.trim();
    if (!inp) return;
    let userId: number | null = null;
    const suggestions = await API.mobileSearch(inp);
    if (suggestions.length > 0) userId = suggestions[0].id;
    else userId = parseInt(inp, 10);
    if (!userId || isNaN(userId)) { toast(t('userNotFoundMobile'), 'error'); return; }
    try {
      const conv = await API.createDirect(userId);
      setConversations(prev =>
        prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]
      );
      setSelected(conv);
      setModal('none');
      setNewChatInput('');
      setSearchSuggestions([]);
    } catch { toast(t('failedCreateChat'), 'error'); }
  }, [newChatInput]);

  const handleNewGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name || !newGroupMembers.trim()) {
      toast('Group name and members required', 'error'); return;
    }
    const parts = newGroupMembers.split(',').map(s => s.trim()).filter(Boolean);
    const ids: number[] = [];
    for (const p of parts) {
      const suggestions = await API.mobileSearch(p);
      if (suggestions.length > 0) ids.push(suggestions[0].id);
      else {
        const n = parseInt(p, 10);
        if (!isNaN(n)) ids.push(n);
        else { toast(`Invalid member: ${p}`, 'error'); return; }
      }
    }
    try {
      const conv = await API.createGroup(name, ids);
      setConversations(prev =>
        prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]
      );
      setSelected(conv);
      setModal('none');
      setNewGroupName('');
      setNewGroupMembers('');
    } catch { toast('Failed to create group', 'error'); }
  }, [newGroupName, newGroupMembers]);

  const handleNickname = useCallback(async () => {
    if (!selected) return;
    const other = getOther(selected);
    if (!other || !nicknameInput.trim()) return;
    try {
      await API.setNickname(other.id, nicknameInput.trim());
      setNicknames(prev => ({ ...prev, [other.id]: nicknameInput.trim() }));
      setModal('none');
      setNicknameInput('');
      toast('Nickname saved', 'success');
    } catch { toast('Failed to save nickname', 'error'); }
  }, [selected, nicknameInput, getOther]);

  // ─── Search suggestions ───────────────────────────────────────────────────

  const handleSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSearchSuggestions([]); return; }
    const results = await API.mobileSearch(q);
    setSearchSuggestions(results);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const canChat = !blockStatus || blockStatus.chat_allowed;

  return (
    <>
      {/* Global styles */}
      <style>{`
        :root {
          --bg-primary: #fffcfc;
          --bg-secondary: #ffffff;
          --bg-sidebar: #fffbfb;
          --bg-surface: #ffffff;
          --bg-hover: #fef2f2;
          --bg-active: #fee2e2;
          --border: #fecaca;
          --border-light: #fee2e2;
          --accent: #D60606;
          --accent-dim: rgba(214, 6, 6, 0.08);
          --accent-gradient: linear-gradient(135deg, #D60606 0%, #8b0000 100%);
          --text-primary: #1f0404;
          --text-secondary: #450a0a;
          --text-muted: #991b1b;
          --bubble-own: #D60606;
          --bubble-own-border: rgba(214, 6, 6, 0.1);
          --bubble-other: #ffffff;
          --bubble-other-border: #fecaca;
          --online: #22c55e;
          --font-display: 'DM Serif Display', Georgia, serif;
          --font-body: 'DM Sans', system-ui, sans-serif;
          --radius: 14px;
          --radius-lg: 24px;
          --shadow: 0 10px 40px rgba(214, 6, 6, 0.05);
        }
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .chat-root {
          display: flex;
          height: calc(100dvh - 120px);
          background: var(--bg-primary);
          overflow: hidden;
          font-family: var(--font-body);
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .chat-root {
            height: calc(100dvh - 84px);
          }
        }

        /* Sidebar */
        .sidebar {
          width: 380px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: var(--bg-sidebar);
          transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          position: relative;
          z-index: 10;
        }
        .sidebar-header {
          padding: 28px 24px 0;
          background: var(--bg-sidebar);
          position: relative;
        }
        .sidebar-header::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(var(--accent-dim) 1.5px, transparent 1.5px);
          background-size: 32px 32px;
          opacity: 0.2;
          pointer-events: none;
        }
        .sidebar-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        .sidebar-title h1 {
          font-family: var(--font-display);
          font-size: 28px;
          color: var(--text-primary);
          margin: 0;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        .btn-icon {
          width: 38px; height: 38px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-icon:hover {
          background: var(--accent-gradient);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);
        }
        .search-bar {
          position: relative;
          margin-bottom: 20px;
        }
        .search-bar input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-body);
          outline: none;
          transition: all 0.2s;
        }
        .search-bar input:focus { 
          border-color: var(--accent);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px var(--accent-dim);
        }
        .search-bar input::placeholder { color: var(--text-muted); }
        .search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          padding: 0 8px;
          gap: 32px;
        }
        .tab-btn {
          padding: 12px 4px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-body);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        .conv-list {
          flex: 1;
          overflow-y: auto;
          background: var(--bg-secondary);
        }
        .conv-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          border-left: 4px solid transparent;
          width: 100%;
          text-align: left;
        }
        .conv-item:hover { background: rgba(254, 243, 199, 0.4); }
        .conv-item.active { 
          background: var(--bg-active); 
          border-left-color: var(--accent);
        }
        .conv-info { flex: 1; min-width: 0; }
        .conv-name {
          font-weight: 700;
          font-size: 15px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .conv-last {
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 4px;
        }
        .unread-badge {
          background: var(--accent-gradient);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(180, 83, 9, 0.3);
        }
        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 10px;
          background: var(--bg-secondary);
        }
        .btn-primary {
          flex: 1;
          padding: 12px 16px;
          background: var(--accent-gradient);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          font-family: var(--font-body);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);
        }
        .btn-primary:hover { 
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(180, 83, 9, 0.3);
        }
        .btn-secondary {
          padding: 12px 16px;
          background: var(--bg-surface);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-family: var(--font-body);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-secondary:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Chat area */
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          min-width: 0;
          position: relative;
        }
        .chat-header {
          padding: 16px 20px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          z-index: 5;
          box-shadow: 0 1px 3px rgba(67, 20, 7, 0.05);
        }
        .chat-header-info { flex: 1; min-width: 0; }
        .chat-header-name {
          font-weight: 700;
          font-size: 16px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-header-status {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-dot.online { background: var(--online); }
        .status-dot.offline { background: var(--text-muted); }

        /* Messages */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background-color: #fcf8f3;
          background-image: 
            radial-gradient(#eaddca 1px, transparent 1px),
            radial-gradient(#eaddca 1px, #fcf8f3 1px);
          background-size: 40px 40px;
          background-position: 0 0, 20px 20px;
        }
        .date-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 16px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .date-divider::before, .date-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
          opacity: 0.5;
        }
        .msg-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 4px 0;
        }
        .msg-row.own { flex-direction: row-reverse; }
        .msg-bubble {
          max-width: min(75%, 600px);
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
          word-break: break-word;
          line-height: 1.6;
          font-size: 14.5px;
          cursor: default;
          box-shadow: 0 2px 8px rgba(67, 20, 7, 0.05);
        }
        .msg-bubble.own {
          background: #fff5f5;
          border: 1px solid var(--border);
          border-bottom-right-radius: 4px;
          color: var(--text-primary);
        }
        .msg-bubble.other {
          background: #ffffff;
          border: 1px solid var(--border-light);
          border-bottom-left-radius: 4px;
          color: var(--text-primary);
        }
        .msg-sender-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 2px;
        }
        .msg-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: flex-end;
          margin-top: 4px;
          opacity: 0.9;
        }
        .msg-time {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }
        .msg-edited {
          font-size: 10px;
          color: var(--text-muted);
          font-style: italic;
          margin-right: 4px;
        }
        .msg-deleted {
          font-style: italic;
          color: var(--text-muted);
          font-size: 13px;
        }

        /* Message options */
        .msg-options-btn {
          position: absolute;
          top: 6px; right: 6px;
          opacity: 0;
          transition: opacity 0.15s;
          background: rgba(214, 6, 6, 0.08);
          border: none;
          border-radius: 6px;
          padding: 3px 5px;
          cursor: pointer;
          color: var(--accent);
          display: flex; align-items: center;
        }
        .msg-bubble:hover .msg-options-btn { opacity: 1; }
        .msg-options-menu {
          position: absolute;
          top: 26px; right: 0;
          z-index: 100;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: var(--shadow);
          overflow: hidden;
          min-width: 150px;
        }
        .msg-option-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          font-size: 13px;
          font-family: var(--font-body);
          color: var(--text-secondary);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s;
        }
        .msg-option-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .msg-option-item.danger { color: #ef4444; }
        .msg-option-item.danger:hover { background: rgba(239,68,68,0.1); }

        /* Attachment */
        .attachment-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.07);
          border-radius: 8px;
          margin-top: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s;
        }
        .attachment-chip:hover { background: rgba(255,255,255,0.12); }

        /* Typing indicator */
        .typing-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          color: var(--text-muted);
          font-size: 12px;
        }
        .typing-dots span {
          display: inline-block;
          width: 6px; height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.2s infinite;
          margin-right: 3px;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }

        /* Input bar */
        .input-bar {
          padding: 16px 24px 24px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .reply-preview, .edit-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 10px;
          font-size: 12px;
        }
        .reply-preview {
          background: rgba(233,69,96,0.1);
          border-left: 3px solid var(--accent);
        }
        .edit-preview {
          background: rgba(59,130,246,0.1);
          border-left: 3px solid #3b82f6;
        }
        .preview-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .reply-preview .preview-label { color: var(--accent); }
        .edit-preview .preview-label { color: #3b82f6; }
        .preview-text {
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .file-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .file-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .file-chip button {
          background: none; border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          line-height: 1;
          display: flex;
        }
        .input-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 8px 8px 8px 16px;
          transition: all 0.2s;
        }
        .input-row:focus-within { 
          border-color: var(--accent);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px var(--accent-dim);
        }
        .input-field {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 15px;
          font-family: var(--font-body);
          padding: 8px 0;
          resize: none;
          line-height: 1.5;
        }
        .input-field::placeholder { color: var(--text-muted); }
        .send-btn {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: var(--accent-gradient);
          border: none;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(180, 83, 9, 0.25);
        }
        .send-btn:hover { 
          transform: scale(1.05);
          box-shadow: 0 6px 14px rgba(180, 83, 9, 0.35);
        }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* Blocked banner */
        .blocked-banner {
          padding: 16px;
          background: rgba(239,68,68,0.08);
          border-top: 1px solid rgba(239,68,68,0.2);
          text-align: center;
          color: #ef4444;
          font-size: 13px;
          font-weight: 500;
        }

        /* Empty states */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-muted);
        }
        .empty-icon {
          width: 80px; height: 80px;
          border-radius: 20px;
          background: var(--bg-surface);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
        }

        /* Header menu */
        .header-menu {
          position: absolute;
          right: 0; top: calc(100% + 8px);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow);
          overflow: hidden;
          min-width: 180px;
          z-index: 100;
        }
        .header-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-family: var(--font-body);
          color: var(--text-secondary);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s;
        }
        .header-menu-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .header-menu-item.danger { color: #ef4444; }
        .header-menu-item.danger:hover { background: rgba(239,68,68,0.1); }
        .header-menu-sep { height: 1px; background: var(--border-light); }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: var(--shadow);
          animation: modalIn 0.18s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 16px;
          font-family: var(--font-display);
        }
        .modal-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-body);
          outline: none;
          margin-bottom: 12px;
          transition: border-color 0.15s;
        }
        .modal-input:focus { border-color: var(--accent); }
        .modal-input::placeholder { color: var(--text-muted); }
        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .btn-outline {
          flex: 1;
          padding: 10px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-outline:hover { border-color: var(--text-secondary); color: var(--text-primary); }
        .btn-danger {
          flex: 1;
          padding: 10px;
          background: #ef4444;
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-danger:hover { opacity: 0.85; }

        /* Suggestions dropdown */
        .suggestions-list {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-top: -8px;
          margin-bottom: 12px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .suggestion-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.1s;
        }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: var(--bg-hover); }
        .sug-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .sug-mobile { font-size: 12px; color: var(--text-muted); }

        /* Group member row */
        .member-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          transition: background 0.1s;
        }
        .member-row:hover { background: var(--bg-hover); }
        .member-role-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .member-role-badge.admin {
          background: rgba(233,69,96,0.15);
          color: var(--accent);
        }
        .member-role-badge.member {
          background: var(--bg-hover);
          color: var(--text-muted);
        }

        /* WS status */
        .ws-indicator {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
        }
        .ws-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }
        .ws-dot.connected { background: var(--online); animation: pulse 2s infinite; }
        .ws-dot.disconnected { background: #ef4444; }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }

        /* Toast */
        .toasts {
          position: fixed;
          bottom: 24px; right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9999;
        }
        .toast-item {
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          font-family: var(--font-body);
          animation: toastIn 0.2s ease;
          box-shadow: var(--shadow);
          max-width: 300px;
        }
        .toast-item.success { background: #166534; color: #bbf7d0; border: 1px solid #166534; }
        .toast-item.error { background: #7f1d1d; color: #fecaca; border: 1px solid #7f1d1d; }
        .toast-item.info { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border); }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: none; }
        }

        /* Load more */
        .load-more-btn {
          align-self: center;
          padding: 6px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-muted);
          font-size: 12px;
          font-family: var(--font-body);
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 8px;
        }
        .load-more-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* Mobile */
        @media (max-width: 768px) {
          .chat-root { height: calc(100dvh - 80px); }
          .sidebar { width: 100%; position: absolute; top: 0; left: 0; bottom: 0; }
          .sidebar.hidden { transform: translateX(-100%); }
          .chat-area { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
          .chat-area.hidden { display: none; }
          .back-btn { display: flex !important; }
        }
        .back-btn { display: none; }
        .blocked-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .blocked-mobile { font-size: 14px; font-weight: 500; color: var(--text-primary); }
      `}</style>

      <div className="chat-root" onClick={() => { setOptionsFor(null); }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div className={`sidebar ${selected ? 'hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <h1>{t('chat')}</h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" title={t('blockedUsers')}
                  onClick={() => setModal('blocked-users')}>
                  <Shield size={16} />
                </button>
              </div>
            </div>

            <div className="search-bar">
              <Search size={15} className="search-icon" />
              <input
                placeholder={t('searchConversations')}
                value={convSearch}
                onChange={e => setConvSearch(e.target.value)}
              />
            </div>

            <div className="tabs">
              {(['all', 'direct', 'group'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  className={`tab-btn ${activeTab === tabKey ? 'active' : ''}`}
                  onClick={() => setActiveTab(tabKey)}
                >
                  {tabKey === 'all' ? t('all') : tabKey === 'direct' ? t('direct') : t('group')}
                </button>
              ))}
            </div>
          </div>

          <div className="conv-list">
            {convLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={24} color="var(--text-muted)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon"><MessageCircle size={32} color="var(--text-muted)" /></div>
                <p style={{ fontSize: 14 }}>{t('noMembersFound')}</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const name = displayName(conv);
                const isGrp = conv.room_type === 'group';
                const online = conv.other_user_status === 'online';
                return (
                  <button
                    key={conv.id}
                    className={`conv-item ${selected?.id === conv.id ? 'active' : ''}`}
                    onClick={() => setSelected(conv)}
                  >
                    <Avatar
                      name={name}
                      size="md"
                      isGroup={isGrp}
                      online={isGrp ? undefined : online}
                    />
                    <div className="conv-info">
                      <div className="conv-name">
                        {isGrp && <Hash size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                        {name}
                      </div>
                      <div className="conv-last">
                        {conv.last_message?.content ?? (
                          <span style={{ fontStyle: 'italic' }}>{t('noMessages')}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {conv.last_message && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {fmtTime(conv.last_message.created_at)}
                        </span>
                      )}
                      {conv.unread_count > 0 && selected?.id !== conv.id && (
                        <span className="unread-badge">{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="sidebar-footer">
            <button className="btn-primary" onClick={() => setModal('new-chat')}>
              <Plus size={16} /> {t('startNewChat')}
            </button>
            <button className="btn-secondary" onClick={() => setModal('new-group')}>
              <Users size={15} /> {t('group')}
            </button>
          </div>
        </div>

        {/* ── CHAT AREA ─────────────────────────────────────────────────────── */}
        <div className={`chat-area ${!selected ? 'hidden' : ''}`} style={{
          display: 'flex', flexDirection: 'column',
        }}>
          {!selected ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-icon"><MessageCircle size={36} color="var(--text-muted)" /></div>
              <h2 style={{ fontSize: 18, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                {t('selectConversation')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {t('selectConversation')}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header" style={{ position: 'relative' }}>
                <button className="btn-icon back-btn"
                  style={{ display: 'flex' }}
                  onClick={() => setSelected(null)}>
                  <ArrowLeft size={18} />
                </button>

                <Avatar
                  name={displayName(selected)}
                  size="md"
                  isGroup={selected.room_type === 'group'}
                  online={selected.room_type === 'direct' ? selected.other_user_status === 'online' : undefined}
                />

                <div className="chat-header-info">
                  <div className="chat-header-name">{displayName(selected)}</div>
                  <div className="chat-header-status">
                    {selected.room_type === 'direct' ? (
                      <>
                        <div className={`status-dot ${selected.other_user_status === 'online' ? 'online' : 'offline'}`} />
                        <span style={{ color: selected.other_user_status === 'online' ? 'var(--online)' : 'var(--text-muted)' }}>
                          {selected.other_user_status === 'online' ? t('online') : t('offline')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>
                      </>
                    ) : (
                      <>
                        <Hash size={11} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>{t('group')}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>
                      </>
                    )}
                    <span className="ws-indicator">
                      <span className={`ws-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
                      <span style={{ color: wsConnected ? 'var(--online)' : 'var(--text-muted)' }}>{wsConnected ? t('Live') : t('reconnect')}</span>
                    </span>
                  </div>
                </div>

                {/* Header menu */}
                <div style={{ position: 'relative' }}>
                  <button className="btn-icon" onClick={e => {
                    e.stopPropagation();
                    setOptionsFor(o => o === -1 ? null : -1);
                  }}>
                    <MoreVertical size={18} />
                  </button>

                  {optionsFor === -1 && (
                    <div className="header-menu" onClick={e => e.stopPropagation()}>
                      {selected.room_type === 'direct' && (
                        <>
                          <button className="header-menu-item" onClick={() => {
                            setNicknameInput(nicknames[getOther(selected)?.id ?? 0] ?? '');
                            setModal('nickname');
                            setOptionsFor(null);
                          }}>
                            <Pencil size={14} /> {t('setNickname')}
                          </button>
                          <button className={`header-menu-item ${blockStatus?.i_blocked_them ? '' : 'danger'}`}
                            onClick={() => { toggleBlock(); setOptionsFor(null); }}>
                            <Shield size={14} />
                            {blockStatus?.i_blocked_them ? t('unblockUser') : t('blockUser')}
                          </button>
                        </>
                      )}
                      {selected.room_type === 'group' && (
                        <>
                          <button className="header-menu-item" onClick={() => {
                            setAddMemberInput('');
                            setAddMemberId('');
                            setSearchSuggestions([]);
                            setModal('add-member');
                            setOptionsFor(null);
                          }}>
                            <UserPlus size={14} /> {t('addMember')}
                          </button>
                          <button className="header-menu-item" onClick={() => {
                            openGroupMembers();
                            setOptionsFor(null);
                          }}>
                            <Eye size={14} /> {t('viewMember')}
                          </button>
                          <div className="header-menu-sep" />
                          <button className="header-menu-item danger" onClick={() => {
                            setModal('exit-group');
                            setOptionsFor(null);
                          }}>
                            <LogOut size={14} /> {t('exitGroup')}
                          </button>
                        </>
                      )}
                      <div className="header-menu-sep" />
                      <button className="header-menu-item danger" onClick={() => {
                        setModal('clear-chat');
                        setOptionsFor(null);
                      }}>
                        <Trash2 size={14} /> {t('clearChat')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                className="messages-area"
                ref={msgContainerRef}
                onScroll={handleScroll}
                onClick={() => setOptionsFor(null)}
              >
                {hasMore && (
                  <button
                    className="load-more-btn"
                    onClick={() => loadMessages(selected.id, offset, false)}
                    disabled={msgLoading}
                  >
                    {msgLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: 6 }} /> : <ChevronUp size={12} style={{ display: 'inline', marginRight: 6 }} />}
                    {t('loading')}
                  </button>
                )}

                {msgLoading && messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state" style={{ flex: 1 }}>
                    <div className="empty-icon"><MessageCircle size={32} color="var(--text-muted)" /></div>
                    <p style={{ fontSize: 13 }}>{t('noMessages')}</p>
                  </div>
                ) : null}

                {/* Render messages with date dividers */}
                {messages.map((msg, idx) => {
                  const prev = messages[idx - 1];
                  const showDate = !prev || !sameDay(prev.created_at, msg.created_at);
                  const own = isOwn(msg);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="date-divider">
                          {fmtDate(msg.created_at)}
                        </div>
                      )}
                      <div
                        className={`msg-row ${own ? 'own' : ''}`}
                        data-msg-id={msg.id}
                      >
                        {/* Avatar for others */}
                        {/* Avatar removed as per request */}

                        <div
                          className={`msg-bubble ${own ? 'own' : 'other'}`}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Sender name in groups */}
                          {!own && selected.room_type === 'group' && (
                            <div className="msg-sender-name">
                              {nicknames[msg.sender_id] ?? msg.sender_mobile}
                            </div>
                          )}

                          {/* Content */}
                          {msg.is_deleted ? (
                            <span className="msg-deleted">🚫 {t('failedDeleteMessage')}</span>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.content}
                            </span>
                          )}

                          {/* Attachments */}
                          {msg.attachments?.map(att => {
                            const isDownloaded = downloadedAtts.has(att.id);
                            return (
                              <div
                                key={att.id}
                                className="attachment-chip"
                                onClick={() => !isDownloaded && handleDownload(att.id, att.filename)}
                                style={{ cursor: isDownloaded ? 'default' : 'pointer', opacity: isDownloaded ? 0.8 : 1 }}
                              >
                                <FileIcon size={14} color="var(--accent)" />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isDownloaded ? 'none' : 'none' }}>
                                  {att.filename}
                                </span>
                                {isDownloaded ? (
                                  <Check size={12} color="#10b981" />
                                ) : (
                                  <Download size={12} color="var(--text-muted)" />
                                )}
                              </div>
                            );
                          })}

                          {/* Meta: time + edited + ticks */}
                          <div className="msg-meta">
                            {msg.is_edited && <span className="msg-edited">{t('edit')}</span>}
                            <span className="msg-time">{fmtTime(msg.created_at)}</span>
                            {own && <Tick msg={msg} />}
                          </div>

                          {/* Options button */}
                          {!msg.is_deleted && (
                            <button
                              className="msg-options-btn"
                              onClick={e => {
                                e.stopPropagation();
                                setOptionsFor(o => o === msg.id ? null : msg.id);
                              }}
                            >
                              <ChevronDown size={12} />
                            </button>
                          )}

                          {/* Options menu */}
                          {optionsFor === msg.id && (
                            <div className="msg-options-menu" onClick={e => e.stopPropagation()}>
                              <button className="msg-option-item" onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast('Copied', 'success');
                                setOptionsFor(null);
                              }}>
                                <Copy size={13} /> Copy
                              </button>
                              <button className="msg-option-item" onClick={() => {
                                setReplyTo(msg);
                                setOptionsFor(null);
                                inputRef.current?.focus();
                              }}>
                                <Reply size={13} /> Reply
                              </button>
                              {own && !msg.is_deleted && (
                                <>
                                  <button className="msg-option-item" onClick={() => {
                                    setEditId(msg.id);
                                    setEditContent(msg.content);
                                    setOptionsFor(null);
                                    inputRef.current?.focus();
                                  }}>
                                    <Pencil size={13} /> Edit
                                  </button>
                                  <button className="msg-option-item danger" onClick={() => {
                                    setDeleteTarget(msg.id);
                                    setModal('delete-msg');
                                    setOptionsFor(null);
                                  }}>
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="typing-row">
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                    <span>
                      {selected.room_type === 'group'
                        ? `${typingUsers.size} ${typingUsers.size === 1 ? 'person is' : 'people are'} typing`
                        : 'Typing…'}
                    </span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              {!canChat ? (
                <div className="blocked-banner">
                  {blockStatus?.i_blocked_them
                    ? 'You have blocked this user. Unblock to send messages.'
                    : 'You cannot reply — this user has restricted messages.'}
                </div>
              ) : (
                <div className="input-bar">
                  {/* Reply preview */}
                  {replyTo && (
                    <div className="reply-preview">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="preview-label">Reply to</div>
                        <div className="preview-text">{replyTo.content}</div>
                      </div>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => setReplyTo(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Edit preview */}
                  {editId && (
                    <div className="edit-preview">
                      <Pencil size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="preview-label">Editing</div>
                        <div className="preview-text">{editContent}</div>
                      </div>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => { setEditId(null); setEditContent(''); }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* File chips */}
                  {files.length > 0 && (
                    <div className="file-chips">
                      {files.map((f, i) => (
                        <div className="file-chip" key={i}>
                          <FileIcon size={12} color="var(--accent)" />
                          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                          <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSend}>
                    <div className="input-row">
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ border: 'none', background: 'none', flexShrink: 0 }}
                        onClick={() => fileRef.current?.click()}
                      >
                        <Paperclip size={18} color="var(--text-muted)" />
                      </button>
                      <input
                        type="file"
                        ref={fileRef}
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => setFiles(Array.from(e.target.files ?? []))}
                        accept="image/jpeg,image/png,application/pdf,text/plain"
                      />
                      <input
                        ref={inputRef}
                        className="input-field"
                        placeholder={t('typeMessage')}
                        value={editId ? editContent : input}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="send-btn"
                        disabled={sending || (!(editId ? editContent : input).trim() && files.length === 0)}
                      >
                        {sending
                          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Send size={16} />}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────────── */}

        {/* New Direct Chat */}
        {modal === 'new-chat' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t('startNewChat')}</div>
              <input
                className="modal-input"
                placeholder={t('enterMobileNumber')}
                value={newChatInput}
                autoFocus
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewChatInput(v);
                  handleSearch(v);
                }}
                onKeyDown={e => e.key === 'Enter' && handleNewDirect()}
              />
              {searchSuggestions.length > 0 && (
                <div className="suggestions-list">
                  {searchSuggestions.map((s: any) => (
                    <div className="suggestion-item" key={s.id}
                      onClick={() => { setNewChatInput(s.mobile_number); setSearchSuggestions([]); }}>
                      <div className="sug-name">{s.full_name ?? s.mobile_number}</div>
                      <div className="sug-mobile">{s.mobile_number}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => { setModal('none'); setSearchSuggestions([]); }}>{t('cancel')}</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleNewDirect}>{t('startChat')}</button>
              </div>
            </div>
          </div>
        )}

        {/* New Group */}
        {modal === 'new-group' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t('createGroup')}</div>
              <input
                className="modal-input"
                placeholder={t('groupName')}
                value={newGroupName}
                autoFocus
                onChange={e => setNewGroupName(e.target.value)}
              />
              <input
                className="modal-input"
                placeholder={t('enterMobileNumbers')}
                value={newGroupMembers}
                onChange={e => {
                  const v = e.target.value.replace(/[^\d,]/g, '');
                  setNewGroupMembers(v);
                  const parts = v.split(',');
                  const last = parts[parts.length - 1].trim();
                  if (last.length >= 3) handleSearch(last);
                  else setSearchSuggestions([]);
                }}
              />
              {searchSuggestions.length > 0 && (
                <div className="suggestions-list">
                  {searchSuggestions.map((s: any) => (
                    <div className="suggestion-item" key={s.id} onClick={() => {
                      const parts = newGroupMembers.split(',');
                      parts[parts.length - 1] = s.mobile_number;
                      setNewGroupMembers(parts.join(',') + ',');
                      setSearchSuggestions([]);
                    }}>
                      <div className="sug-name">{s.full_name ?? s.mobile_number}</div>
                      <div className="sug-mobile">{s.mobile_number}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => { setModal('none'); setSearchSuggestions([]); }}>{t('cancel')}</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleNewGroup}>{t('createGroup')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Clear Chat Confirm */}
        {modal === 'clear-chat' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}
              style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <div className="modal-title" style={{ textAlign: 'center' }}>{t('clearChatConfirm')}</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 0 }}>
                {t('clearChatDesc')}
              </p>
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setModal('none')}>{t('cancel')}</button>
                <button className="btn-danger" onClick={confirmClear}>{t('clearChat')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Message Confirm */}
        {modal === 'delete-msg' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}
              style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} color="#ef4444" />
              </div>
              <div className="modal-title" style={{ textAlign: 'center' }}>{t('deleteMessageConfirm')}</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 0 }}>
                {t('deleteMessageDesc')}
              </p>
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setModal('none')}>{t('cancel')}</button>
                <button className="btn-danger" onClick={confirmDelete}>{t('delete')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Nickname Modal */}
        {modal === 'nickname' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t('setNickname')}</div>
              <input
                className="modal-input"
                placeholder={t('enterNickname')}
                value={nicknameInput}
                autoFocus
                onChange={e => setNicknameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNickname()}
              />
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setModal('none')}>{t('cancel')}</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleNickname}>{t('save')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Users */}
        {modal === 'blocked-users' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t('blockedUsers')}</div>
              <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 8 }}>
                {blockedList.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    {t('noBlockedUsers')}
                  </p>
                ) : (
                  blockedList.map((b: any, i) => (
                    <div className="blocked-list-item" key={i}>
                      <div className="blocked-mobile">{b.blocked_mobile}</div>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={async () => {
                          try {
                            await API.unblockUser(b.blocked_id ?? b.blocked);
                            setBlockedList(p => p.filter((_, j) => j !== i));
                            toast('Unblocked', 'success');
                          } catch { toast('Failed', 'error'); }
                        }}>
                        {t('unblockUser')}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button className="btn-outline" style={{ width: '100%' }} onClick={() => setModal('none')}>{t('cancel')}</button>
            </div>
          </div>
        )}

        {/* Group Members */}
        {modal === 'group-members' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="modal-title" style={{ marginBottom: 0 }}>{t('groupMembers')}</div>
                <button className="btn-icon" onClick={() => setModal('none')}><X size={16} /></button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 8 }}>
                {membersLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : groupMembers.map(m => (
                  <div className="member-row" key={m.user_id}>
                    <Avatar name={m.profile_name ?? m.mobile_number} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.profile_name ?? m.mobile_number}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.mobile_number}</div>
                    </div>
                    <span className={`member-role-badge ${m.role}`}>{m.role}</span>
                    {m.role !== 'admin' && m.user_id !== currentUser?.id && (
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-body)' }}
                        onClick={() => removeMember(m.user_id)}
                      >
                        {t('remove')}
                      </button>
                    )}
                    {m.role === 'admin' && m.user_id !== currentUser?.id && (
                      <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Only admins can remove admins</span>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn-outline" style={{ width: '100%' }} onClick={() => setModal('none')}>{t('cancel')}</button>
            </div>
          </div>
        )}

        {/* Add Member */}
        {modal === 'add-member' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t('addMember')}</div>
              <input
                className="modal-input"
                placeholder={t('enterMobileNumber')}
                value={addMemberInput}
                autoFocus
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAddMemberInput(v);
                  handleSearch(v);
                }}
              />
              {searchSuggestions.length > 0 && (
                <div className="suggestions-list">
                  {searchSuggestions.map((s: any) => (
                    <div className="suggestion-item" key={s.id}
                      onClick={() => { setAddMemberId(String(s.id)); setAddMemberInput(s.mobile_number); setSearchSuggestions([]); }}>
                      <div className="sug-name">{s.full_name ?? s.mobile_number}</div>
                      <div className="sug-mobile">{s.mobile_number}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => { setModal('none'); setSearchSuggestions([]); }}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={addMember}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Exit Group */}
        {modal === 'exit-group' && (
          <div className="modal-overlay" onClick={() => setModal('none')}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <LogOut size={26} color="#ef4444" />
              </div>
              <div className="modal-title" style={{ textAlign: 'center' }}>Exit Group?</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 0 }}>
                You will no longer receive messages from this group.
              </p>
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setModal('none')}>Cancel</button>
                <button className="btn-danger" onClick={confirmExit}>Exit</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOASTS ─────────────────────────────────────────────────────────── */}
        <div className="toasts">
          {toasts.map(t => (
            <div key={t.id} className={`toast-item ${t.type}`}>{t.msg}</div>
          ))}
        </div>
      </div>

      {/* Spin keyframe (used inline) */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}