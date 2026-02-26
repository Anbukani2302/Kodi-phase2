// pages/ConnectionsPage.tsx
import React from "react";
import { useState, useEffect } from 'react';
import {
  UserPlus, UserCheck, UserX, Search, Loader2, Users,
  ChevronRight, ArrowLeft, X, Info, Hash, Calendar,
  Phone, User, Clock, AlertCircle, CheckCircle,
  XCircle, Copy, Trash2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { connectionService, GenealogyInvitation, ConnectedPerson, Person, SearchSuggestion } from '../services/connectionService';

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      <span>{message}</span>
    </div>
  );
};

export default function ConnectionsPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');

  // Invitation states
  const [receivedRequests, setReceivedRequests] = useState<GenealogyInvitation[]>([]);
  const [sentRequests, setSentRequests] = useState<GenealogyInvitation[]>([]);

  // Genealogy states
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [connections, setConnections] = useState<ConnectedPerson[]>([]);
  const [centerPerson, setCenterPerson] = useState<Person | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Person details states
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personRelations, setPersonRelations] = useState<any>(null);
  const [showPersonDetails, setShowPersonDetails] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      // Execute all 3 API calls in parallel
      await Promise.all([
        loadCurrentUserAndConnections(false), // set to false to avoid double loading state if needed
        loadReceivedRequests(false),
        loadSentRequests(false)
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Keep individual refreshers but add optional loading parameter
  const loadReceivedRequests = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await connectionService.getReceivedRequests();
      setReceivedRequests(data);
    } catch (error) {
      console.error('Failed to load received requests:', error);
      showToast(language === 'ta' ? 'அழைப்புகளை ஏற்ற முடியவில்லை' : 'Failed to load invitations', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadSentRequests = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await connectionService.getSentRequests();
      setSentRequests(data);
    } catch (error) {
      console.error('Failed to load sent requests:', error);
      showToast(language === 'ta' ? 'அனுப்பப்பட்ட அழைப்புகளை ஏற்ற முடியவில்லை' : 'Failed to load sent invitations', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadCurrentUserAndConnections = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const user = await connectionService.getCurrentUserPerson();
      setCurrentUser(user);

      const data = await connectionService.getConnectedPersons(user.id);
      setCenterPerson(data.center_person);
      setConnections(data.connected_persons);
    } catch (error) {
      console.error('Failed to load connections:', error);
      showToast(language === 'ta' ? 'உறவுகளை ஏற்ற முடியவில்லை' : 'Failed to load connections', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Re-load data if activeTab changes (optional, but good for freshness)
  useEffect(() => {
    if (activeTab === 'friends') {
      loadCurrentUserAndConnections(false);
    } else if (activeTab === 'requests') {
      loadReceivedRequests(false);
    } else if (activeTab === 'sent') {
      loadSentRequests(false);
    }
  }, [activeTab]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delayDebounce = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // ===== INVITATION METHODS =====


  const handleAccept = async (invitationId: number) => {
    try {
      await connectionService.acceptRequest(invitationId);
      showToast('Invitation accepted successfully', 'success');
      loadReceivedRequests();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      showToast('Failed to accept invitation', 'error');
    }
  };

  const handleReject = async (invitationId: number) => {
    try {
      await connectionService.rejectRequest(invitationId);
      showToast(language === 'ta' ? 'அழைப்பு நிராகரிக்கப்பட்டது' : 'Invitation rejected', 'success');
      if (activeTab === 'requests') {
        loadReceivedRequests();
      } else {
        loadSentRequests();
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      showToast(language === 'ta' ? 'நிராகரிப்பதில் பிழை' : 'Failed to reject invitation', 'error');
    }
  };

  const handleCancel = async (invitationId: number) => {
    try {
      setCancellingId(invitationId);
      const response = await connectionService.cancelInvitation(invitationId);

      // Show success message
      showToast(response.message || (language === 'ta' ? 'அழைப்பு ரத்து செய்யப்பட்டது' : 'Invitation cancelled successfully'), 'success');

      // Remove the cancelled invitation from the list
      setSentRequests(prev => prev.filter(inv => inv.id !== invitationId));

      // If person was deleted, show additional info
      if (response.person_deleted) {
        showToast(language === 'ta' ? 'தொடர்புடைய நபர் நீக்கப்பட்டார்' : 'Associated placeholder person has been removed', 'success');
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      showToast(language === 'ta' ? 'ரத்து செய்வதில் பிழை' : 'Failed to cancel invitation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // ===== SEARCH METHODS =====

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      const response = await connectionService.searchPersons(searchQuery);
      console.log("Search results:", response);

      setSearchResults(response.suggestions);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      showToast(language === 'ta' ? 'தேடலில் பிழை' : 'Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPerson = (person: SearchSuggestion) => {
    setSelectedPerson(person as unknown as Person);
    loadPersonConnections(person.id);
    setSearchResults([]);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // ===== GENEALOGY METHODS =====


  const loadPersonConnections = async (personId: number) => {
    try {
      setLoading(true);
      const data = await connectionService.getConnectedPersons(personId);
      setCenterPerson(data.center_person);
      setConnections(data.connected_persons);
    } catch (error) {
      console.error('Failed to load person connections:', error);
      showToast(language === 'ta' ? 'உறவுகளை ஏற்ற முடியவில்லை' : 'Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonDetails = async (personId: number) => {
    try {
      setLoading(true);
      const [person, relations] = await Promise.all([
        connectionService.getPersonDetails(personId),
        connectionService.getPersonRelations(personId)
      ]);
      setSelectedPerson(person);
      setPersonRelations(relations);
      setShowPersonDetails(true);
    } catch (error) {
      console.error('Failed to load person details:', error);
      showToast(language === 'ta' ? 'விவரங்களை ஏற்ற முடியவில்லை' : 'Failed to load person details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ===== HELPER METHODS =====

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const getStatusBadge = (invitation: GenealogyInvitation) => {
    if (invitation.status === 'accepted') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          {t('accepted')}
        </span>
      );
    }
    if (invitation.status === 'cancelled') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {t('cancelled')}
        </span>
      );
    }
    if (invitation.is_expired || invitation.status === 'expired') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('expired')}
        </span>
      );
    }
    if (invitation.status === 'rejected') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium flex items-center gap-1">
          <UserX className="h-3 w-3" />
          {t('rejected')}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-medium flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {t('pending')}
      </span>
    );
  };

  const handleBackToMyConnections = () => {
    if (currentUser) {
      setSelectedPerson(null);
      setShowPersonDetails(false);
      loadPersonConnections(currentUser.id);
    }
  };

  const handleViewPersonDetails = async (person: Person) => {
    try {
      setLoading(true);

      // First, set the selected person immediately so modal shows
      setSelectedPerson(person);
      setShowPersonDetails(true);

      // Then try to load additional details
      try {
        const relations = await connectionService.getPersonRelations(person.id);
        console.log("Person relations loaded:", relations);
        setPersonRelations(relations);
      } catch (relationsError) {
        console.error('Failed to load person relations:', relationsError);
        // Set empty relations so modal still shows
        setPersonRelations({ outgoing: [], incoming: [] });
        showToast('Could not load relations data', 'error');
      }

    } catch (error) {
      console.error('Failed to load person details:', error);
      showToast(language === 'ta' ? 'விவரங்களை ஏற்ற முடியவில்லை' : 'Failed to load person details', 'error');
      // Still show the modal with basic info
      setShowPersonDetails(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(language === 'ta' ? 'நகலெடுக்கப்பட்டது' : 'Copied to clipboard', 'success');
  };

  // Loading state
  if (loading && activeTab === 'friends' && !centerPerson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Toast notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-orange-700 mb-2">
            {t('connections')}
          </h1>
          <p className="text-gray-600">
            {activeTab === 'friends'
              ? (selectedPerson
                ? (language === 'ta' ? `${selectedPerson.full_name}-ன் குடும்பத்தைப் பார்க்கிறீர்கள்` : `Viewing ${selectedPerson.full_name}'s family`)
                : (language === 'ta' ? 'உங்கள் குடும்ப மர உறவுகள்' : 'Your family tree connections'))
              : (language === 'ta' ? 'உமது குடும்ப அழைப்புகளை நிர்வகிக்கவும்' : 'Manage your family invitations')
            }
          </p>
          {activeTab === 'friends' && selectedPerson && currentUser && selectedPerson.id !== currentUser.id && (
            <button
              onClick={handleBackToMyConnections}
              className="mt-2 text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToMyConnections')}
            </button>
          )}
        </div>

        {/* Persistent Search - Visible on all tabs */}
        <div className="mb-6 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              placeholder={language === 'ta' ? "பெயர் அல்லது கைபேசி மூலம் குடும்ப உறுப்பினர்களைத் தேடு..." : "Search family members by name or mobile..."}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {searchLoading && (
              <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500 animate-spin" />
            )}
            {searchQuery && !searchLoading && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-60 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
              <div className="p-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {language === 'ta' ? `${searchResults.length} முடிவுகள் கிடைத்துள்ளன` : `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                </span>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelectPerson(result)}
                  className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {connectionService.getAvatarInitial(result.full_name)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{result.full_name}</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">
                          {connectionService.formatMobileNumber(result.mobile_number)}
                        </span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {result.relation_label || (language === 'ta' ? 'இணைக்கப்பட்டுள்ளது' : 'Connected')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {result.gender === 'M' ? (language === 'ta' ? '👨 ஆண்' : '👨 Male') : (language === 'ta' ? '👩 பெண்' : '👩 Female')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${activeTab === 'friends'
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <UserCheck className="h-5 w-5 inline-block mr-2" />
              {t('familyMembers')}
              {activeTab === 'friends' && centerPerson && (
                <span className="ml-2 text-sm bg-white/20 px-2 py-0.5 rounded-full">
                  {connections.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${activeTab === 'requests'
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <UserPlus className="h-5 w-5 inline-block mr-2" />
              {t('requests')}
              {receivedRequests.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {receivedRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${activeTab === 'sent'
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              {t('pending')}
              {sentRequests.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {sentRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* FRIENDS TAB */}
            {activeTab === 'friends' && (
              <div className="space-y-4">
                {centerPerson && (
                  <div className="mb-6 p-4 bg-linear-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-2xl">
                          {connectionService.getAvatarInitial(centerPerson.full_name)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">
                          {centerPerson.full_name}
                          {centerPerson.is_current_user && (
                            <span className="ml-2 text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                              {t('you')}
                            </span>
                          )}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {centerPerson.gender === 'M' ? (language === 'ta' ? 'ஆண்' : 'Male') : (language === 'ta' ? 'பெண்' : 'Female')}
                          </span>
                          {centerPerson.mobile_number && (
                            <span className="text-sm bg-blue-100 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {connectionService.formatMobileNumber(centerPerson.mobile_number)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPersonDetails(centerPerson)}
                        className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors flex items-center space-x-2"
                      >
                        <Info className="h-4 w-4" />
                        <span>{t('details')}</span>
                      </button>
                    </div>
                  </div>
                )}

                <h3 className="font-semibold text-gray-700 mb-3">
                  {t('familyMembers')} ({connections.length})
                </h3>

                {connections.map((item) => (
                  <div
                    key={item.person.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {connectionService.getAvatarInitial(item.person.full_name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {item.person.full_name}
                          {item.person.is_placeholder && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              {t('pending')}
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm font-medium text-orange-600">
                            {item.relation_label?.label || item.relation_code}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {item.person.gender === 'M' ? (language === 'ta' ? 'ஆண்' : 'Male') : (language === 'ta' ? 'பெண்' : 'Female')}
                          </span>
                          {item.person.mobile_number && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {connectionService.formatMobileNumber(item.person.mobile_number)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPersonDetails(item.person)}
                      className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors flex items-center space-x-2"
                    >
                      <span>{t('view')}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {connections.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{language === 'ta' ? 'இதுவரை குடும்ப உறவுகள் இல்லை' : 'No family connections yet'}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {language === 'ta' ? 'மேலே உள்ள தேடல் பெட்டி மூலம் குடும்ப உறுப்பினர்களைத் தேடி இணைக்கவும்' : 'Search and add family members above'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {receivedRequests.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {invitation.invited_by_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {invitation.invited_by_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600">
                            {language === 'ta' ? 'உங்களை அழைத்தவர்:' : 'Invited you as:'} <span className="font-medium text-orange-600">{invitation.person_name}</span>
                          </p>
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                            {connectionService.formatRelationCode(invitation.original_relation_code)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{invitation.time_ago}</span>
                          {invitation.invited_by_mobile && (
                            <>
                              <span>•</span>
                              <Phone className="h-3 w-3" />
                              <span>{connectionService.formatMobileNumber(invitation.invited_by_mobile)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(invitation)}
                      {!invitation.is_expired && invitation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(invitation.id)}
                            className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-1"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('accept')}</span>
                          </button>
                          <button
                            onClick={() => handleReject(invitation.id)}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
                          >
                            <UserX className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('reject')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {receivedRequests.length === 0 && (
                  <div className="text-center py-12">
                    <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{language === 'ta' ? 'நிலுவையில் உள்ள அழைப்புகள் இல்லை' : 'No pending invitations'}</p>
                  </div>
                )}
              </div>
            )}

            {/* SENT TAB */}
            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentRequests.length > 0 && (
                  <div className="flex gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
                    <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      {t('pending')}: {sentRequests.filter(inv => inv.status === 'pending').length}
                    </span>
                    <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {t('accepted')}: {sentRequests.filter(inv => inv.status === 'accepted').length}
                    </span>
                    <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">
                      {t('expired')}: {sentRequests.filter(inv => inv.is_expired).length}
                    </span>
                  </div>
                )}

                {sentRequests.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${invitation.status === 'accepted'
                      ? 'bg-green-50 border border-green-200'
                      : invitation.status === 'cancelled'
                        ? 'bg-gray-50 border border-gray-200 opacity-75'
                        : invitation.is_expired
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      } transition-colors`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Avatar with status indicator */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invitation.status === 'accepted'
                          ? 'bg-linear-to-br from-green-500 to-emerald-500'
                          : invitation.status === 'cancelled'
                            ? 'bg-linear-to-br from-gray-400 to-gray-500'
                            : invitation.is_expired
                              ? 'bg-linear-to-br from-gray-400 to-gray-500'
                              : 'bg-linear-to-br from-orange-500 to-amber-500'
                          }`}>
                          <span className="text-white font-bold text-lg">
                            {invitation.person_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        {/* Status dot */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${invitation.status === 'accepted'
                          ? 'bg-green-500'
                          : invitation.status === 'cancelled'
                            ? 'bg-gray-500'
                            : invitation.is_expired
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`} />
                      </div>

                      {/* Invitation details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {invitation.person_name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${invitation.person_gender === 'M'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-pink-100 text-pink-600'
                            }`}>
                            {invitation.person_gender === 'M' ? '👨 Male' : '👩 Female'}
                          </span>
                          {invitation.person_is_placeholder && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              ⏳ {language === 'ta' ? 'மாதிரி நபர்' : 'Placeholder'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            {connectionService.formatRelationCode(invitation.original_relation_code)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {language === 'ta' ? 'பெறுபவர்:' : 'To:'} {connectionService.formatMobileNumber(invitation.invited_by_mobile)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{invitation.time_ago}</span>
                          </div>

                          {invitation.status === 'accepted' && invitation.accepted_at && (
                            <div className="flex items-center gap-1 text-green-600">
                              <UserCheck className="h-3 w-3" />
                              <span>{language === 'ta' ? 'ஏற்கப்பட்டது' : 'Accepted'} {new Date(invitation.accepted_at).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US')}</span>
                            </div>
                          )}

                          {invitation.status === 'cancelled' && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <XCircle className="h-3 w-3" />
                              <span>{t('cancelled')}</span>
                            </div>
                          )}

                          {invitation.is_expired && (
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="h-3 w-3" />
                              <span>{t('expired')}</span>
                            </div>
                          )}
                        </div>

                        {/* Token display with copy button */}
                        {invitation.token && invitation.status === 'pending' && (
                          <div className="mt-2 flex items-center gap-1">
                            <code className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">
                              {invitation.token.substring(0, 8)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(invitation.token)}
                              className="text-xs text-blue-500 hover:text-blue-700 p-1"
                              title="Copy invitation link"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {invitation.status === 'accepted' ? (
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                          <UserCheck className="h-4 w-4" />
                          {t('accepted')}
                        </span>
                      ) : invitation.status === 'cancelled' ? (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          {t('cancelled')}
                        </span>
                      ) : invitation.is_expired ? (
                        <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {t('expired')}
                        </span>
                      ) : (
                        <>
                          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {t('pending')}
                          </span>
                          <button
                            onClick={() => handleCancel(invitation.id)}
                            disabled={cancellingId === invitation.id}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancel invitation"
                          >
                            {cancellingId === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{t('cancel')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {sentRequests.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">{language === 'ta' ? 'அனுப்பப்பட்ட அழைப்புகள் இல்லை' : 'No sent invitations'}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {language === 'ta' ? 'உங்கள் குடும்ப மரத்தில் சேர உறவினர்களை அழைக்கவும்' : 'Invite family members to join your family tree'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Person Details Modal */}
        {showPersonDetails && selectedPerson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPersonDetails(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-6 w-6 text-orange-600" />
                  {selectedPerson.full_name || (language === 'ta' ? 'நபர் விவரங்கள்' : 'Person Details')}
                </h2>
                <button
                  onClick={() => setShowPersonDetails(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title={language === 'ta' ? 'மூடு' : 'Close'}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info Section */}
                <div className="bg-linear-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-3xl">
                        {connectionService.getAvatarInitial(selectedPerson.full_name || '?')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedPerson.full_name || (language === 'ta' ? 'தெரியவில்லை' : 'Unknown')}
                        {selectedPerson.is_current_user && (
                          <span className="ml-2 text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            {t('you')}
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          {selectedPerson.gender === 'M' ? (language === 'ta' ? '👨 ஆண்' : '👨 Male') : selectedPerson.gender === 'F' ? (language === 'ta' ? '👩 பெண்' : '👩 Female') : (language === 'ta' ? 'மற்றவை' : 'Other')}
                        </span>
                        {selectedPerson.mobile_number && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedPerson.mobile_number}
                          </span>
                        )}
                        {selectedPerson.is_placeholder && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            ⏳ {t('pending')}
                          </span>
                        )}
                        {selectedPerson.is_verified && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            ✓ {language === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'Verified'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generation and Family Info */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {selectedPerson.generation !== undefined && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Hash className="h-4 w-4" />
                          <span className="text-sm">Generation</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedPerson.generation}
                          {selectedPerson.generation_label && (
                            <span className="text-sm text-gray-500 ml-2">
                              ({selectedPerson.generation_label})
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {selectedPerson.family_name && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{language === 'ta' ? 'குடும்பம்' : 'Family'}</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedPerson.family_name}
                          {selectedPerson.family_id && (
                            <span className="text-sm text-gray-500 ml-2">
                              ID: {selectedPerson.family_id}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Public Profile Info */}
                {selectedPerson.public_profile && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-orange-600" />
                      Profile Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">{t('firstName')}</p>
                        <p className="font-medium">{selectedPerson.public_profile.firstname || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('secondName')}</p>
                        <p className="font-medium">{selectedPerson.public_profile.secondname || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('thirdName')}</p>
                        <p className="font-medium">{selectedPerson.public_profile.thirdname || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('fatherName')}</p>
                        <p className="font-medium">
                          {[
                            selectedPerson.public_profile.fathername1,
                            selectedPerson.public_profile.fathername2
                          ].filter(Boolean).join(' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('motherName')}</p>
                        <p className="font-medium">
                          {[
                            selectedPerson.public_profile.mothername1,
                            selectedPerson.public_profile.mothername2
                          ].filter(Boolean).join(' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('preferredLanguage')}</p>
                        <p className="font-medium">
                          {selectedPerson.public_profile.preferred_language === 'ta' ? 'தமிழ் (Tamil)' :
                            selectedPerson.public_profile.preferred_language === 'en' ? 'English' :
                              selectedPerson.public_profile.preferred_language || '-'}
                        </p>
                      </div>
                      {selectedPerson.public_profile.religion && (
                        <div>
                          <p className="text-sm text-gray-500">{language === 'ta' ? 'மதம்' : 'Religion'}</p>
                          <p className="font-medium">{selectedPerson.public_profile.religion}</p>
                        </div>
                      )}
                      {selectedPerson.public_profile.caste && (
                        <div>
                          <p className="text-sm text-gray-500">{language === 'ta' ? 'சாதி' : 'Caste'}</p>
                          <p className="font-medium">{selectedPerson.public_profile.caste}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      loadPersonConnections(selectedPerson.id);
                      setShowPersonDetails(false);
                    }}
                    className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Users className="h-5 w-5" />
                    {language === 'ta' ? `${selectedPerson.full_name?.split(' ')[0] || 'நபர்'}-ன் குடும்ப வரைபடத்தைக் காண்க` : `View ${selectedPerson.full_name?.split(' ')[0] || 'Person'}'s Family Tree`}
                  </button>
                  <button
                    onClick={() => setShowPersonDetails(false)}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    {language === 'ta' ? 'மூடு' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}