import React from "react";
import { useState, useEffect } from 'react';
import { Send, Plus, Search, Users, Loader2, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { chatService, Conversation, Message } from '../services/chatService';

export default function ChatPage() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
      await chatService.markAllAsRead(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      setSending(true);
      await chatService.sendMessage({
        conversation_id: selectedConversation.id,
        content: messageInput,
        image: null,
      });

      setMessageInput('');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 bg-white border-r ${selectedConversation ? 'hidden md:block' : ''}`}>
        <div className="p-4 border-b bg-linear-to-r from-orange-600 to-amber-600">
          <h2 className="text-xl font-bold text-white mb-4">{t('chat')}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-180px)]">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors border-b ${
                selectedConversation?.id === conversation.id ? 'bg-orange-50' : ''
              }`}
            >
              <div className="w-12 h-12 bg-linear-to-brrom-orange-500 to-amber-500 rounded-full flex items-center justify-center shrink-0">
                {conversation.is_group ? (
                  <Users className="h-6 w-6 text-white" />
                ) : (
                  <span className="text-white font-bold">
                    {conversation.participants[0]?.name.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conversation.is_group
                      ? conversation.name
                      : conversation.participants[0]?.name || 'User'}
                  </h3>
                  {conversation.unread_count > 0 && (
                    <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conversation.last_message?.content || 'No messages yet'}
                </p>
              </div>
            </button>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-linear-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all">
            <Plus className="h-5 w-5" />
            <span>{t('startChat')}</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b flex items-center space-x-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden text-gray-600 hover:text-gray-900"
              >
                ←
              </button>
              <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                {selectedConversation.is_group ? (
                  <Users className="h-6 w-6 text-white" />
                ) : (
                  <span className="text-white font-bold">
                    {selectedConversation.participants[0]?.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation.is_group
                    ? selectedConversation.name
                    : selectedConversation.participants[0]?.name}
                </h3>
                <p className="text-sm text-gray-500">{t('online')}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => {
                const currentUserId = parseInt(localStorage.getItem('user') || '0');
                const isOwn = message.sender.id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs md:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                      {!isOwn && (
                        <p className="text-xs text-gray-500 mb-1 ml-2">{message.sender.name}</p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-linear-to-r from-orange-600 to-amber-600 text-white'
                            : 'bg-white text-gray-900'
                        }`}
                      >
                        <p className="wrap-break-word">{message.content}</p>
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="mt-2 rounded-lg max-w-full"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-2">
                        {new Date(message.created_at).toLocaleTimeString('ta-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No messages yet. Start a conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={t('typeMessage')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="p-3 bg-linear-to-r from-orange-600 to-amber-600 text-white rounded-full hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
