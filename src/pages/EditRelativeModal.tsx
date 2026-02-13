import React, { useState, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { genealogyService } from '../services/genealogyService';

interface EditRelativeModalProps {
  open: boolean;
  onClose: () => void;
  relativeId: string;
  relativeName: string;
  relativeRelation: string;
  onSuccess: (newName: string) => void;
  onError: (error: string) => void;
}

export default function EditRelativeModal({
  open,
  onClose,
  relativeId,
  relativeName,
  relativeRelation,
  onSuccess,
  onError
}: EditRelativeModalProps) {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form with current name when modal opens
  useEffect(() => {
    if (open && relativeId) {
      setNewName(relativeName);
      setError(null);
      console.log("Edit Modal Opened - ID:", relativeId, "Name:", relativeName);
    }
  }, [open, relativeName, relativeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Please enter a name');
      return;
    }

    if (newName.trim() === relativeName) {
      setError('New name must be different from current name');
      return;
    }

    // Validate relativeId
    const personId = parseInt(relativeId);
    if (!relativeId || isNaN(personId) || personId <= 0) {
      setError('Invalid person ID');
      onError('Invalid person ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Calling update API:", {
        endpoint: `/api/genealogy/persons/${personId}/update_name/`,
        payload: { name: newName.trim() }
      });
      
      // Call the API to update the name
      const response = await genealogyService.updateRelativeName(
        personId,
        newName.trim()
      );

      console.log("Update API Response:", response);

      if (response.success) {
        console.log("Name updated successfully:", response.new_name);
        // Call the success callback with the new name from response
        onSuccess(response.new_name);
        onClose();
      } else {
        const errorMsg = response.message || 'Failed to update name';
        console.error("Update failed:", errorMsg);
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (err: any) {
      console.error("Update error details:", err);
      
      let errorMessage = 'Failed to update name. Please try again.';
      
      if (err.response) {
        // Server responded with error
        console.error("Server response:", err.response);
        if (err.response.data) {
          errorMessage = err.response.data.message || 
                        err.response.data.detail || 
                        err.response.data.error ||
                        'Server error occurred';
        }
        console.error("Status code:", err.response.status);
        console.error("Request URL:", err.response.config?.url);
      } else if (err.request) {
        // Request made but no response
        console.error("No response from server:", err.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Other errors
        console.error("Error message:", err.message);
        errorMessage = err.message || errorMessage;
      }
      
      console.error("Final error to display:", errorMessage);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit Name</h2>
                <p className="text-blue-100 text-sm">Update family member's name</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              disabled={loading}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Current Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Current Name
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {relativeName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Relation
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {relativeRelation}
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Person ID: {relativeId}
            </div>
          </div>

          {/* New Name Input */}
          <div className="mb-6">
            <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-2">
              New Name *
            </label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter new name"
              disabled={loading}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Current name: <span className="font-medium">{relativeName}</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newName.trim() || newName.trim() === relativeName || !relativeId}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Name</span>
                </>
              )}
            </button>
          </div>

       
        </form>
      </div>
    </div>
  );
}