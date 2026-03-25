// src/components/ConnectedPeople.tsx

import React, { useState, useEffect } from 'react';
import { X, Phone, Users, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react';
import api from '../services/api'; // Import your configured axios instance

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
  }, []);

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

  // Send invitation to a placeholder person
  const sendInvitation = async () => {
    if (!mobileNumber.trim()) {
      return;
    }

    try {
      setSendingInvitation(true);
      setError(null); // Clear previous errors
      setSuccessMessage(null); // Clear previous success message
      
      // Remove '/genealogy' from the path - use the correct endpoint
      const response = await api.post(`/api/genealogy/persons/${invitationModal.personId}/send_invitation/`, {
        mobile_number: mobileNumber.trim(),
        relation_to_me: invitationModal.relationCode
      });
      
      // Show success message in modal
      if (response.data.status === 'invitation_sent') {
        setSuccessMessage(response.data.message);
      }
      
    } catch (err: any) {
      console.error('Failed to send invitation:', err);
      
      // Extract specific error message from API response
      let errorMessage = 'Failed to send invitation';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSendingInvitation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-red-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex justify-center items-center p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg max-w-md">
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
      </div>
    );
  }

  if (relations.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex justify-center items-center p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg max-w-md">
          <div className="flex items-center">
            <Users className="text-yellow-500 mr-3" size={24} />
            <div>
              <h3 className="text-yellow-800 font-semibold">No Relatives Yet</h3>
              <p className="text-yellow-600 mt-1">Start by adding your first relative to see them here.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-red-600 mb-2 flex items-center">
            <Users className="mr-3" size={36} />
            Connected Peoples
          </h1>
          <p className="text-gray-600">Manage your family connections and invitations</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
          <div className="space-y-8">
            {relations.map((relation) => (
              <div key={relation.code} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {/* Relation Header */}
                <div className="bg-linear-to-r from-red-600 to-red-700 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Users className="mr-3" size={24} />
                    {relation.label}
                  </h2>
                </div>

                {/* Categories Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relation.categories.map((category) => (
                      <button
                        key={category.code}
                        onClick={() => handleCategoryClick(relation.code, category.code)}
                        className="bg-white border-2 border-gray-200 p-6 rounded-xl hover:border-red-400 hover:shadow-lg transition-all duration-200 text-left group"
                      >
                        <div className="font-semibold text-gray-800 text-lg mb-3">{category.label}</div>
                        <div className="text-3xl font-bold text-red-600 mb-2">{category.ratio}</div>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium text-green-600">{category.x}</span> connected out of{' '}
                          <span className="font-medium">{category.y}</span> total
                        </div>
                        <div className="mt-4 text-red-600 text-sm font-medium group-hover:text-red-700">
                          View Details →
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitation Modal */}
      {invitationModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-red-600 to-red-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Send Invitation</h3>
                  <p className="text-red-100 text-sm">to {invitationModal.personName}</p>
                </div>
                <button
                  onClick={closeInvitationModal}
                  className="text-white hover:text-red-200 transition-colors bg-white/10 rounded-full p-2 hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="Enter mobile number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={sendingInvitation}
                  />
                </div>
              </div>

              {/* Success Display */}
              {successMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <CheckCircle className="text-red-600" size={16} />
                  {successMessage}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeInvitationModal}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  disabled={sendingInvitation}
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvitation}
                  disabled={!mobileNumber.trim() || sendingInvitation}
                  className="flex-1 px-4 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingInvitation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Drilldown */}
      {modalOpen && selectedDrilldown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-red-600 to-red-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{selectedDrilldown.relation_label}</h3>
                  <p className="text-red-100 text-sm">{selectedDrilldown.category.label}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-red-200 transition-colors bg-white/10 rounded-full p-2 hover:bg-white/20"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {selectedDrilldown.persons.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="text-gray-300 mx-auto mb-4" size={48} />
                  <p className="text-gray-500 text-lg">No relatives added in this category</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDrilldown.persons.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 bg-gray-50"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Profile Picture */}
                        {person.profile_picture ? (
                          <img
                            src={person.profile_picture}
                            alt={person.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Person Info */}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-lg">{person.name}</div>
                          <div className="text-sm text-gray-600 mb-2">{person.relation_label}</div>
                          <div className="flex items-center space-x-3 text-xs">
                            {person.status === 'connected' ? (
                              <span className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                <CheckCircle className="mr-1" size={14} />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                                <Clock className="mr-1" size={14} />
                                Pending
                              </span>
                            )}
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 font-medium">{person.ratio}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {person.status === 'pending' && (
                        <button
                          onClick={() => openInvitationModal(person.id, selectedDrilldown.relation_code, person.name)}
                          className="px-4 py-2 bg-linear-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 text-sm whitespace-nowrap transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <Send size={16} />
                          Send Invitation
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-green-600">{selectedDrilldown.connected_count}</span> /{' '}
                  <span className="font-semibold">{selectedDrilldown.total_count}</span> Connected
                </div>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedPeople;