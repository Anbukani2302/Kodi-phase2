// pages/ConnectRelativeModal.tsx
import React, { useState, useEffect } from "react";
import { Phone, X, Send, User, CheckCircle, AlertCircle } from "lucide-react";
import { genealogyService } from "../services/genealogyService";

interface ConnectRelativeModalProps {
  open: boolean;
  onClose: () => void;
  relativeId: string;
  relativeName: string;
  relativeRelation: string;
  onSuccess: (message: string) => void;
  onError?: (error: string) => void;
}

export default function ConnectRelativeModal({
  open,
  onClose,
  relativeId,
  relativeName,
  relativeRelation,
  onSuccess,
  onError
}: ConnectRelativeModalProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobileNumber.trim()) {
      setError("Mobile number is required");
      return;
    }

    // Basic validation for mobile number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setResponseData(null);

      const response = await genealogyService.sendInvitation(
        parseInt(relativeId),
        mobileNumber.trim()
      );

      console.log("Invitation response:", response);

      if (response.status === "invitation_sent" || response.success) {
        setResponseData(response);
        setSuccess(true);

        // Show success message
        const successMessage = response.message || `Invitation sent successfully to ${mobileNumber}`;
        onSuccess(successMessage);

        // Auto close modal immediately so the parent toast can be seen
        handleClose();
      } else {
        const errorMsg = response.message || "Failed to send invitation";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err: any) {
      console.error("Invitation error:", err);
      const errorMsg = err.response?.data?.message || err.message || "An error occurred";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setMobileNumber("");
      setError(null);
      setSuccess(false);
      setResponseData(null);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setMobileNumber("");
      setError(null);
      setSuccess(false);
      setResponseData(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Phone className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {success ? "Invitation Sent!" : "Connect Relative"}
                </h3>
                <p className="text-sm text-gray-600">
                  {success
                    ? "Invitation has been sent successfully"
                    : `Send invitation to ${relativeName}`
                  }
                </p>
              </div>
            </div>
            {!success && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Success State */}
          {success ? (
            <div className="space-y-6">
              {/* Success Icon and Message */}
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Invitation Sent Successfully!
                </h4>
                <p className="text-gray-600">
                  {responseData?.message || `Invitation sent to ${mobileNumber}`}
                </p>
              </div>

              {/* Response Details */}
              {responseData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">
                      {responseData.status?.replace('_', ' ') || 'Success'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Invitation ID:</span>
                    <span className="font-medium text-gray-800">
                      #{responseData.invitation_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">User Status:</span>
                    <span className={`font-medium ${responseData.user_exists ? 'text-green-600' : 'text-amber-600'}`}>
                      {responseData.user_exists ? 'Existing User' : 'New User'}
                    </span>
                  </div>
                  {responseData.action_needed && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-200">
                      <AlertCircle className="text-amber-600 mt-0.5" size={16} />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 mb-1">Action Required</p>
                        <p className="text-amber-700">
                          The user needs to accept your invitation to connect.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Relative Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <User className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{relativeName}</p>
                    <p className="text-sm text-gray-600">{relativeRelation}</p>
                  </div>
                </div>
              </div>

              {/* Auto-close countdown */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Closing automatically in 3 seconds...</span>
                </div>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Relative Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <User className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{relativeName}</p>
                    <p className="text-sm text-gray-600">{relativeRelation}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Mobile Number Input */}
                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">+91</span>
                      </div>
                      <input
                        type="tel"
                        id="mobileNumber"
                        value={mobileNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length <= 10) {
                            setMobileNumber(value);
                            setError(null);
                          }
                        }}
                        className="w-full pl-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter 10-digit mobile number"
                        disabled={loading}
                        autoFocus
                        maxLength={10}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the mobile number to send invitation
                    </p>
                    {error && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 rounded border border-red-200">
                        <AlertCircle className="text-red-600 mt-0.5" size={16} />
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !mobileNumber.trim() || mobileNumber.length !== 10}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-black rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Send size={18} />
                        Send Invitation
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}