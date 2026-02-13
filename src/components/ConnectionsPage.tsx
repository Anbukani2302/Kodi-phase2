import React from "react";
import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Search, Loader2, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { connectionService, Connection, ConnectionRequest } from '../services/connectionService';

export default function ConnectionsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'friends') {
        const data = await connectionService.getConnections();
        setConnections(data);
      } else if (activeTab === 'requests') {
        const data = await connectionService.getReceivedRequests();
        setReceivedRequests(data);
      } else if (activeTab === 'sent') {
        const data = await connectionService.getSentRequests();
        setSentRequests(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await connectionService.acceptRequest(requestId);
      loadData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await connectionService.rejectRequest(requestId);
      loadData();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleRemove = async (connectionId: number) => {
    try {
      await connectionService.removeConnection(connectionId);
      loadData();
    } catch (error) {
      console.error('Failed to remove connection:', error);
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
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-orange-700 mb-2">
            {t('connections')}
          </h1>
          <p className="text-gray-600">Manage your family connections</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserCheck className="h-5 w-5 inline-block mr-2" />
              {t('friends')}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="h-5 w-5 inline-block mr-2" />
              {t('requests')}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              {t('pending')}
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Friends List */}
            {activeTab === 'friends' && (
              <div className="space-y-4">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {connection.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{connection.user.name}</h3>
                        <p className="text-sm text-gray-500">
                          Connected since {new Date(connection.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(connection.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2"
                    >
                      <UserX className="h-4 w-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                ))}

                {connections.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No connections yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Received Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {request.sender.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.sender.name}</h3>
                        <p className="text-sm text-gray-500">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('accept')}</span>
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
                      >
                        <UserX className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('reject')}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {receivedRequests.length === 0 && (
                  <div className="text-center py-12">
                    <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests */}
            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {request.receiver.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.receiver.name}</h3>
                        <p className="text-sm text-gray-500">
                          {t('pending')} • {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                ))}

                {sentRequests.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending sent requests</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
