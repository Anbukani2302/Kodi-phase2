// pages/ConnectionsPage.tsx
import React from "react";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, UserCheck, UserX, Search, Loader2, Users,
  ChevronRight, ArrowLeft, X, Info, Hash,
  Phone, User, Clock, AlertCircle, CheckCircle,
  XCircle, Copy, Trash2, Filter, Eye, Calendar,
  Heart, Share2, ArrowRight, ArrowDown, Mail,
  MapPin, Gift, Star, Award, Shield, Bell
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { connectionService, GenealogyInvitation, ConnectedPerson, Person, SearchSuggestion, SentInvitationsResponse } from '../services/connectionService';
import LoadingOverlay from './LoadingOverlay';

// Toast notification component with auto-close
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl ${type === 'success' ? 'bg-linear-to-r from-green-500 to-emerald-600' : 'bg-linear-to-r from-red-500 to-rose-600'} text-white animate-slide-up border border-white/20 backdrop-blur-sm`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      <span className="font-medium">{message}</span>
    </div>
  );
};

// Professional Genealogy Modal Component
interface GenealogyModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationData: any;
  language: string;
  t: (key: string) => string;
  onAccept?: (invitationId: number) => void;
  onReject?: (invitationId: number) => void;
}

const GenealogyModal: React.FC<GenealogyModalProps> = ({
  isOpen,
  onClose,
  invitationData,
  language,
  t,
  onAccept,
  onReject
}) => {
  if (!isOpen || !invitationData) return null;

  const { invitation, relationship_path, path_visual, your_relation_to_sender } = invitationData;

  const getGenderIcon = (gender: string) => {
    if (gender === 'M') return '👨';
    if (gender === 'F') return '👩';
    return '👤';
  };

  const getGenderColor = (gender: string) => {
    if (gender === 'M') return 'from-blue-500 to-indigo-600';
    if (gender === 'F') return 'from-pink-500 to-rose-600';
    return 'from-purple-500 to-violet-600';
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'self': return '📍';
      case 'connection': return '🔗';
      default: return '•';
    }
  };

  const getPersonBadge = (person: any) => {
    if (person.is_current_user) {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
          {language === 'ta' ? 'நீங்கள்' : 'You'}
        </span>
      );
    }
    if (person.is_placeholder) {
      return (
        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium border border-yellow-200">
          {language === 'ta' ? 'காத்திருக்கிறது' : 'Pending'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
        {/* Header with gradient */}
        <div className="sticky top-0 bg-linear-to-r from-amber-500 to-orange-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {language === 'ta' ? 'குடும்ப உறவு வரைபடம்' : 'Family Relationship Path'}
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  {language === 'ta' ? 'உங்கள் குடும்ப தொடர்பைக் காண்க' : 'View your family connection'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invitation Card */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {invitation?.invited_by?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">
                  {language === 'ta' ? 'அழைப்பாளர்' : 'Invited by'}
                </p>
                <p className="text-xl font-bold text-gray-900">{invitation?.invited_by?.name}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {invitation?.invited_by?.mobile_number}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(invitation?.created_at).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                invitation?.status === 'accepted' ? 'bg-green-100 text-green-700 border border-green-200' :
                invitation?.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {invitation?.status === 'accepted' ? (language === 'ta' ? 'ஏற்கப்பட்டது' : 'Accepted') :
                 invitation?.status === 'pending' ? (language === 'ta' ? 'நிலுவையில்' : 'Pending') :
                 invitation?.status}
              </div>
            </div>
          </div>

          {/* Ultimate Relation Card */}
          {your_relation_to_sender && (
            <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">
                  {language === 'ta' ? 'இறுதி உறவு' : 'Ultimate Relationship'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-purple-700">
                  {your_relation_to_sender.label}
                </span>
                <span className="px-3 py-1 bg-purple-200 text-purple-700 rounded-full text-sm font-medium">
                  {your_relation_to_sender.code}
                </span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                {your_relation_to_sender.explanation}
              </p>
            </div>
          )}

          {/* Path Visualization */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-800">
                {language === 'ta' ? 'உறவுப் பாதை' : 'Relationship Path'}
              </h3>
            </div>

            {/* Desktop Timeline */}
            <div className="hidden md:block overflow-x-auto pb-4">
              <div className="flex items-center justify-start gap-2 min-w-max">
                {path_visual?.map((step: any, index: number) => (
                  <React.Fragment key={index}>
                    <div className="relative group">
                      <div className={`w-48 p-4 rounded-xl border-2 transition-all duration-300 group-hover:shadow-lg group-hover:scale-105 ${
                        step.person.is_current_user ? 'border-green-400 bg-linear-to-br from-green-50 to-emerald-50' :
                        step.person.is_placeholder ? 'border-yellow-400 bg-linear-to-br from-yellow-50 to-amber-50' :
                        'border-blue-400 bg-linear-to-br from-blue-50 to-indigo-50'
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full bg-linear-to-br ${getGenderColor(step.person.gender)} flex items-center justify-center text-white font-bold shadow-md`}>
                            {getGenderIcon(step.person.gender)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate" title={step.person.name}>
                              {step.person.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">{getStepIcon(step.step_type)}</span>
                          <span className="font-medium text-gray-700">{step.relation_label || 'Self'}</span>
                        </div>
                      </div>
                    </div>
                    {index < path_visual.length - 1 && (
                      <div className="flex items-center text-orange-400">
                        <ChevronRight className="h-6 w-6 animate-pulse" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Mobile Timeline */}
            <div className="md:hidden space-y-3">
              {path_visual?.map((step: any, index: number) => (
                <div key={index} className="relative">
                  {index < path_visual.length - 1 && (
                    <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-linear-to-b from-orange-400 to-orange-600"></div>
                  )}
                  <div className={`flex items-start gap-4 p-4 rounded-xl border-2 ${
                    step.person.is_current_user ? 'border-green-400 bg-linear-to-r from-green-50 to-emerald-50' :
                    step.person.is_placeholder ? 'border-yellow-400 bg-linear-to-r from-yellow-50 to-amber-50' :
                    'border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50'
                  }`}>
                    <div className={`w-12 h-12 rounded-full bg-linear-to-br ${getGenderColor(step.person.gender)} flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0`}>
                      {getGenderIcon(step.person.gender)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{step.person.name}</p>
                        {getPersonBadge(step.person)}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm bg-white/80 px-3 py-1 rounded-full shadow-sm">
                          {step.relation_label || 'Self'}
                        </span>
                        {index < path_visual.length - 1 && (
                          <span className="text-sm text-orange-600 flex items-center gap-1">
                            <ArrowDown className="h-4 w-4" />
                            {step.relation_to_next || 'connects'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Path Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-700 text-center font-mono">
                {relationship_path?.path_string}
              </p>
            </div>
          </div>

          {/* Person Details */}
          {invitation?.person && (
            <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-gray-800">
                  {language === 'ta' ? 'நபர் விவரங்கள்' : 'Person Details'}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ta' ? 'பெயர்' : 'Name'}</p>
                  <p className="font-semibold text-gray-900 truncate">{invitation.person.full_name}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ta' ? 'பாலினம்' : 'Gender'}</p>
                  <p className="font-semibold text-gray-900">
                    {invitation.person.gender === 'M' ? '👨 ' + (language === 'ta' ? 'ஆண்' : 'Male') : 
                     invitation.person.gender === 'F' ? '👩 ' + (language === 'ta' ? 'பெண்' : 'Female') : 
                     '👤 ' + (language === 'ta' ? 'மற்றவை' : 'Other')}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ta' ? 'உறவு' : 'Relation'}</p>
                  <p className="font-semibold text-gray-900">{invitation.relation_label}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ta' ? 'நிலை' : 'Status'}</p>
                  <p className={`font-semibold ${
                    invitation.status === 'accepted' ? 'text-green-600' :
                    invitation.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {invitation.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {invitation?.status === 'pending' && !invitation?.is_expired && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => {
                  if (onAccept) onAccept(invitation.id);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2 transform hover:scale-105"
              >
                <UserCheck className="h-5 w-5" />
                {language === 'ta' ? 'ஏற்றுக்கொள்' : 'Accept'}
              </button>
              <button
                onClick={() => {
                  if (onReject) onReject(invitation.id);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-linear-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2 transform hover:scale-105"
              >
                <UserX className="h-5 w-5" />
                {language === 'ta' ? 'நிராகரி' : 'Reject'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                {language === 'ta' ? 'மூடு' : 'Close'}
              </button>
            </div>
          )}

          {invitation?.status !== 'pending' && (
            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-linear-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg font-semibold flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                {language === 'ta' ? 'மூடு' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ConnectionsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'myInvitations'>('friends');

  // State for instant UI updates
  const [receivedRequests, setReceivedRequests] = useState<GenealogyInvitation[]>([]);
  const [sentRequests, setSentRequests] = useState<GenealogyInvitation[]>([]);
  const [sentStats, setSentStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    expired: 0,
    rejected: 0,
    cancelled: 0
  });

  // Filter state
  const [invitationFilter, setInvitationFilter] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'rejected' | 'cancelled'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Genealogy states
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [connections, setConnections] = useState<ConnectedPerson[]>([]);
  const [centerPerson, setCenterPerson] = useState<Person | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Modal states
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showPersonDetails, setShowPersonDetails] = useState(false);
  const [showGenealogyModal, setShowGenealogyModal] = useState(false);
  const [genealogyData, setGenealogyData] = useState<any>(null);
  const [loadingGenealogy, setLoadingGenealogy] = useState(false);

  // UI states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Refs
  const filterRef = useRef<HTMLDivElement>(null);

  // Load data instantly
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load all data in parallel without showing loading
      await Promise.all([
        loadCurrentUserAndConnections(),
        loadReceivedRequests(),
        loadSentRequests()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadReceivedRequests = async () => {
    try {
      const data = await connectionService.getReceivedRequests();
      setReceivedRequests(data);
    } catch (error) {
      console.error('Failed to load received requests:', error);
    }
  };

  const loadSentRequests = async () => {
    try {
      const response = await connectionService.getSentRequests() as SentInvitationsResponse;
      setSentRequests(response.sent_invitations);
      if (response.stats) {
        setSentStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load sent requests:', error);
    }
  };

  const loadCurrentUserAndConnections = async () => {
    try {
      const user = await connectionService.getCurrentUserPerson();
      setCurrentUser(user);
      const data = await connectionService.getConnectedPersons(user.id);
      setCenterPerson(data.center_person);
      setConnections(data.connected_persons);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  // Handle tab changes
  useEffect(() => {
    if (activeTab === 'friends') {
      loadCurrentUserAndConnections();
    } else if (activeTab === 'requests') {
      loadReceivedRequests();
    } else if (activeTab === 'myInvitations') {
      loadSentRequests();
      setInvitationFilter('all');
    }
  }, [activeTab]);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => handleSearch(), 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // Click outside for filter
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter functions
  const getFilteredInvitations = () => {
    if (invitationFilter === 'all') return sentRequests;
    return sentRequests.filter(inv => {
      if (invitationFilter === 'pending') return inv.status === 'pending' && !inv.is_expired;
      if (invitationFilter === 'accepted') return inv.status === 'accepted';
      if (invitationFilter === 'expired') return inv.is_expired || inv.status === 'expired';
      if (invitationFilter === 'rejected') return inv.status === 'rejected';
      if (invitationFilter === 'cancelled') return inv.status === 'cancelled';
      return true;
    });
  };

  const getInvitationCounts = () => ({
    all: sentRequests.length,
    pending: sentRequests.filter(inv => inv.status === 'pending' && !inv.is_expired).length,
    accepted: sentRequests.filter(inv => inv.status === 'accepted').length,
    expired: sentRequests.filter(inv => inv.is_expired || inv.status === 'expired').length,
    rejected: sentRequests.filter(inv => inv.status === 'rejected').length,
    cancelled: sentRequests.filter(inv => inv.status === 'cancelled').length
  });

  // Actions
  const handleAccept = async (invitationId: number) => {
    try {
      await connectionService.acceptRequest(invitationId);
      showToast(
        language === 'ta' ? '✅ அழைப்பு ஏற்கப்பட்டது' : '✅ Invitation accepted',
        'success'
      );
      loadReceivedRequests();
    } catch (error) {
      showToast(
        language === 'ta' ? '❌ ஏற்பதில் பிழை' : '❌ Failed to accept',
        'error'
      );
    }
  };

  const handleReject = async (invitationId: number) => {
    try {
      await connectionService.rejectRequest(invitationId);
      showToast(
        language === 'ta' ? '✅ அழைப்பு நிராகரிக்கப்பட்டது' : '✅ Invitation rejected',
        'success'
      );
      if (activeTab === 'requests') {
        loadReceivedRequests();
      } else {
        loadSentRequests();
      }
    } catch (error) {
      showToast(
        language === 'ta' ? '❌ நிராகரிப்பதில் பிழை' : '❌ Failed to reject',
        'error'
      );
    }
  };

  const handleCancel = async (invitationId: number) => {
    try {
      setCancellingId(invitationId);
      const response = await connectionService.cancelInvitation(invitationId);
      showToast(
        response.message || (language === 'ta' ? '✅ அழைப்பு ரத்து செய்யப்பட்டது' : '✅ Invitation cancelled'),
        'success'
      );
      setSentRequests(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error) {
      showToast(
        language === 'ta' ? '❌ ரத்து செய்வதில் பிழை' : '❌ Failed to cancel',
        'error'
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewGenealogy = async (invitationId: number) => {
    try {
      setLoadingGenealogy(true);
      const response = await connectionService.getInvitationWithPath(invitationId);
      if (response?.success) {
        setGenealogyData(response);
        setShowGenealogyModal(true);
      }
    } catch (error) {
      showToast(
        language === 'ta' ? '❌ விவரங்களை ஏற்ற முடியவில்லை' : '❌ Failed to load details',
        'error'
      );
    } finally {
      setLoadingGenealogy(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      const response = await connectionService.searchPersons(searchQuery);
      setSearchResults(response.suggestions);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
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

  const loadPersonConnections = async (personId: number) => {
    try {
      const data = await connectionService.getConnectedPersons(personId);
      setCenterPerson(data.center_person);
      setConnections(data.connected_persons);
      setActiveTab('friends');
    } catch (error) {
      console.error('Failed to load person connections:', error);
    }
  };

  const handleViewPersonDetails = (person: Person) => {
    setSelectedPerson(person);
    setShowPersonDetails(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const getStatusBadge = (invitation: GenealogyInvitation) => {
    if (invitation.status === 'accepted') {
      return (
        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-green-200">
          <UserCheck className="h-3.5 w-3.5" />
          {language === 'ta' ? 'ஏற்கப்பட்டது' : 'Accepted'}
        </span>
      );
    }
    if (invitation.status === 'cancelled') {
      return (
        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-gray-200">
          <XCircle className="h-3.5 w-3.5" />
          {language === 'ta' ? 'ரத்து' : 'Cancelled'}
        </span>
      );
    }
    if (invitation.is_expired || invitation.status === 'expired') {
      return (
        <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-red-200">
          <AlertCircle className="h-3.5 w-3.5" />
          {language === 'ta' ? 'காலாவதி' : 'Expired'}
        </span>
      );
    }
    if (invitation.status === 'rejected') {
      return (
        <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-red-200">
          <UserX className="h-3.5 w-3.5" />
          {language === 'ta' ? 'நிராகரிப்பு' : 'Rejected'}
        </span>
      );
    }
    return (
      <span className="px-3 py-1.5 bg-yellow-100 text-yellow-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-yellow-200">
        <Clock className="h-3.5 w-3.5" />
        {language === 'ta' ? 'நிலுவை' : 'Pending'}
      </span>
    );
  };

  const formatMobileNumber = (mobile: string | undefined | null): string => {
    if (!mobile) return '';
    if (mobile.length === 10) {
      return `${mobile.substring(0, 3)}-${mobile.substring(3, 6)}-${mobile.substring(6)}`;
    }
    return mobile;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const counts = getInvitationCounts();

  const filterOptions = [
    { value: 'all', label: language === 'ta' ? 'அனைத்தும்' : 'All', icon: '📋', color: 'bg-gray-100 text-gray-700', activeColor: 'bg-gray-600 text-white' },
    { value: 'pending', label: language === 'ta' ? 'நிலுவை' : 'Pending', icon: '⏳', color: 'bg-yellow-100 text-yellow-700', activeColor: 'bg-yellow-600 text-white' },
    { value: 'accepted', label: language === 'ta' ? 'ஏற்கப்பட்டது' : 'Accepted', icon: '✅', color: 'bg-green-100 text-green-700', activeColor: 'bg-green-600 text-white' },
    { value: 'expired', label: language === 'ta' ? 'காலாவதி' : 'Expired', icon: '⚠️', color: 'bg-red-100 text-red-700', activeColor: 'bg-red-600 text-white' },
    { value: 'rejected', label: language === 'ta' ? 'நிராகரிப்பு' : 'Rejected', icon: '❌', color: 'bg-red-100 text-red-700', activeColor: 'bg-red-600 text-white' },
    { value: 'cancelled', label: language === 'ta' ? 'ரத்து' : 'Cancelled', icon: '🚫', color: 'bg-gray-100 text-gray-700', activeColor: 'bg-gray-600 text-white' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Genealogy Modal */}
      <GenealogyModal
        isOpen={showGenealogyModal}
        onClose={() => {
          setShowGenealogyModal(false);
          setGenealogyData(null);
        }}
        invitationData={genealogyData}
        language={language}
        t={t}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Person Details Modal */}
      {showPersonDetails && selectedPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowPersonDetails(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-linear-to-r from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold">
                    {language === 'ta' ? 'நபர் விவரங்கள்' : 'Person Details'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowPersonDetails(false)}
                  className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl">
                  {connectionService.getAvatarInitial(selectedPerson.full_name || '?')}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedPerson.full_name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {selectedPerson.gender === 'M' ? '👨 ' + (language === 'ta' ? 'ஆண்' : 'Male') : 
                       selectedPerson.gender === 'F' ? '👩 ' + (language === 'ta' ? 'பெண்' : 'Female') : 
                       '👤 ' + (language === 'ta' ? 'மற்றவை' : 'Other')}
                    </span>
                    {selectedPerson.is_current_user && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {language === 'ta' ? 'நீங்கள்' : 'You'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedPerson.mobile_number && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                  <p className="text-sm text-gray-500 mb-1">{language === 'ta' ? 'கைபேசி எண்' : 'Mobile Number'}</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-orange-500" />
                    {formatMobileNumber(selectedPerson.mobile_number)}
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowPersonDetails(false)}
                className="w-full py-3 bg-linear-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-semibold"
              >
                {language === 'ta' ? 'மூடு' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
            {language === 'ta' ? 'எனது இணைப்புகள்' : 'My Connections'}
          </h1>
          <p className="text-lg text-gray-600">
            {activeTab === 'friends' && (language === 'ta' ? 'உங்கள் குடும்ப உறுப்பினர்கள்' : 'Your family members')}
            {activeTab === 'requests' && (language === 'ta' ? 'உங்களுக்கு வந்த அழைப்புகள்' : 'Invitations received')}
            {activeTab === 'myInvitations' && (language === 'ta' ? 'நீங்கள் அனுப்பிய அழைப்புகள்' : 'Invitations sent')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder={language === 'ta' ? "பெயர் அல்லது கைபேசி மூலம் தேடுங்கள்..." : "Search by name or mobile..."}
                className="w-full pl-12 pr-12 py-4 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-lg"
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

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="border-t border-gray-200 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectPerson(result)}
                    className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-linear-to-br ${result.gender === 'M' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600'} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                        {connectionService.getAvatarInitial(result.full_name)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{result.full_name}</h4>
                        {result.mobile_number && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {formatMobileNumber(result.mobile_number)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {result.gender === 'M' ? '👨' : '👩'} {result.gender === 'M' ? (language === 'ta' ? 'ஆண்' : 'Male') : (language === 'ta' ? 'பெண்' : 'Female')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'friends', icon: Users, label: language === 'ta' ? 'குடும்பம்' : 'Family', count: connections.length },
              { id: 'requests', icon: Bell, label: language === 'ta' ? 'அழைப்புகள்' : 'Requests', count: receivedRequests.length },
              { id: 'myInvitations', icon: Mail, label: language === 'ta' ? 'என் அழைப்புகள்' : 'My Invitations', count: sentRequests.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 px-6 font-semibold transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? 'text-orange-600 bg-linear-to-b from-orange-50 to-transparent'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5 inline-block mr-2" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-500 to-orange-500"></div>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Filter Chips for My Invitations */}
            {activeTab === 'myInvitations' && sentRequests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    {language === 'ta' ? 'வடிகட்டு:' : 'Filter:'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => {
                    const count = counts[option.value as keyof typeof counts];
                    const isActive = invitationFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setInvitationFilter(option.value as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                          isActive ? option.activeColor : option.color
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isActive ? 'bg-white/30' : 'bg-white/50'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content */}
            {activeTab === 'friends' && (
              <div>
                {/* Center Person */}
                {centerPerson && (
                  <div className="mb-6 p-6 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl">
                        {connectionService.getAvatarInitial(centerPerson.full_name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-gray-900">{centerPerson.full_name}</h2>
                          {centerPerson.is_current_user && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                              {language === 'ta' ? 'நீங்கள்' : 'You'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {centerPerson.gender === 'M' ? '👨 ' + (language === 'ta' ? 'ஆண்' : 'Male') : '👩 ' + (language === 'ta' ? 'பெண்' : 'Female')}
                          </span>
                          {centerPerson.mobile_number && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {formatMobileNumber(centerPerson.mobile_number)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPersonDetails(centerPerson)}
                        className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors border border-orange-200 font-medium flex items-center gap-2"
                      >
                        <Info className="h-4 w-4" />
                        {language === 'ta' ? 'விவரங்கள்' : 'Details'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Family Members */}
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  {language === 'ta' ? 'குடும்ப உறுப்பினர்கள்' : 'Family Members'} ({connections.length})
                </h3>

                <div className="grid gap-3">
                  {connections.map((item) => (
                    <div
                      key={item.person.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-14 h-14 rounded-full bg-linear-to-br ${item.person.gender === 'M' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600'} flex items-center justify-center text-white font-bold text-xl shadow-md`}>
                            {connectionService.getAvatarInitial(item.person.full_name)}
                          </div>
                          {item.person.is_placeholder && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-xs">
                              ⏳
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{item.person.full_name}</h3>
                            {item.person.is_placeholder && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                {language === 'ta' ? 'காத்திருக்கிறது' : 'Pending'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              {item.relation_label?.label || item.relation_code}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {item.person.gender === 'M' ? '👨' : '👩'} {item.person.gender === 'M' ? (language === 'ta' ? 'ஆண்' : 'Male') : (language === 'ta' ? 'பெண்' : 'Female')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPersonDetails(item.person)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-orange-100 hover:text-orange-600 transition-all flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">{language === 'ta' ? 'பார்க்க' : 'View'}</span>
                      </button>
                    </div>
                  ))}
                </div>

                {connections.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Users className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg text-gray-500">{language === 'ta' ? 'இதுவரை குடும்ப உறுப்பினர்கள் இல்லை' : 'No family members yet'}</p>
                    <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                      {language === 'ta' ? 'மேலே உள்ள தேடல் பெட்டி மூலம் குடும்ப உறுப்பினர்களைத் தேடி இணைக்கவும்' : 'Search and connect with family members using the search box above'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4">
                {receivedRequests.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {invitation.invited_by_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        {!invitation.is_expired && invitation.status === 'pending' && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full animate-pulse"></span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-lg">{invitation.invited_by_name}</h3>
                          {getStatusBadge(invitation)}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {invitation.person_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {connectionService.formatRelationCode(invitation.original_relation_code)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {invitation.time_ago}
                          </span>
                          {invitation.invited_by_mobile && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {formatMobileNumber(invitation.invited_by_mobile)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleViewGenealogy(invitation.id)}
                        disabled={loadingGenealogy}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {loadingGenealogy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {language === 'ta' ? 'பார்க்க' : 'View'}
                      </button>
                      {!invitation.is_expired && invitation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(invitation.id)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                          >
                            <UserCheck className="h-4 w-4" />
                            {language === 'ta' ? 'ஏற்க' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleReject(invitation.id)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-linear-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                          >
                            <UserX className="h-4 w-4" />
                            {language === 'ta' ? 'நிராகரி' : 'Reject'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {receivedRequests.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Bell className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg text-gray-500">{language === 'ta' ? 'புதிய அழைப்புகள் இல்லை' : 'No new invitations'}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'myInvitations' && (
              <div className="space-y-4">
                {getFilteredInvitations().map((invitation) => (
                  <div
                    key={invitation.id}
                    className={`relative overflow-hidden rounded-xl transition-all hover:shadow-xl border-2 ${
                      invitation.status === 'accepted' ? 'border-green-200 bg-linear-to-r from-green-50 to-emerald-50' :
                      invitation.status === 'pending' && !invitation.is_expired ? 'border-yellow-200 bg-linear-to-r from-yellow-50 to-amber-50' :
                      'border-gray-200 bg-linear-to-r from-gray-50 to-gray-100'
                    }`}
                  >
                    <div className={`h-2 w-full absolute top-0 left-0 ${
                      invitation.status === 'accepted' ? 'bg-green-500' :
                      invitation.status === 'pending' && !invitation.is_expired ? 'bg-yellow-500' :
                      invitation.is_expired ? 'bg-red-500' : 'bg-gray-500'
                    }`} />

                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative">
                            <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${
                              invitation.person_gender === 'M' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600'
                            } flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                              {invitation.person_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-xs ${
                              invitation.status === 'accepted' ? 'bg-green-500 text-white' :
                              invitation.status === 'pending' && !invitation.is_expired ? 'bg-yellow-500 text-white' :
                              invitation.is_expired ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                            }`}>
                              {invitation.status === 'accepted' ? '✓' :
                               invitation.status === 'pending' && !invitation.is_expired ? '⏳' :
                               invitation.is_expired ? '!' : '✗'}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-xl font-bold text-gray-900">{invitation.person_name}</h3>
                              {getStatusBadge(invitation)}
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                                {connectionService.formatRelationCode(invitation.original_relation_code)}
                              </span>
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {invitation.to_user_name || invitation.recipient_display || invitation.person_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-4 w-4" />
                                {invitation.time_ago}
                              </span>
                              {invitation.status === 'accepted' && invitation.accepted_at && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Calendar className="h-4 w-4" />
                                  {language === 'ta' ? 'ஏற்கப்பட்டது:' : 'Accepted:'} {formatDate(invitation.accepted_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row lg:flex-col items-center gap-2 lg:min-w-32">
                          {invitation.status === 'accepted' ? (
                            <div className="w-full px-4 py-2.5 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-green-200">
                              <UserCheck className="h-4 w-4" />
                              {language === 'ta' ? 'ஏற்கப்பட்டது' : 'Accepted'}
                            </div>
                          ) : invitation.status === 'pending' && !invitation.is_expired ? (
                            <button
                              onClick={() => handleCancel(invitation.id)}
                              disabled={cancellingId === invitation.id}
                              className="w-full px-4 py-2.5 bg-linear-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                            >
                              {cancellingId === invitation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              {language === 'ta' ? 'ரத்து' : 'Cancel'}
                            </button>
                          ) : (
                            <div className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border ${
                              invitation.status === 'cancelled' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                              invitation.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                              invitation.is_expired ? 'bg-red-100 text-red-700 border-red-200' : ''
                            }`}>
                              {invitation.status === 'cancelled' && <XCircle className="h-4 w-4" />}
                              {invitation.status === 'rejected' && <UserX className="h-4 w-4" />}
                              {invitation.is_expired && <AlertCircle className="h-4 w-4" />}
                              {invitation.status === 'cancelled' && (language === 'ta' ? 'ரத்து' : 'Cancelled')}
                              {invitation.status === 'rejected' && (language === 'ta' ? 'நிராகரிப்பு' : 'Rejected')}
                              {invitation.is_expired && (language === 'ta' ? 'காலாவதி' : 'Expired')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {getFilteredInvitations().length === 0 && (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Mail className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg text-gray-500">
                      {invitationFilter === 'all'
                        ? (language === 'ta' ? 'அனுப்பப்பட்ட அழைப்புகள் இல்லை' : 'No sent invitations')
                        : (language === 'ta' ? 'அழைப்புகள் இல்லை' : 'No invitations')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}