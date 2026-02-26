import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Search
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
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [mobileError, setMobileError] = useState('');

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

  // Refs for scrolling to errors
  const firstnameRef = useRef<HTMLInputElement>(null);
  const dateofbirthRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const languageRef = useRef<HTMLSelectElement>(null);

  const familyInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  const lifestyleInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  const cultureInfoText =
    'கொடிவழி வரைபடத்தில் தங்களுக்கான உறவுமுறை பெயர்களையும், கலாச்சார பெட்டகத்தில் தங்களது உறவுமுறைகளின் கடமைகள், உரிமைகள் பற்றிய விவரங்களையும் துல்லியமாக பெறலாம்.';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setInitialLoading(true);
      setError('');
      const response = await authService.getMyProfile();
      setProfile(response || {});
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
    // Remove any non-digit characters
    const cleaned = number.replace(/\D/g, '');
    // Check if it's exactly 10 digits
    if (cleaned.length !== 10) return false;

    // Check Indian mobile prefix
    const validPrefixes = ['6', '7', '8', '9'];
    return validPrefixes.includes(cleaned.charAt(0));
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
    // Clear error for this field if it exists
    if (formErrors && (field === 'firstname' || field === 'dateofbirth' || field === 'gender' || field === 'preferred_language')) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Special handling for mobile number
    if (field === 'contact_number' && typeof value === 'string') {
      // Allow only digits and limit to 10 digits
      const digitsOnly = value.replace(/\D/g, '');
      const truncated = digitsOnly.slice(0, 10);
      setProfile(prev => ({ ...prev, [field]: truncated }));

      // Validate
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

    // Regular handling for other fields
    setProfile(prev => ({ ...prev, [field]: value }));

    // Only trigger suggestions for these three fields
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

  // Form validation errors
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

      // Validate required fields
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

      // Validate mobile number
      if (profile.contact_number) {
        if (!validateMobileNumber(profile.contact_number)) {
          // Already handled by existing mobileError state, but good to double check
          setError(language === 'ta'
            ? 'அலைபேசி எண் 10 இலக்கங்களாக இருக்க வேண்டும்'
            : 'Mobile number must be 10 digits');
          return;
        }
      }

      if (hasError) {
        setFormErrors(newErrors);
        setError(language === 'ta' ? 'தேவையான புலங்களை நிரப்பவும்' : 'Please fill all required fields');

        // Scroll to the first error
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
      };

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
      <div className="absolute z-50 w-full mt-1 bg-white border border-amber-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="w-full px-4 py-2 text-left hover:bg-amber-50 focus:bg-amber-50 focus:outline-none border-b border-amber-100 last:border-b-0 transition-colors"
            onClick={() => onSelect(suggestion)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-amber-900">{suggestion.label}</span>
              {suggestion.count > 0 && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  {suggestion.count} {suggestion.count === 1 ? 'use' : 'uses'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const toggleInfo = (type: 'family' | 'lifestyle' | 'culture') => {
    setOpenInfo(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 via-white to-yellow-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-amber-800">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-linear-to-br from-amber-50 via-white to-yellow-50">
      <div className="max-w-6xl mx-auto">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg animate-fadeIn">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-amber-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">
            {language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
          </h1>
          <p className="text-lg text-amber-700">
            {language === 'ta' ? 'உங்கள் விவரங்களை பூர்த்தி செய்யவும்' : 'Complete your details'}
          </p>

          <button
            onClick={handleGoToGenealogy}
            className="mt-4 px-6 py-2 bg-linear-to-r from-amber-600 to-yellow-700 text-white rounded-lg font-bold hover:from-amber-700 hover:to-yellow-800 transition-all flex items-center justify-center mx-auto shadow-md"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            {language === 'ta' ? 'கொடிவழி வரைபடம் செல்லவும் ' : 'Go to Genealogy Map'}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-amber-100">

          {/* Profile Image */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-24 h-24 md:w-28 md:h-28 bg-linear-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center mb-3 shadow-lg cursor-pointer relative group overflow-hidden border-4 border-amber-200"
              onClick={() => document.getElementById('profile-image-input')?.click()}
            >
              {profile.image ? (
                <img
                  src={(() => {
                    if (!profile.image) return '';
                    if (typeof profile.image === 'string') {
                      if (profile.image.startsWith('http')) return profile.image;

                      // Explicitly construct URL
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
                    // Fallback to placeholder if fails
                    e.currentTarget.style.display = 'none'; // Or show fallback icon
                  }}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-white" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-medium">
                  {language === 'ta' ? 'மாற்ற' : 'Change'}
                </span>
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
            <h2 className="text-xl font-semibold text-amber-900">
              {profile.firstname || (language === 'ta' ? 'பயனர் பெயர்' : 'User Name')}
            </h2>
          </div>

          {/* Form Sections - Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Step 1 - Public Details */}
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-amber-700 border-b-2 border-amber-100 pb-2">
                {language === 'ta' ? 'பொது விவரங்கள்' : 'Public Details'}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'முதல் பெயர்' : 'First Name'}*
                  </label>
                  <input
                    ref={firstnameRef}
                    type="text"
                    value={profile.firstname || ''}
                    onChange={(e) => handleInputChange('firstname', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none ${formErrors.firstname ? 'border-red-500 bg-red-50' : 'border-amber-200'
                      }`}
                    placeholder={language === 'ta' ? 'உங்கள் முதல் பெயர்' : 'Your first name'}
                  />
                  {formErrors.firstname && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.firstname}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'இரண்டாம் பெயர்' : 'Second Name'}
                  </label>
                  <input
                    type="text"
                    value={profile.secondname || ''}
                    onChange={(e) => handleInputChange('secondname', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder={language === 'ta' ? 'உங்கள் இரண்டாம் பெயர்' : 'Your second name'}
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'மூன்றாம் பெயர்' : 'Third Name'}
                  </label>
                  <input
                    type="text"
                    value={profile.thirdname || ''}
                    onChange={(e) => handleInputChange('thirdname', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder={language === 'ta' ? 'உங்கள் மூன்றாம் பெயர்' : 'Your third name'}
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'தந்தை பெயர் 1' : "Father's Name 1"}
                  </label>
                  <input
                    type="text"
                    value={profile.fathername1 || ''}
                    onChange={(e) => handleInputChange('fathername1', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'தந்தை பெயர் 2' : "Father's Name 2"}
                  </label>
                  <input
                    type="text"
                    value={profile.fathername2 || ''}
                    onChange={(e) => handleInputChange('fathername2', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'தாய் பெயர் 1' : "Mother's Name 1"}
                  </label>
                  <input
                    type="text"
                    value={profile.mothername1 || ''}
                    onChange={(e) => handleInputChange('mothername1', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'தாய் பெயர் 2' : "Mother's Name 2"}
                  </label>
                  <input
                    type="text"
                    value={profile.mothername2 || ''}
                    onChange={(e) => handleInputChange('mothername2', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    {language === 'ta' ? 'பாலினம்' : 'Gender'} *
                  </label>
                  <select
                    ref={genderRef}
                    value={profile.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white ${formErrors.gender ? 'border-red-500 bg-red-50' : 'border-amber-200'
                      }`}
                  >
                    <option value="">{language === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Select'}</option>
                    <option value="M">{language === 'ta' ? 'ஆண்' : 'Male'}</option>
                    <option value="F">{language === 'ta' ? 'பெண்' : 'Female'}</option>
                    <option value="O">{language === 'ta' ? 'மற்றவை' : 'Other'}</option>
                  </select>
                  {formErrors.gender && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.gender}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 - Private Details */}
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-orange-700 border-b-2 border-orange-100 pb-2">
                {language === 'ta' ? 'தனிப்பட்ட விவரங்கள்' : 'Private Details'}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'பிறந்த தேதி' : 'Date of Birth'} *
                  </label>
                  <input
                    ref={dateofbirthRef}
                    type="date"
                    value={profile.dateofbirth || ''}
                    onChange={(e) => handleInputChange('dateofbirth', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${formErrors.dateofbirth ? 'border-red-500 bg-red-50' : 'border-orange-200'
                      }`}
                  />
                  {formErrors.dateofbirth && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.dateofbirth}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'வயது' : 'Age'}
                  </label>
                  <input
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    min="0"
                    max="150"
                    placeholder={language === 'ta' ? 'வயது' : 'Age'}
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'சொந்த ஊர்' : 'Native Place'}
                  </label>
                  <input
                    type="text"
                    value={profile.native || ''}
                    onChange={(e) => handleInputChange('native', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder={language === 'ta' ? 'உங்கள் சொந்த ஊர்' : 'Your native place'}
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'தற்போதைய நகரம்' : 'Present City'}
                  </label>
                  <input
                    type="text"
                    value={profile.present_city || ''}
                    onChange={(e) => handleInputChange('present_city', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'தாலுகா' : 'Taluk'}
                  </label>
                  <input
                    type="text"
                    value={profile.taluk || ''}
                    onChange={(e) => handleInputChange('taluk', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'மாவட்டம்' : 'District'}
                  </label>
                  <input
                    type="text"
                    value={profile.district || ''}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'மாநிலம்' : 'State'}
                  </label>
                  <input
                    type="text"
                    value={profile.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'தொடர்பு எண்' : 'Contact Number'}
                  </label>
                  <input
                    type="tel"
                    value={profile.contact_number || ''}
                    onChange={(e) => handleInputChange('contact_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${mobileError ? 'border-red-500 bg-red-50' : 'border-orange-200'
                      }`}
                    placeholder={language === 'ta' ? '10 இலக்க எண்' : '10 digit number'}
                    maxLength={10}
                  />
                  {mobileError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {mobileError}
                    </p>
                  )}
                  {!mobileError && profile.contact_number && profile.contact_number.length === 10 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      {language === 'ta' ? 'சரியான எண்' : 'Valid number'}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">
                    {language === 'ta' ? 'தேசியம்' : 'Nationality'}
                  </label>
                  <input
                    type="text"
                    value={profile.nationality || ''}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Cultural Details */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg md:text-xl font-bold text-yellow-700 border-b-2 border-yellow-100 pb-2">
              {language === 'ta' ? 'பண்பாட்டு விவரங்கள்' : 'Cultural Details'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Lifestyle - Religion */}
              <div className="relative p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-yellow-900">
                    {language === 'ta' ? 'வாழ்வியல் கலாச்சாரம்' : 'Lifestyle'}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleInfo('lifestyle')}
                    className="relative group flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    <Info size={12} />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Info
                    </span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.religion || ''}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                    onFocus={() => setActiveSuggestionField('religion')}
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
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

                {/* Info Popup for Lifestyle */}
                {openInfo.lifestyle && (
                  <div className="absolute z-30 mt-2 w-72 bg-white border border-amber-200 rounded-xl shadow-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{lifestyleInfoText}</p>
                      <button onClick={() => toggleInfo('lifestyle')} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Culture of Life - Caste */}
              <div className="relative p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-yellow-900">
                    {language === 'ta' ? 'குடும்பப் பெயர் 1' : 'Culture of Life'}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleInfo('culture')}
                    className="relative group flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    <Info size={12} />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Info
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={profile.cultureoflife || ''}
                    onChange={(e) => handleInputChange('cultureoflife', e.target.value)}
                    onFocus={() => setActiveSuggestionField('cultureoflife')}
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
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

                {/* Info Popup for Culture */}
                {openInfo.culture && (
                  <div className="absolute z-30 mt-2 w-72 bg-white border border-amber-200 rounded-xl shadow-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{cultureInfoText}</p>
                      <button onClick={() => toggleInfo('culture')} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Family Name */}
              <div className="relative p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-yellow-900">
                    {language === 'ta' ? 'குடும்பப் பெயர் 2' : 'Family Name'}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleInfo('family')}
                    className="relative group flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    <Info size={12} />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Info
                    </span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.familyname1 || ''}
                    onChange={(e) => handleInputChange('familyname1', e.target.value)}
                    onFocus={() => setActiveSuggestionField('familyname1')}
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
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

                {/* Info Popup for Family */}
                {openInfo.family && (
                  <div className="absolute z-30 mt-2 w-72 bg-white border border-amber-200 rounded-xl shadow-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{familyInfoText}</p>
                      <button onClick={() => toggleInfo('family')} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preferred Language */}
              <div className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <label className="block text-sm font-medium text-yellow-900 mb-1">
                  {language === 'ta' ? 'தாய்மொழி' : 'Mother Tongue'} *
                </label>
                <select
                  ref={languageRef}
                  value={profile.preferred_language || ''}
                  onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none bg-white ${formErrors.preferred_language ? 'border-red-500 bg-red-50' : 'border-yellow-200'
                    }`}
                >
                  <option value="" disabled>{language === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Select'}</option>
                  <option value="ta">தமிழ்</option>
                  <option value="en">English</option>
                </select>
                {formErrors.preferred_language && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {formErrors.preferred_language}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <button
              onClick={handleGoToGenealogy}
              className="px-6 py-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold hover:bg-amber-100 transition-all flex items-center justify-center shadow-sm"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              {language === 'ta' ? 'கொடிவழி வரைபடம் செல்லவும் ' : 'Go to Genealogy Map'}
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!mobileError}
                className="px-10 py-3 bg-linear-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-bold hover:from-amber-700 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transform active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...'}
                  </>
                ) : (
                  language === 'ta' ? 'சேமி' : 'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}