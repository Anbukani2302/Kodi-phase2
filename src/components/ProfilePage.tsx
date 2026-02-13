import React from "react";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { authService, UserProfile } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import { Info, X } from 'lucide-react';


interface ProfilePageProps {
  onNavigate?: (page: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const [openInfo, setOpenInfo] = useState<null | number>(null);

  const familyInfoText =
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

  const handleInputChange = (
    field: keyof UserProfile,
    value: string | number | File
  ) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };
  

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!profile.firstname) {
        setError(t('firstnameError'));
        return;
      }

      const profileData: Partial<UserProfile> = {
        ...profile,
        dateofbirth: profile.dateofbirth || undefined,
        age: profile.age ? parseInt(String(profile.age)) : undefined,
      };

      const updatedProfile = await authService.updateMyProfile(profileData);
      setProfile(updatedProfile);

      // Update global language if preferred_language is set
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
        // Navigate to GenealogyPage after saving
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
  };

  // Add a direct navigation function to Genealogy page
  const handleGoToGenealogy = () => {
    navigate('/genealogy');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdfa]">
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
          <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">{t('profileTitle')}</h1>
          <p className="text-lg text-amber-800/60">{t('profileSubtitle')}</p>

          {/* Quick navigation button to Genealogy */}
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
            {t('goToGenealogy')}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-amber-100">
          {/* Profile Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-24 h-24 md:w-32 md:h-32 bg-linear-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-lg cursor-pointer relative group overflow-hidden"
              onClick={() => document.getElementById('profile-image-input')?.click()}
            >
             {profile.image ? (
  <img
    src={
      typeof profile.image === 'string'
        ? profile.image
        : URL.createObjectURL(profile.image)
    }
    alt="Profile"
    className="w-full h-full object-cover"
  />
) : (
  <User className="h-12 w-12 md:h-16 md:w-16 text-white" />
)}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-bold">{t('changePhoto') || 'Change Photo'}</span>
              </div>
            </div>
            <input
              id="profile-image-input"
              type="file"
              accept="image/*"
              className="hidden"
             onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    handleInputChange('image', file); // ✅ File object
  }
}}

            />
            <h2 className="text-xl md:text-2xl font-bold text-amber-900">
              {profile.firstname || t('userName')}
            </h2>
          </div>

          {/* Form Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Step 1 - Public Details */}
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-amber-700 border-b-2 border-amber-100 pb-2">
                {t('step1Public')}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('firstName')}*</label>
                  <input
                    type="text"
                    value={profile.firstname || ''}
                    onChange={(e) => handleInputChange('firstname', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder={t('firstName')}
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('secondName')}</label>
                  <input
                    type="text"
                    value={profile.secondname || ''}
                    onChange={(e) => handleInputChange('secondname', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('thirdName')}</label>
                  <input
                    type="text"
                    value={profile.thirdname || ''}
                    onChange={(e) => handleInputChange('thirdname', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('fatherName')} 1</label>
                  <input
                    type="text"
                    value={profile.fathername1 || ''}
                    onChange={(e) => handleInputChange('fathername1', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('fatherName')} 2</label>
                  <input
                    type="text"
                    value={profile.fathername2 || ''}
                    onChange={(e) => handleInputChange('fathername2', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('motherName')} 1</label>
                  <input
                    type="text"
                    value={profile.mothername1 || ''}
                    onChange={(e) => handleInputChange('mothername1', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('motherName')} 2</label>
                  <input
                    type="text"
                    value={profile.mothername2 || ''}
                    onChange={(e) => handleInputChange('mothername2', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-sm font-medium text-amber-800 mb-1">{t('gender')}</label>
                  <select
                    value={profile.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">{t('selectGender')}</option>
                    <option value="M">{t('male')}</option>
                    <option value="F">{t('female')}</option>
                    <option value="O">{t('other')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2 - Private Details */}
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-orange-700 border-b-2 border-orange-100 pb-2">
                {t('step2Private')}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('dateOfBirth')}</label>
                  <input
                    type="date"
                    value={profile.dateofbirth || ''}
                    onChange={(e) => handleInputChange('dateofbirth', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('age')}</label>
                  <input
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    min="0"
                    max="150"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('native')}</label>
                  <input
                    type="text"
                    value={profile.native || ''}
                    onChange={(e) => handleInputChange('native', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('presentCity')}</label>
                  <input
                    type="text"
                    value={profile.present_city || ''}
                    onChange={(e) => handleInputChange('present_city', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('taluk')}</label>
                  <input
                    type="text"
                    value={profile.taluk || ''}
                    onChange={(e) => handleInputChange('taluk', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('district')}</label>
                  <input
                    type="text"
                    value={profile.district || ''}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('state')}</label>
                  <input
                    type="text"
                    value={profile.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('contactNumber')}</label>
                  <input
                    type="tel"
                    value={profile.contact_number || ''}
                    onChange={(e) => handleInputChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-sm font-medium text-orange-900 mb-1">{t('nationality')}</label>
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
              {t('step3Cultural')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <label className="block text-sm font-medium text-yellow-900 mb-1">{t('cultureOfLife')}</label>
                <input
                  type="text"
                  value={profile.cultureoflife || ''}
                  onChange={(e) => handleInputChange('cultureoflife', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>

              {[1, 2].map((num) => (
                <div
                  key={num}
                  className="relative p-3 bg-yellow-50/50 rounded-lg border border-yellow-100"
                >
                  {/* Label + Info Icon */}
                  <label className="flex items-center gap-2 text-sm font-medium text-yellow-900 mb-1">
                    {num === 1 ? 'வாழ்வியல் கலாச்சாரம்' : 'குடும்பப் பெயர்'}

                    {/* Info Icon */}
                    <button
                      type="button"
                      onClick={() => setOpenInfo(openInfo === num ? null : num)}
                      className="
    relative
    group
    flex items-center justify-center
    w-6 h-6
    rounded-full
    bg-linear-to-br from-red-600 via-red-700 to-red-900
    text-white
    shadow-md
    hover:shadow-red-700/40
    hover:scale-105
    active:scale-95
    transition-all duration-200
  "
                    >
                      <Info
                        size={12}
                        className="opacity-90 group-hover:opacity-100 transition-opacity"
                      />

                      {/* Tooltip */}
                      <span
                        className="
      absolute
      -top-9
      left-1/2
      -translate-x-1/2
      bg-black/80
      text-white
      text-[11px]
      px-2 py-1
      rounded-md
      whitespace-nowrap
      opacity-0
      group-hover:opacity-100
      transition-opacity
      pointer-events-none
    "
                      >
                        Info
                      </span>
                    </button>

                  </label>

                  {/* Input */}
                  <input
                    type="text"
                    value={profile[`familyname${num}` as keyof UserProfile] || ''}
                    onChange={(e) =>
                      handleInputChange(
                        `familyname${num}` as keyof UserProfile,
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />

                  {/* Popup */}
                  {openInfo === num && (
                    <div className="absolute z-30 top-0 right-0 mt-10 w-80 bg-white border border-yellow-200 rounded-xl shadow-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {familyInfoText}
                        </p>

                        {/* Close icon */}
                        <button
                          onClick={() => setOpenInfo(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}


              <div className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <label className="block text-sm font-medium text-yellow-900 mb-1">{t('preferredLanguage')}</label>
                <select
                  value={profile.preferred_language || ''}
                  onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">{t('selectLanguage')}</option>
                  <option value="ta">தமிழ்</option>
                  <option value="en">English</option>
                </select>
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
              {t('goToGenealogy')}
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-10 py-3 bg-linear-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-bold hover:from-amber-700 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transform active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}