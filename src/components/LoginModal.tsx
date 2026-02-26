import React from "react";
import { useState } from 'react';
import { X, Phone, CheckCircle, Loader2, Shield, Smartphone, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import api, { ApiError } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onNavigate: (page: string) => void;
  onStepChange?: (step: 'phone' | 'otp') => void;
}

export default function LoginModal({ isOpen, onClose, onLogin, onNavigate, onStepChange }: LoginModalProps) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('phone');
    onStepChange?.('phone');
    setPhoneNumber('');
    setOtp('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

      // Validate Indian mobile number
      if (cleanedPhoneNumber.length !== 10) {
        throw new Error(t('phoneLengthError'));
      }

      // Check if number starts with valid prefix
      const validPrefixes = ['6', '7', '8', '9'];
      if (!validPrefixes.includes(cleanedPhoneNumber.charAt(0))) {
        throw new Error(t('phoneLengthError'));
      }

      const response = await api.post('/api/auth/request-otp/', {
        mobile_number: cleanedPhoneNumber,
      });

      if (response.status === 200) {
        setSuccess(t('otpSuccess'));
        setStep('otp');
        onStepChange?.('otp');
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message ||
        apiError.message ||
        t('otpFailure')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (otp.length !== 6) {
        throw new Error(t('otpLengthError'));
      }

      // Validate OTP format (only numbers)
      if (!/^\d{6}$/.test(otp)) {
        throw new Error(t('otpLengthError'));
      }

      const response = await api.post('/api/auth/verify-otp/', {
        mobile_number: phoneNumber.replace(/\D/g, ''),
        otp: otp,
      });

      if (response.status === 200) {
        // Store tokens and user data
        if (response.data.access) {
          localStorage.setItem('authToken', response.data.access);
        }
        if (response.data.refresh) {
          localStorage.setItem('refreshToken', response.data.refresh);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          // Store current user name for genealogy page
          localStorage.setItem('currentUserName', response.data.user.full_name || 'YOU');
        }

        // Explicitly set role for regular user to prevent dashboard redirect
        localStorage.setItem('userRole', 'user');

        // Clear any existing session data if exists
        sessionStorage.removeItem('currentUserName');

        onLogin();
        handleClose();
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message ||
        apiError.message ||
        t('invalidOtp')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setOtp('');
    setIsLoading(true);

    try {
      const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

      const response = await api.post('/api/auth/request-otp/', {
        mobile_number: cleanedPhoneNumber,
      });

      if (response.status === 200) {
        setSuccess(t('otpResendSuccess'));
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message ||
        apiError.message ||
        t('otpFailure')
      );
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slideUp border border-gray-100">
        {/* Header - Amber gradient to match logo */}
        <div className="bg-linear-to-r from-amber-600 to-yellow-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">{t('kodi')} {language === 'ta' ? '(KODI)' : '(Flag)'}</h2>
                <p className="text-sm opacity-90 mt-1">
                  {t('loginOtpMessage')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-black hover:bg-opacity-20 rounded-full transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>



        {/* Body */}
        <div className="p-6">
          {/* Information note from PDF */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <Smartphone className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">
                  {t('nonSmartPhoneUser')}
                </p>
                <p className="text-xs text-amber-700">
                  <Globe className="inline h-3 w-3 mr-1" />
                  <strong>WEB ONLY</strong> {t('webOnlyNotice').replace('WEB ONLY', '')}
                </p>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* User Phone Number Step */}
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mobileNumber')} ({t('india')})
                </label>
                <div className="relative">
                  {/* Country Code with custom styling */}
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <div className="flex items-center h-full bg-amber-100 border border-amber-300 rounded-l-lg pl-3 pr-3">
                      <span className="text-amber-800 font-semibold text-sm">+91</span>
                    </div>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(value);
                    }}
                    className="block w-full pl-24 pr-12 py-3.5 border border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 bg-white text-amber-900 font-medium text-lg placeholder:text-gray-400"
                    placeholder="9876543210"
                    required
                    maxLength={10}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  {t('enterSixDigit')} example: 9876543210
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-amber-600 to-yellow-700 text-white py-4 rounded-xl font-bold hover:from-amber-700 hover:to-yellow-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-[0.98] border-b-4 border-amber-800 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <span className="text-lg cursor-pointer">{t('verifyOtp')}</span>
                    <span className="ml-3 bg-white/20 text-white p-1 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </span>
                  </>
                )}
              </button>
              {/* Terms note */}
              <p className="text-xs text-gray-500 text-center mt-4">
                {t('acceptTerms')}
              </p>
            </form>
          )}



          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('enterOtp')}
                </label>
                <p className="text-sm text-gray-600 mb-1">
                  {t('otpSentTo')}: <span className="font-semibold text-amber-700">+91 {phoneNumber}</span>
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {t('enterOtpHint')}
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                    }}
                    className="block w-full px-4 py-4 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-3xl tracking-widest font-mono bg-amber-50 placeholder:text-amber-700 placeholder:opacity-70 text-amber-900"
                    placeholder="000000"
                    maxLength={6}
                    required
                    pattern="\d{6}"
                    inputMode="numeric"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 text-white py-4 rounded-xl font-bold hover:from-amber-700 hover:via-amber-600 hover:to-amber-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <span className="text-lg " >{t('verifyOtp')}</span>
                    <span className="ml-3 bg-white/20 text-white p-1 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </span>
                  </>
                )}
              </button>

              {/* Resend OTP and Back buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-amber-700 hover:text-amber-800 text-sm font-semibold disabled:opacity-50 flex items-center bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  {t('resendOtp')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    onStepChange?.('phone');
                    setOtp('');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-gray-700 hover:text-gray-800 text-sm flex items-center bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  {t('changePhone')}
                </button>
              </div>

              {/* Security note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  <p className="text-xs text-blue-700 text-center">
                    {t('securityNote')}
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-600">
              {t('help')}{' '}
              <a href="tel:+919942432293" className="text-amber-700 hover:text-amber-800 font-semibold hover:underline">
                📞 +91 99424 32293
              </a>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}