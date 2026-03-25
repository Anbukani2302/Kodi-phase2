import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  MapPin,
  Camera,
  Globe,
  Calendar,
  Users,
  Heart,
  Home,
  Phone,
  Map,
  ChevronRight,
  Shield,
  Lock,
  Eye,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { authService, UserProfile } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import debounce from 'lodash/debounce';
import api, { BASE_URL } from '../services/api';

interface ProfilePageProps {
  onNavigate?: (page: string) => void;
}

interface Suggestion {
  value: string;
  label: string;
  count: number;
  religions?: number;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    preferred_language: language || 'en' // Default to current language or 'en'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [mobileError, setMobileError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Suggestion states
  const [familySuggestions, setFamilySuggestions] = useState<Suggestion[]>([]);
  const [cultureSuggestions, setCultureSuggestions] = useState<Suggestion[]>([]);
  const [religionSuggestions, setReligionSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);

  const [openInfo, setOpenInfo] = useState<{
    family: boolean;
    lifestyle: boolean;
    culture: boolean;
  }>({
    family: false,
    lifestyle: false,
    culture: false
  });

  // Mother tongue dropdown state
  const [showMotherTongueDropdown, setShowMotherTongueDropdown] = useState(false);

  // Refs for scrolling to errors
  const firstnameRef = useRef<HTMLInputElement>(null);
  const dateofbirthRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  const familyInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  const lifestyleInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  const cultureInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  useEffect(() => {
    loadProfile();
  }, []);

