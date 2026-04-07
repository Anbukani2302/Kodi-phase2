// src/components/ConnectedPeople.tsx

import React, { useState, useEffect } from 'react';
import { X, Phone, Users, CheckCircle, Clock, AlertCircle, Send, UserCheck, UserPlus, Info } from 'lucide-react';
import api, { BASE_URL } from '../services/api';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

interface Category {
  code: string;
  label: string;
  x: number;
  y: number;
  ratio: string;
}

interface Relation {
  code: string;
  label: string;
  categories: Category[];
}

interface Person {
  id: number;
  name: string;
  gender: string;
  relation_code: string;
  relation_label: string;
  status: 'connected' | 'pending';
  x: number;
  y: number;
  ratio: string;
  is_placeholder: boolean;
  profile_picture: string | null;
}

interface DrilldownData {
  success: boolean;
  relation_code: string;
  relation_label: string;
  category: {
    code: string;
    label: string;
  };
  persons: Person[];
  total_count: number;
  connected_count: number;
}

const ConnectedPeople: React.FC = () => {
  const { t } = useLanguage();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrilldown, setSelectedDrilldown] = useState<DrilldownData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [invitationModal, setInvitationModal] = useState<{
    open: boolean;
    personId: number;
    relationCode: string;
    personName: string;
  }>({ open: false, personId: 0, relationCode: '', personName: '' });
  const [mobileNumber, setMobileNumber] = useState('');
  const [sendingInvitation, setSendingInvitation] = useState(false);

  // Block/Unblock states
  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    personId: number;
    personName: string;
    isBlocked: boolean;
  }>({ open: false, personId: 0, personName: '', isBlocked: false });
  const [blockingUser, setBlockingUser] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Hide Navbar when any modal is open
  useEffect(() => {
    const nav = document.querySelector('nav');
    if (modalOpen || invitationModal.open) {
      if (nav) nav.style.display = 'none';
      document.body.style.overflow = 'hidden';
    } else {
      if (nav) nav.style.display = '';
      document.body.style.overflow = '';
    }
    return () => {
      if (nav) nav.style.display = '';
      document.body.style.overflow = '';
    };
  }, [modalOpen, invitationModal.open]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      // Remove '/genealogy' from the path - use the correct endpoint
      const response = await api.get('/api/genealogy/connected-peoples/');
      setRelations(response.data.relations || []);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      let errorMessage = 'Failed to load connected peoples data';

      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
      } else if (err.response?.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your network connection.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch drilldown data when a category is clicked
  const handleCategoryClick = async (relationCode: string, categoryCode: string) => {
    try {
      // Remove '/genealogy' from the path - use the correct endpoint
      const response = await api.get(`/api/genealogy/relations/${relationCode}/categories/${categoryCode}/`);
      setSelectedDrilldown(response.data);
      setModalOpen(true);
    } catch (err: any) {
      console.error('Failed to fetch drilldown:', err);
      alert(err.response?.data?.error || 'Failed to load relatives');
    }
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setSelectedDrilldown(null);
  };

  // Open invitation modal
  const openInvitationModal = (personId: number, relationCode: string, personName: string) => {
    setInvitationModal({
      open: true,
      personId,
      relationCode,
      personName
    });
    setMobileNumber('');
  };

  // Close invitation modal
  const closeInvitationModal = () => {
    setInvitationModal({ open: false, personId: 0, relationCode: '', personName: '' });
    setMobileNumber('');
  };

  // Open block modal
  const openBlockModal = (personId: number, personName: string, isBlocked: boolean) => {
    setBlockModal({
      open: true,
      personId,
      personName,
      isBlocked
    });
  };

  // Close block modal
  const closeBlockModal = () => {
    setBlockModal({ open: false, personId: 0, personName: '', isBlocked: false });
  };

  // Block/Unblock user
  const handleBlockUnblock = async () => {
    try {
      setBlockingUser(true);
      
      if (blockModal.isBlocked) {
        // Unblock user
        await api.post('/api/accounts/unblock/', {
          user_id: blockModal.personId
        });
        toast.success(`${blockModal.personName} unblocked successfully`);
      } else {
        // Block user
        await api.post('/api/accounts/block/', {
          user_id: blockModal.personId
        });
        toast.success(`${blockModal.personName} blocked successfully`);
      }
      
      closeBlockModal();
      
      // Refresh the drilldown data
      if (selectedDrilldown) {
        handleCategoryClick(selectedDrilldown.relation_code, selectedDrilldown.category.code);
      }
    } catch (error: any) {
      console.error('Failed to block/unblock user:', error);
      toast.error(error.response?.data?.message || 'Failed to block/unblock user');
    } finally {
      setBlockingUser(false);
    }
  };

  // Send invitation to a placeholder person
  const sendInvitation = async () => {
    // Mobile Number Validation
    const trimmedMobile = mobileNumber.trim();
    if (trimmedMobile.length !== 10) {
      setError(t('validTenDigitError'));
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      setError(t('validPrefixError'));
      return;
    }

    try {
      setSendingInvitation(true);
      setError(null);

      const response = await api.post(`/api/genealogy/persons/${invitationModal.personId}/send_invitation/`, {
        mobile_number: mobileNumber.trim(),
        relation_to_me: invitationModal.relationCode
      });

      // Handle cases where the API returns 200 OK but the body contains an error status
      if (response.data?.status === 'no_user_found' || response.data?.code === 'user_not_found' || (response.data?.success === false && response.data?.message)) {
        throw new Error(response.data.message || 'Failed to send invitation');
      }

      toast.success(t('invitationSuccess'), {
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: '#059669',
          color: '#fff',
        },
      });

      closeInvitationModal();

      if (selectedDrilldown) {
        handleCategoryClick(selectedDrilldown.relation_code, selectedDrilldown.category.code);
      }
    } catch (err: any) {
      console.error('Failed to send invitation:', err);

      let errorMessage = 'Failed to send invitation. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSendingInvitation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600"></div>
          <Users className="absolute inset-0 m-auto text-amber-600 animate-pulse" size={24} />
        </div>
        <p className="mt-4 text-amber-800 font-medium animate-pulse">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 flex justify-center items-center p-4">
        <div className="bg-white border-b-4 border-red-500 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500 animate-bounce" size={40} />
          </div>
          <h3 className="text-red-900 font-black text-2xl mb-2 uppercase tracking-tight">{t('connectionError')}</h3>
          <p className="text-gray-600 mb-8 leading-relaxed font-medium">{error}</p>
          <button
            onClick={fetchDashboard}
            className="w-full px-6 py-4 bg-linear-to-r from-red-600 to-red-700 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-red-900"
          >
            <Clock size={20} />
            {t('reconnect')}
          </button>
        </div>
      </div>
    );
  }

  if (relations.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 flex justify-center items-center p-4">
        <div className="bg-white border-b-4 border-amber-500 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-amber-500" size={40} />
          </div>
          <h3 className="text-amber-900 font-black text-2xl mb-2 uppercase tracking-tight">{t('noRelativesYet')}</h3>
          <p className="text-gray-600 mb-8 leading-relaxed font-medium">{t('startAddingFirst')}</p>
          <button
            onClick={() => window.location.href = '/genealogy'}
            className="w-full px-6 py-4 bg-linear-to-r from-amber-600 to-amber-700 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-amber-100 transition-all active:scale-95 border-b-4 border-amber-900"
          >
            {t('goToGenealogy')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50/50 via-orange-50/30 to-amber-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center md:text-left border-b border-amber-200 pb-6 relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-amber-100 rounded-full blur-3xl opacity-50"></div>
          <h1 className="text-xl md:text-2xl font-black text-amber-900 mb-2 flex flex-col md:flex-row items-center gap-3">
  <div className="p-2 bg-linear-to-br from-amber-600 to-orange-600 rounded-2xl shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
    <Users className="text-white" size={24} />
  </div>
  <span className="bg-linear-to-r from-amber-800 to-orange-700 bg-clip-text text-transparent">
    {t('connectedPeoples')}
  </span>
</h1>
          <p className="text-amber-700 font-medium ml-0 md:ml-16 flex items-center justify-center md:justify-start gap-2">
            <Info size={16} className="text-amber-500" />
            {t('manageConnectionsSub')}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6">
            <div className="flex items-center">
              <AlertCircle className="text-red-500 mr-3" size={24} />
              <div>
                <h3 className="text-red-800 font-semibold">Connection Error</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={fetchDashboard}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && relations.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
            <div className="flex items-center">
              <Users className="text-yellow-500 mr-3" size={24} />
              <div>
                <h3 className="text-yellow-800 font-semibold">No Relatives Yet</h3>
                <p className="text-yellow-600 mt-1">Start by adding your first relative to see them here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {!loading && !error && relations.length > 0 && (
          <div className="space-y-12">
            {relations.map((relation) => (
              <div key={relation.code} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-100/50 backdrop-blur-sm">
                {/* Relation Header */}
                <div className="bg-linear-to-r from-amber-700 via-amber-800 to-amber-900 px-6 py-5">
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                    <UserCheck className="bg-white/20 p-1.5 rounded-lg" size={32} />
                    {t(relation.code) || relation.label}
                  </h2>
                </div>

                {/* Categories Grid */}
                <div className="p-4 md:p-8 bg-linear-to-b from-amber-50/20 to-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relation.categories.map((category) => (
                      <button
                        key={category.code}
                        onClick={() => handleCategoryClick(relation.code, category.code)}
                        className="bg-white border border-amber-100 p-6 rounded-2xl hover:border-orange-400 hover:shadow-2xl transition-all duration-300 text-left group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-orange-50 transition-colors"></div>
                        <div className="relative z-10">
                          <div className="font-bold text-amber-900 text-lg mb-4 flex justify-between items-center">
                            {t(category.code) || category.label}
                            <Info size={18} className="text-amber-300 group-hover:text-orange-400 transition-colors" />
                          </div>
                          <div className="text-4xl font-black text-orange-600 mb-3 tracking-tighter">{category.ratio}</div>
                          <div className="text-sm text-amber-700/70 bg-amber-50/50 px-3 py-1.5 rounded-lg inline-block">
                            <span className="font-bold text-amber-600">{category.x}</span> {t('connectedLabel')} /{' '}
                            <span className="font-bold">{category.y}</span> {t('totalLabel')}
                          </div>
                          <div className="mt-6 flex items-center text-orange-600 text-sm font-bold group-hover:translate-x-1 transition-transform">
                            {t('viewDetails')} <span className="ml-1 text-lg">→</span>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Drilldown */}
      {modalOpen && selectedDrilldown && (
        <div className="fixed inset-0 bg-amber-950/40 backdrop-blur-sm flex items-center justify-center z-200 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white/20">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-amber-800 to-orange-700 px-6 py-5 text-white relative">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black">{t(selectedDrilldown.relation_code) || selectedDrilldown.relation_label}</h3>
                    <p className="text-amber-100 text-xs md:text-sm font-medium tracking-wide uppercase opacity-80">{t(selectedDrilldown.category.code) || selectedDrilldown.category.label}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-orange-200 transition-all bg-white/10 rounded-2xl p-3 hover:bg-white/20 hover:rotate-90 shadow-inner group"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 transform translate-x-32"></div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-8 overflow-y-auto max-h-[calc(90vh-160px)] bg-linear-to-b from-amber-50/30 to-white">
              {selectedDrilldown.persons.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="text-amber-300" size={48} />
                  </div>
                  <p className="text-amber-900 font-bold text-xl uppercase tracking-widest">{t('noRelativesFound')}</p>
                  <p className="text-amber-600 mt-2">{t('startAddingPeople')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDrilldown.persons.map((person) => (
                    <div
                      key={person.id}
                      className="group flex flex-col sm:flex-row items-center sm:items-stretch justify-between p-5 border border-amber-100 rounded-2xl hover:border-orange-300 hover:shadow-xl transition-all duration-300 bg-white relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 flex-1 w-full">
                        {/* Profile Picture */}
                        <div className="relative shrink-0">
                          {person.profile_picture ? (
                            <img
                              src={person.profile_picture.startsWith('http') ? person.profile_picture : `${BASE_URL}${person.profile_picture.startsWith('/') ? person.profile_picture.substring(1) : person.profile_picture}`}
                              alt={person.name}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-100 shadow-lg group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:rotate-6 transition-transform">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {person.status === 'connected' && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-lg p-1 border-2 border-white shadow-md">
                              <CheckCircle size={12} />
                            </div>
                          )}
                        </div>

                        {/* Person Info */}
                        <div className="flex-1 text-center sm:text-left">
                          <div className="font-black text-amber-900 text-lg leading-tight mb-1">{person.name}</div>
                          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{t(person.relation_code) || person.relation_label}</div>
                          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                            {person.status === 'connected' ? (
                              <span className="inline-flex items-center text-[10px] uppercase font-black tracking-tighter text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-md">
                                {t('connectedStatus')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] uppercase font-black tracking-tighter text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md">
                                {t('pendingStatus')}
                              </span>
                            )}
                            <span className="text-orange-400 font-black px-2 py-1 bg-orange-50 rounded-md text-[10px]">{person.ratio}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {person.status === 'pending' && (
                        <button
                          onClick={() => openInvitationModal(person.id, selectedDrilldown.relation_code, person.name)}
                          className="mt-6 sm:mt-0 shrink-0 px-5 py-3 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 shadow-lg hover:shadow-orange-200 active:scale-95 flex items-center justify-center gap-2 group/btn border-b-4 border-orange-800"
                        >
                          <Send size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                          {t('inviteBtn')}
                        </button>
                      )}
                      {person.status === 'connected' && (
                        <button
                          onClick={() => openBlockModal(person.id, person.name, false)}
                          className="mt-6 sm:mt-0 shrink-0 px-5 py-3 bg-linear-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 shadow-lg hover:shadow-red-200 active:scale-95 flex items-center justify-center gap-2 group/btn border-b-4 border-red-900"
                        >
                          <UserPlus size={16} className="group-hover/btn:scale-110 transition-transform" />
                          Block
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-5 bg-amber-50/50 border-t border-amber-100">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-4 text-sm font-bold text-amber-900/60 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>{selectedDrilldown.connected_count} {t('connectedStatus')}</span>
                  </div>
                  <div className="w-px h-4 bg-amber-200"></div>
                  <span>{selectedDrilldown.total_count} {t('totalLabel')}</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-8 py-3 bg-white text-amber-900 border-2 border-amber-100 rounded-2xl hover:bg-amber-100 transition-all font-black uppercase tracking-widest text-xs"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Modal */}
      {invitationModal.open && (
        <div className="fixed inset-0 bg-amber-950/60 backdrop-blur-md flex items-center justify-center z-200 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-4xl max-w-md w-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 max-h-screen">
            {/* Modal Header - Strictly matching KODI Logo aesthetic */}
            <div className="bg-linear-to-r from-amber-800 to-amber-700 px-6 py-4 md:py-6 text-white relative">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  {/* Logo Container Style from Navbar - Smaller on mobile */}
                  <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden bg-white/10 p-0.5 shadow-inner border border-white/20 shrink-0">
                    <div className="w-full h-full bg-linear-to-br from-amber-50 to-orange-50 rounded-lg flex items-center justify-center">
                      <img
                        src="/src/images/logo.png"
                        alt="KODI Logo"
                        className="w-full h-full object-cover scale-110"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-widest leading-none mb-1">{t('sendInvitationTitle')}</h3>
                    <p className="text-amber-100/70 text-[8px] md:text-[10px] font-bold tracking-widest uppercase">{t('memberNetworkAccess')}</p>
                  </div>
                </div>
                <button
                  onClick={closeInvitationModal}
                  className="text-white hover:text-orange-200 transition-all bg-white/10 rounded-2xl p-2 md:p-3 hover:bg-white/20 hover:rotate-90 shadow-inner"
                  aria-label="Close"
                >
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>

              {/* Decorative brand elements */}
              <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-white/10 to-transparent -skew-x-12 transform translate-x-32"></div>
            </div>

            {/* Modal Body */}
            <div className="p-8 relative">
              {/* Decorative Background Element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>

              <div className="mb-8 relative z-10">
                <label className="block text-[10px] font-black text-amber-900/40 uppercase tracking-[0.3em] mb-3 ml-1">
                  {t('recipientMobileNumber')}
                </label>
                <div className={`relative group transition-all duration-300 ${error ? 'shake-animation' : ''}`}>
                  <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${error ? 'text-red-400' : 'text-amber-400 group-focus-within:text-orange-500'}`}>
                    <Phone size={22} />
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobileNumber(value);
                      if (error) setError(null);
                    }}
                    placeholder={t('tenDigitPlaceholder')}
                    className={`w-full pl-12 pr-4 py-5 bg-amber-50/30 border-2 rounded-2xl transition-all outline-hidden font-bold text-lg text-amber-900 placeholder:text-amber-200 shadow-inner ${error
                      ? 'border-red-200 focus:ring-4 focus:ring-red-50/50 focus:border-red-400'
                      : 'border-amber-100 focus:ring-4 focus:ring-orange-100/50 focus:border-orange-500'
                      }`}
                    disabled={sendingInvitation}
                    autoFocus
                  />

                  {/* Character Count */}
                  <div className="absolute right-4 top-5.5 text-[10px] font-black text-amber-900/30 uppercase tracking-tighter">
                    {mobileNumber.length}/10
                  </div>

                  {/* Error Display - Moved Below Input Box as requested */}
                  {error && (
                    <div className="mt-2 ml-1 flex items-start gap-2 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span className="text-xs font-bold leading-tight">{error}</span>
                    </div>
                  )}
                </div>

                {!error && (
                  <p className="mt-4 text-[10px] text-amber-600/60 font-black uppercase tracking-widest flex items-center gap-2 ml-1 animate-in fade-in duration-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                    {t('invitationNote')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 relative z-10">
                <button
                  onClick={sendInvitation}
                  disabled={!mobileNumber.trim() || sendingInvitation}
                  className="w-full px-6 py-5 bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_10px_20px_-5px_rgba(234,88,12,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 active:translate-y-0 border-b-4 border-orange-800 group"
                >
                  {sendingInvitation ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      {t('sendSecureInvitation')}
                    </>
                  )}
                </button>
                <button
                  onClick={closeInvitationModal}
                  className="w-full px-6 py-4 bg-white text-amber-900 border-2 border-amber-100 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all font-black uppercase tracking-[0.15em] text-xs active:scale-95"
                  disabled={sendingInvitation}
                >
                  {t('goBack')}
                </button>
              </div>
            </div>

            {/* Modal Styles */}
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-4px); }
                75% { transform: translateX(4px); }
              }
              .shake-animation {
                animation: shake 0.2s ease-in-out 0s 2;
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedPeople;