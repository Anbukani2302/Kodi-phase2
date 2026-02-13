import React, { useState, useEffect } from "react";
import { X, User, Calendar, Users } from "lucide-react";

interface AddRelativeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: { full_name: string; relation_to_me: string; dob?: string }) => void;
  initialRelation?: string;
}

export default function AddRelativeModal({
  open,
  onClose,
  onSuccess,
  initialRelation = ""
}: AddRelativeModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    relation_to_me: initialRelation,
    dob: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const relations = [
    "FATHER",
    "MOTHER",
    "ELDER_BROTHER",
    "YOUNGER_BROTHER",
    "HUSBAND",
    "WIFE",
    "DAUGHTER",
    "YOUNGER_SISTER",
    "ELDER_SISTER",
    "AHRAMAM"
  ];

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        relation_to_me: initialRelation
      }));
    }
  }, [open, initialRelation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.relation_to_me) {
      setError("Name and Relationship are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSuccess(formData);
      setFormData({ full_name: "", relation_to_me: initialRelation, dob: "" });
    } catch (err: any) {
      // Handle API errors
      if (err.response?.data) {
        const apiErrors = err.response.data;
        let errorMessage = "";

        if (typeof apiErrors === 'object') {
          Object.keys(apiErrors).forEach(key => {
            if (Array.isArray(apiErrors[key])) {
              errorMessage += `${key}: ${apiErrors[key].join(', ')}\n`;
            } else {
              errorMessage += `${key}: ${apiErrors[key]}\n`;
            }
          });
        } else {
          errorMessage = "Failed to add relative. Please try again.";
        }

        setError(errorMessage.trim());
      } else {
        setError("Failed to add relative. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add Family Member</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg whitespace-pre-line">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Relationship Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={formData.relation_to_me}
                    onChange={(e) => setFormData({ ...formData, relation_to_me: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition"
                    required
                    disabled={loading}
                  >
                    <option value="">Select relationship</option>
                    {relations.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date of Birth Field - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={loading}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Leave empty if unknown</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Saving...
                  </>
                ) : "Save Member"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}