  // Close mother tongue dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowMotherTongueDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProfile = async () => {
    try {
      setInitialLoading(true);
      setError('');
      const response = await authService.getMyProfile();
      setProfile({
        ...response,
        preferred_language: response?.preferred_language || language || 'en'
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || t('profileLoadError'));
      console.error('Failed to load profile:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  // Mobile number validation function
  const validateMobileNumber = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length !== 10) return false;
    const validPrefixes = ['6', '7', '8', '9'];
    return validPrefixes.includes(cleaned.charAt(0));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(language === 'ta'
        ? 'உங்கள் உலாவி இருப்பிட சேவையை ஆதரிக்கவில்லை'
        : 'Your browser does not support location services');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${language}`
          );
          const data = await response.json();

          const address = data.address;
          const city = address.city || address.town || address.village || address.suburb || '';

          if (city) {
            setProfile(prev => ({ ...prev, present_city: city }));
            // Show success animation
            setSuccess(language === 'ta'
              ? 'இருப்பிடம் வெற்றிகரமாக பெறப்பட்டது!'
              : 'Location fetched successfully!');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setError(language === 'ta'
              ? 'நகரத்தின் பெயரைக் கண்டுபிடிக்க முடியவில்லை'
              : 'Could not find city name');
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setError(language === 'ta'
            ? 'இருப்பிடத்தை மாற்ற முடியவில்லை'
            : 'Could not reverse geocode location');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(language === 'ta'
              ? 'இருப்பிட அனுமதி மறுக்கப்பட்டது'
              : 'Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setError(language === 'ta'
              ? 'இருப்பிடம் கிடைக்கவில்லை'
              : 'Location information unavailable');
            break;
          case error.TIMEOUT:
            setError(language === 'ta'
              ? 'இருப்பிட கோரிக்கை காலாவதியானது'
              : 'Location request timed out');
            break;
          default:
            setError(language === 'ta'
              ? 'இருப்பிடத்தைப் பெற முடியவில்லை'
              : 'Could not get location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Debounced suggestion fetcher
  const fetchSuggestions = debounce(async (field: string, query: string, type: 'family' | 'culture' | 'religion') => {
    if (!query || query.length < 2) {
      if (type === 'family') setFamilySuggestions([]);
      else if (type === 'culture') setCultureSuggestions([]);
      else if (type === 'religion') setReligionSuggestions([]);
      return;
    }

    try {
      let endpoint = '';
      if (type === 'family') {
        endpoint = `/api/admin/auto-suggest/user/user_families/?q=${encodeURIComponent(query)}`;
      } else if (type === 'culture') {
        endpoint = `api/admin/auto-suggest/user/user_castes/?q=${encodeURIComponent(query)}`;
      } else if (type === 'religion') {
        endpoint = `api/admin/auto-suggest/user/user_religions/?q=${encodeURIComponent(query)}`;
      }

      const response = await api.get(endpoint);

      if (type === 'family') {
        setFamilySuggestions(response.data.suggestions || []);
      } else if (type === 'culture') {
        setCultureSuggestions(response.data.suggestions || []);
      } else if (type === 'religion') {
        setReligionSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      if (type === 'family') setFamilySuggestions([]);
      else if (type === 'culture') setCultureSuggestions([]);
      else if (type === 'religion') setReligionSuggestions([]);
    }
  }, 300);

  const handleInputChange = (
    field: keyof UserProfile,
    value: string | number | File
  ) => {
    if (formErrors && (field === 'firstname' || field === 'dateofbirth' || field === 'gender' || field === 'preferred_language')) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }

    if (field === 'contact_number' && typeof value === 'string') {
      const digitsOnly = value.replace(/\D/g, '');
      const truncated = digitsOnly.slice(0, 10);
      setProfile(prev => ({ ...prev, [field]: truncated }));

      if (truncated.length > 0) {
        const validPrefixes = ['6', '7', '8', '9'];
        if (truncated.length !== 10) {
          setMobileError(language === 'ta'
            ? 'அலைபேசி எண் 10 இலக்கங்களாக இருக்க வேண்டும்'
            : 'Mobile number must be 10 digits');
        } else if (!validPrefixes.includes(truncated.charAt(0))) {
          setMobileError(language === 'ta'
            ? 'செல்லுபடியாகும் இந்திய அலைபேசி எண்ணை உள்ளிடவும் (6, 7, 8, 9 இல் தொடங்க வேண்டும்)'
            : 'Enter a valid Indian mobile number (must start with 6, 7, 8, 9)');
        } else {
          setMobileError('');
        }
      } else {
        setMobileError('');
      }
      return;
    }

    // Handle language change
    if (field === 'preferred_language' && (value === 'ta' || value === 'en')) {
      setProfile(prev => ({ ...prev, [field]: value }));
      setLanguage(value as 'ta' | 'en');
      setShowMotherTongueDropdown(false);
      return;
    }

    setProfile(prev => ({ ...prev, [field]: value }));

    if (typeof value === 'string') {
      if (field === 'familyname1') {
        fetchSuggestions('familyname1', value, 'family');
        setActiveSuggestionField('familyname1');
      }
      if (field === 'cultureoflife') {
        fetchSuggestions('cultureoflife', value, 'culture');
        setActiveSuggestionField('cultureoflife');
      }
      if (field === 'religion') {
        fetchSuggestions('religion', value, 'religion');
        setActiveSuggestionField('religion');
      }
    }
  };

  const handleSuggestionClick = (field: string, suggestion: Suggestion) => {
    setProfile(prev => ({ ...prev, [field]: suggestion.value }));
    if (field === 'familyname1') setFamilySuggestions([]);
    else if (field === 'cultureoflife') setCultureSuggestions([]);
    else if (field === 'religion') setReligionSuggestions([]);
    setActiveSuggestionField(null);
  };

  const [formErrors, setFormErrors] = useState<{
    firstname?: string;
    dateofbirth?: string;
    gender?: string;
    preferred_language?: string;
  }>({});

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setFormErrors({});

      let hasError = false;
      const newErrors: any = {};

      if (!profile.firstname) {
        newErrors.firstname = language === 'ta' ? 'முதல் பெயர் அவசியம்' : 'First Name is required';
        hasError = true;
      }

      if (!profile.dateofbirth) {
        newErrors.dateofbirth = language === 'ta' ? 'பிறந்த தேதி அவசியம்' : 'Date of Birth is required';
        hasError = true;
      }

      if (!profile.gender) {
        newErrors.gender = language === 'ta' ? 'பாலினம் அவசியம்' : 'Gender is required';
        hasError = true;
      }

      if (!profile.preferred_language) {
        newErrors.preferred_language = language === 'ta' ? 'தாய்மொழி அவசியம்' : 'Mother Tongue is required';
        hasError = true;
      }

      if (profile.contact_number && !validateMobileNumber(profile.contact_number)) {
        setError(language === 'ta'
          ? 'அலைபேசி எண் 10 இலக்கங்களாக இருக்க வேண்டும்'
          : 'Mobile number must be 10 digits');
        setSaving(false);
        return;
      }

      if (hasError) {
        setFormErrors(newErrors);
        setError(language === 'ta' ? 'தேவையான புலங்களை நிரப்பவும்' : 'Please fill all required fields');

        if (newErrors.firstname) {
          firstnameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (newErrors.dateofbirth) {
          dateofbirthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (newErrors.gender) {
          genderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (newErrors.preferred_language) {
          languageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setSaving(false);
        return;
      }

      const profileData: Partial<UserProfile> = {
        ...profile,
        dateofbirth: profile.dateofbirth || undefined,
        age: profile.age ? parseInt(String(profile.age)) : undefined,
        preferred_language: profile.preferred_language,
      };

      console.log("Saving profile data:", profileData);

      const updatedProfile = await authService.updateMyProfile(profileData);
      setProfile(updatedProfile);

      if (updatedProfile.preferred_language && (updatedProfile.preferred_language === 'ta' || updatedProfile.preferred_language === 'en')) {
        setLanguage(updatedProfile.preferred_language);
      }

      if (updatedProfile.firstname) {
        localStorage.setItem('currentUserName', updatedProfile.firstname);
        sessionStorage.setItem('currentUserName', updatedProfile.firstname);
      }

      setSuccess(t('profileSaveSuccess'));

      setTimeout(() => {
        setSuccess('');
        navigate('/genealogy');
      }, 1500);

    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || t('error'));
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
    setMobileError('');
  };

  const handleGoToGenealogy = () => {
    navigate('/genealogy');
  };

  const toggleInfo = (type: 'family' | 'lifestyle' | 'culture') => {
    setOpenInfo(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Mother tongue options
  const languageOptions = [
    { value: 'ta', label: 'தமிழ்', nativeLabel: 'தமிழ்' },
    { value: 'en', label: 'English', nativeLabel: 'English' }
  ];

  // Suggestion dropdown component
  const SuggestionDropdown = ({
    suggestions,
    field,
    onSelect
  }: {
    suggestions: Suggestion[],
    field: string,
    onSelect: (suggestion: Suggestion) => void
  }) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm border border-amber-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-slideDown">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="w-full px-4 py-3 text-left hover:bg-linear-to-r hover:from-amber-50 hover:to-yellow-50 focus:bg-amber-50 focus:outline-none border-b border-amber-100 last:border-b-0 transition-all duration-200 group"
            onClick={() => onSelect(suggestion)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-amber-900 group-hover:text-amber-700 transition-colors">
                {suggestion.label}
              </span>
              {suggestion.count > 0 && (
                <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1 rounded-full group-hover:bg-amber-200 transition-colors">
                  {suggestion.count} {suggestion.count === 1 ? 'use' : 'uses'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-20 right-20 w-40 h-40 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-20 w-36 h-36 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
          <div className="absolute bottom-10 right-10 w-28 h-28 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-6000"></div>
        </div>

        {/* Main loading content */}
        <div className="text-center transform animate-scaleIn relative z-10">
          {/* Kodi-themed logo/icon - Using your custom logo */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>

              {/* Inner content with your logo */}
              <div className="absolute inset-4 bg-linear-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl overflow-hidden">
                <img
                  src="/src/images/logo.png"
                  alt="Kodi Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if logo doesn't load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    // Add fallback icon
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'text-center';
                    fallbackDiv.innerHTML = `
                      <div class="relative">
                        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg class="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                            <circle cx="12" cy="12" r="2"/>
                          </svg>
                        </div>
                      </div>
                    `;
                    e.currentTarget.parentElement?.appendChild(fallbackDiv);
                  }}
                />
              </div>

              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-amber-500 rounded-full -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-orange-500 rounded-full -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/2 w-2 h-2 bg-yellow-500 rounded-full -translate-y-1/2"></div>
                <div className="absolute right-0 top-1/2 w-2 h-2 bg-amber-600 rounded-full -translate-y-1/2"></div>
              </div>
            </div>
          </div>

          {/* Loading text with animation */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold bg-linear-to-r from-amber-800 via-orange-800 to-yellow-800 bg-clip-text text-transparent">
              {language === 'ta' ? 'கொடிவழி வரைபடம்' : 'Genealogy Map'}
            </h2>
            <p className="text-xl text-amber-700 font-medium animate-pulse">
              {language === 'ta' ? 'உங்கள் வம்சத்தை கண்டறிகிறோம்...' : 'Discovering your lineage...'}
            </p>

            {/* Loading dots */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-8 w-64 mx-auto">
            <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-full animate-progress"></div>
            </div>
          </div>

          {/* Version or tagline */}
          <p className="mt-6 text-sm text-amber-600 font-medium">
            {language === 'ta' ? 'உங்கள் குடும்ப வரலாறு' : 'Your Family History'}
          </p>
        </div>

        {/* Custom CSS for loading animations */}
        <style>{`
          @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          .animate-progress {
            animation: progress 2s ease-in-out infinite;
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
          .animation-delay-200 {
            animation-delay: 200ms;
          }
          .animation-delay-400 {
            animation-delay: 400ms;
          }
          .animation-delay-6000 {
            animation-delay: 6s;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Floating Decorations */}
        <div className="fixed top-20 left-10 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="fixed top-40 right-10 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="fixed bottom-20 left-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 transform animate-slideDown">
            <div className="bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-xl shadow-lg p-4">
              <div className="flex items-center">
                <div className="shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 font-medium">{success}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 transform animate-shake">
            <div className="bg-linear-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-r-xl shadow-lg p-4">
              <div className="flex items-center">
                <div className="shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Header Section */}
        <div className="text-center mb-12 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-96 h-96 bg-linear-to-r from-amber-400 to-orange-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            {/* Main title with enhanced styling */}
            <div className="inline-block relative mb-6">
              <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-amber-800 via-orange-800 to-yellow-800 bg-clip-text text-transparent mb-4 leading-tight">
                {language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
              </h1>
              {/* Decorative underline */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1.5 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-full shadow-lg"></div>
              {/* Glow effect */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1.5 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-full blur-md"></div>
            </div>

            {/* Subtitle with better typography */}
            <p className="text-xl text-amber-700 mb-8 font-medium max-w-2xl mx-auto leading-relaxed">
              {language === 'ta'
                ? 'உங்கள் குடும்ப வரலாற்றை பதிவு செய்து, வம்சத்தை தொடர்ந்து கொண்டு போங்கள்'
                : 'Record your family history and continue your lineage'}
            </p>

            {/* Enhanced Quick Action Button */}
            <button
              onClick={handleGoToGenealogy}
              className="group relative inline-flex items-center px-10 py-4 bg-linear-to-r from-amber-600 to-orange-600 text-white rounded-full font-bold text-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0"
            >
              {/* Button glow effect */}
              <span className="absolute inset-0 w-full h-full bg-white opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity"></span>

              {/* Button content */}
              <span className="relative flex items-center">
                <Map className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                {language === 'ta' ? 'கொடிவழி வரைபடம்' : 'Genealogy Map'}
                <ChevronRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </span>

              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Enhanced Privacy Notice - Neater Redesign */}
        <div className="mb-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="bg-white/80 backdrop-blur-md border border-amber-100 rounded-2xl shadow-sm p-5 relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 group-hover:bg-amber-100 transition-colors">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
                  {language === 'ta' ? 'தனியுரிமை பாதுகாப்பு' : 'Privacy Protection'}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-1">
                  {language === 'ta'
                    ? '🔒 உங்கள் விவரங்கள் குடும்ப உறுப்பினர்களுக்கு மட்டுமே காண்பிக்கப்படும்.'
                    : '🔒 Your details are visible only to connected family members.'}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                    {language === 'ta' ? 'பாதுகாக்கப்பட்டது' : 'Secured'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <Lock className="h-3 w-3" />
                  <span>{language === 'ta' ? 'இருமுனை பாதுகாப்பு' : 'End-to-end Encryption'}</span>
                </div>
              </div>
            </div>
            {/* Subtle background glow */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100/30 rounded-full blur-2xl group-hover:bg-amber-200/40 transition-colors"></div>
          </div>
        </div>

        {/* Enhanced Main Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-amber-100 relative">
          {/* Enhanced decorative elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-br from-amber-200 to-yellow-200 rounded-full filter blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-orange-200 to-amber-200 rounded-full filter blur-3xl opacity-30"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-linear-to-r from-yellow-100 to-amber-100 rounded-full filter blur-3xl opacity-20"></div>

          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-10 relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-linear-to-r from-amber-500 to-yellow-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div
                className="relative w-28 h-28 md:w-32 md:h-32 bg-linear-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-4 border-white shadow-xl transform group-hover:scale-105 transition-all duration-300"
                onClick={() => document.getElementById('profile-image-input')?.click()}
              >
                {profile.image ? (
                  <img
                    src={(() => {
                      if (!profile.image) return '';
                      if (typeof profile.image === 'string') {
                        if (profile.image.startsWith('http')) return profile.image;
                        const baseUrl = BASE_URL.replace(/\/$/, '');
                        const path = profile.image.startsWith('/') ? profile.image : `/${profile.image}`;
                        return `${baseUrl}${path}`;
                      }
                      try {
                        return URL.createObjectURL(profile.image);
                      } catch (e) {
                        return '';
                      }
                    })()}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-14 w-14 text-white" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
                  <Camera className="h-6 w-6 text-white transform group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
            <input
              id="profile-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleInputChange('image', file);
              }}
            />
            <h2 className="text-2xl font-bold text-amber-900 mt-4">
              {profile.firstname || (language === 'ta' ? 'பயனர் பெயர்' : 'User Name')}
            </h2>
          </div>

          {/* Form Sections */}
          <div className="space-y-8">
            {/* Public Details Section */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Globe className="h-5 w-5 text-amber-700" />
                </div>
                <h3 className="text-xl font-bold text-amber-800">
                  {language === 'ta' ? 'பொது விவரங்கள்' : 'Public Details'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First Name */}
                <div className="group">
                  <label className="block text-sm font-medium text-amber-700 mb-1 group-hover:text-amber-900 transition-colors">
                    {language === 'ta' ? 'முதல் பெயர்' : 'First Name'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={firstnameRef}
                      type="text"
                      value={profile.firstname || ''}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                      className={`w-full px-4 py-3 bg-amber-50/50 border-2 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200 ${formErrors.firstname
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500'
                        : 'border-amber-200 hover:border-amber-300'
                        }`}
                      placeholder={language === 'ta' ? 'உங்கள் முதல் பெயர்' : 'Your first name'}
                    />
                    {formErrors.firstname && (
                      <p className="absolute -bottom-5 left-0 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {formErrors.firstname}
                      </p>
                    )}
                  </div>
                </div>

                {/* Second Name */}
                <div className="group">
                  <label className="block text-sm font-medium text-amber-700 mb-1 group-hover:text-amber-900 transition-colors">
                    {language === 'ta' ? 'இரண்டாம் பெயர்' : 'Second Name'}
                  </label>
                  <input
                    type="text"
                    value={profile.secondname || ''}
                    onChange={(e) => handleInputChange('secondname', e.target.value)}
                    className="w-full px-4 py-3 bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200 hover:border-amber-300"
                    placeholder={language === 'ta' ? 'உங்கள் இரண்டாம் பெயர்' : 'Your second name'}
                  />
                </div>

                {/* Third Name */}
                <div className="group">
                  <label className="block text-sm font-medium text-amber-700 mb-1 group-hover:text-amber-900 transition-colors">
                    {language === 'ta' ? 'மூன்றாம் பெயர்' : 'Third Name'}
                  </label>
                  <input
                    type="text"
                    value={profile.thirdname || ''}
                    onChange={(e) => handleInputChange('thirdname', e.target.value)}
                    className="w-full px-4 py-3 bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200 hover:border-amber-300"
                    placeholder={language === 'ta' ? 'உங்கள் மூன்றாம் பெயர்' : 'Your third name'}
                  />
                </div>

                {/* Gender */}
                <div className="group">
                  <label className="block text-sm font-medium text-amber-700 mb-1 group-hover:text-amber-900 transition-colors">
                    {language === 'ta' ? 'பாலினம்' : 'Gender'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      ref={genderRef}
                      value={profile.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className={`w-full px-4 py-3 bg-amber-50/50 border-2 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none appearance-none cursor-pointer transition-all duration-200 ${formErrors.gender
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500'
                        : 'border-amber-200 hover:border-amber-300'
                        }`}
                    >
                      <option value="" disabled className="bg-white">{language === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Select'}</option>
                      <option value="M" className="bg-white">{language === 'ta' ? 'ஆண்' : 'Male'}</option>
                      <option value="F" className="bg-white">{language === 'ta' ? 'பெண்' : 'Female'}</option>
                      <option value="O" className="bg-white">{language === 'ta' ? 'மற்றவை' : 'Other'}</option>
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </div>
                    {formErrors.gender && (
                      <p className="absolute -bottom-5 left-0 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {formErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Private Details Section */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Lock className="h-5 w-5 text-orange-700" />
                </div>
                <h3 className="text-xl font-bold text-orange-800">
                  {language === 'ta' ? 'தனிப்பட்ட விவரங்கள்' : 'Private Details'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date of Birth */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'பிறந்த தேதி' : 'Date of Birth'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                    <input
                      ref={dateofbirthRef}
                      type="date"
                      value={profile.dateofbirth || ''}
                      onChange={(e) => handleInputChange('dateofbirth', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-orange-50/50 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 ${formErrors.dateofbirth
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500'
                        : 'border-orange-200 hover:border-orange-300'
                        }`}
                    />
                    {formErrors.dateofbirth && (
                      <p className="absolute -bottom-5 left-0 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {formErrors.dateofbirth}
                      </p>
                    )}
                  </div>
                </div>

                {/* Age */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'வயது' : 'Age'}
                  </label>
                  <input
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                    min="0"
                    max="150"
                    placeholder={language === 'ta' ? 'வயது' : 'Age'}
                  />
                </div>

                {/* Native Place */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'சொந்த ஊர்' : 'Native Place'}
                  </label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                    <input
                      type="text"
                      value={profile.native || ''}
                      onChange={(e) => handleInputChange('native', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                      placeholder={language === 'ta' ? 'உங்கள் சொந்த ஊர்' : 'Your native place'}
                    />
                  </div>
                </div>

                {/* Present City */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'தற்போதைய நகரம்' : 'Present City'}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                    <input
                      type="text"
                      value={profile.present_city || ''}
                      onChange={(e) => handleInputChange('present_city', e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                      placeholder={language === 'ta' ? 'உங்கள் தற்போதைய நகரம்' : 'Your present city'}
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-600 hover:text-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      title={language === 'ta' ? 'தற்போதைய இருப்பிடத்தைப் பெறுக' : 'Get current location'}
                    >
                      {gettingLocation ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <MapPin size={18} className="group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Taluk */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'தாலுகா' : 'Taluk'}
                  </label>
                  <input
                    type="text"
                    value={profile.taluk || ''}
                    onChange={(e) => handleInputChange('taluk', e.target.value)}
                    className="w-full px-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                  />
                </div>

                {/* District */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'மாவட்டம்' : 'District'}
                  </label>
                  <input
                    type="text"
                    value={profile.district || ''}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                  />
                </div>

                {/* State */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'மாநிலம்' : 'State'}
                  </label>
                  <input
                    type="text"
                    value={profile.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                  />
                </div>

                {/* Contact Number */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'தொடர்பு எண்' : 'Contact Number'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                    <input
                      type="tel"
                      value={profile.contact_number || ''}
                      onChange={(e) => handleInputChange('contact_number', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-orange-50/50 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 ${mobileError
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500'
                        : 'border-orange-200 hover:border-orange-300'
                        }`}
                      placeholder={language === 'ta' ? '10 இலக்க எண்' : '10 digit number'}
                      maxLength={10}
                    />
                  </div>
                  {mobileError && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={10} />
                      {mobileError}
                    </p>
                  )}
                  {!mobileError && profile.contact_number && profile.contact_number.length === 10 && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={10} />
                      {language === 'ta' ? 'சரியான எண்' : 'Valid number'}
                    </p>
                  )}
                </div>

                {/* Nationality */}
                <div className="group">
                  <label className="block text-sm font-medium text-orange-700 mb-1 group-hover:text-orange-900 transition-colors">
                    {language === 'ta' ? 'தேசியம்' : 'Nationality'}
                  </label>
                  <input
                    type="text"
                    value={profile.nationality || ''}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full px-4 py-3 bg-orange-50/50 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 hover:border-orange-300"
                  />
                </div>
              </div>
            </section>

            {/* Cultural Details Section */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Heart className="h-5 w-5 text-yellow-700" />
                </div>
                <h3 className="text-xl font-bold text-yellow-800">
                  {language === 'ta' ? 'பண்பாட்டு விவரங்கள்' : 'Cultural Details'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Lifestyle - Religion */}
                <div className="relative group">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-yellow-700 group-hover:text-yellow-900 transition-colors">
                      {language === 'ta' ? 'வாழ்வியல் கலாச்சாரம்' : 'Lifestyle'}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleInfo('lifestyle')}
                      className="p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 transition-colors"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.religion || ''}
                      onChange={(e) => handleInputChange('religion', e.target.value)}
                      onFocus={() => setActiveSuggestionField('religion')}
                      className="w-full px-4 py-3 bg-yellow-50/50 border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200 hover:border-yellow-300"
                      placeholder={language === 'ta' ? 'தேடுங்கள்...' : 'Search...'}
                    />
                    {activeSuggestionField === 'religion' && (
                      <SuggestionDropdown
                        suggestions={religionSuggestions}
                        field="religion"
                        onSelect={(suggestion) => handleSuggestionClick('religion', suggestion)}
                      />
                    )}
                  </div>
                  {openInfo.lifestyle && (
                    <div className="absolute z-30 mt-2 left-0 w-64 bg-white border border-amber-200 rounded-xl shadow-xl p-4 animate-fadeIn">
                      <p className="text-sm text-gray-700">{lifestyleInfoText}</p>
                      <button onClick={() => toggleInfo('lifestyle')} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Culture of Life - Caste */}
                <div className="relative group">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-yellow-700 group-hover:text-yellow-900 transition-colors">
                      {language === 'ta' ? 'குடும்பப் பெயர் 1' : 'Culture of Life'}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleInfo('culture')}
                      className="p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 transition-colors"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.cultureoflife || ''}
                      onChange={(e) => handleInputChange('cultureoflife', e.target.value)}
                      onFocus={() => setActiveSuggestionField('cultureoflife')}
                      className="w-full px-4 py-3 bg-yellow-50/50 border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200 hover:border-yellow-300"
                      placeholder={language === 'ta' ? 'தேடுங்கள்...' : 'Search...'}
                    />
                    {activeSuggestionField === 'cultureoflife' && (
                      <SuggestionDropdown
                        suggestions={cultureSuggestions}
                        field="cultureoflife"
                        onSelect={(suggestion) => handleSuggestionClick('cultureoflife', suggestion)}
                      />
                    )}
                  </div>
                  {openInfo.culture && (
                    <div className="absolute z-30 mt-2 left-0 w-64 bg-white border border-amber-200 rounded-xl shadow-xl p-4 animate-fadeIn">
                      <p className="text-sm text-gray-700">{cultureInfoText}</p>
                      <button onClick={() => toggleInfo('culture')} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Family Name */}
                <div className="relative group">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-yellow-700 group-hover:text-yellow-900 transition-colors">
                      {language === 'ta' ? 'குடும்பப் பெயர் 2' : 'Family Name'}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleInfo('family')}
                      className="p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 transition-colors"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.familyname1 || ''}
                      onChange={(e) => handleInputChange('familyname1', e.target.value)}
                      onFocus={() => setActiveSuggestionField('familyname1')}
                      className="w-full px-4 py-3 bg-yellow-50/50 border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200 hover:border-yellow-300"
                      placeholder={language === 'ta' ? 'தேடுங்கள்...' : 'Search...'}
                    />
                    {activeSuggestionField === 'familyname1' && (
                      <SuggestionDropdown
                        suggestions={familySuggestions}
                        field="familyname1"
                        onSelect={(suggestion) => handleSuggestionClick('familyname1', suggestion)}
                      />
                    )}
                  </div>
                  {openInfo.family && (
                    <div className="absolute z-30 mt-2 left-0 w-64 bg-white border border-amber-200 rounded-xl shadow-xl p-4 animate-fadeIn">
                      <p className="text-sm text-gray-700">{familyInfoText}</p>
                      <button onClick={() => toggleInfo('family')} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preferred Language - Mother Tongue - Improved Design */}
                <div className="group" ref={languageRef}>
                  <label className="block text-sm font-medium text-yellow-700 mb-1 group-hover:text-yellow-900 transition-colors">
                    {language === 'ta' ? 'தாய்மொழி' : 'Mother Tongue'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMotherTongueDropdown(!showMotherTongueDropdown)}
                      className={`w-full px-4 py-3 bg-yellow-50/50 border-2 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200 text-left flex items-center justify-between ${formErrors.preferred_language
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500'
                        : 'border-yellow-200 hover:border-yellow-300'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        {profile.preferred_language === 'ta' ? (
                          <>
                            <span className="text-lg">🇮🇳</span>
                            <span className="font-medium text-yellow-900">Tamil</span>
                          </>
                        ) : profile.preferred_language === 'en' ? (
                          <>
                            <span className="text-lg">🇬🇧</span>
                            <span className="font-medium text-yellow-900">Eng</span>
                          </>
                        ) : (
                          <span className="text-yellow-600">
                            {language === 'ta' ? 'தாய்மொழியை தேர்ந்தெடுக்கவும்' : 'Select your mother tongue'}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-yellow-600 transition-transform duration-200 ${showMotherTongueDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showMotherTongueDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm border border-yellow-200 rounded-xl shadow-2xl animate-slideDown overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleInputChange('preferred_language', 'ta')}
                          className="w-full px-4 py-4 text-left hover:bg-linear-to-r hover:from-yellow-50 hover:to-amber-50 transition-all duration-200 group border-b border-yellow-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🇮🇳</span>
                              <div>
                                <span className="font-semibold text-yellow-900 group-hover:text-yellow-700 transition-colors text-lg block">
                                  Tamil
                                </span>
                                <span className="text-xs text-yellow-600">தமிழ்</span>
                              </div>
                            </div>
                            {profile.preferred_language === 'ta' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('preferred_language', 'en')}
                          className="w-full px-4 py-4 text-left hover:bg-linear-to-r hover:from-yellow-50 hover:to-amber-50 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🇬🇧</span>
                              <div>
                                <span className="font-semibold text-yellow-900 group-hover:text-yellow-700 transition-colors text-lg block">
                                  Eng
                                </span>
                                <span className="text-xs text-yellow-600">English</span>
                              </div>
                            </div>
                            {profile.preferred_language === 'en' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </button>
                      </div>
                    )}

                    {formErrors.preferred_language && (
                      <p className="absolute -bottom-5 left-0 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {formErrors.preferred_language}
                      </p>
                    )}
                  </div>

                  {/* Hint text */}
                  {!profile.preferred_language && !formErrors.preferred_language && (
                    <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                      <Info size={10} />
                      {language === 'ta'
                        ? 'உங்கள் தாய்மொழியைத் தேர்ந்தெடுக்கவும்'
                        : 'Please select your mother tongue'}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-6 border-t border-amber-100">
            <button
              onClick={handleGoToGenealogy}
              className="group relative px-8 py-3 bg-linear-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-xl font-semibold hover:from-amber-200 hover:to-yellow-200 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Map className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              {language === 'ta' ? 'கொடிவழி வரைபடம்' : 'Genealogy Map'}
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-gray-300 w-full sm:w-auto"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!mobileError}
                className="group relative px-10 py-3 bg-linear-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto overflow-hidden"
              >
                <span className="absolute inset-0 w-full h-full bg-white opacity-20 rounded-xl blur-md group-hover:opacity-30 transition-opacity"></span>
                <span className="relative flex items-center">
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      {language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...'}
                    </>
                  ) : (
                    language === 'ta' ? 'சேமி' : 'Save'
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}