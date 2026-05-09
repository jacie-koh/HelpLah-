import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Bell, Home, User, LogOut, Save, Mic, Volume2, Type, Phone } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';

const LANGUAGES = [
  { code: 'en-sg', name: 'English (Singlish)' },
  { code: 'zh-sg', name: '华语 (Mandarin Chinese)' },
  { code: 'zh-min', name: '闽南语 (Hokkien)' },
  { code: 'zh-yue', name: '粤语 (Cantonese)' },
  { code: 'ms-sg', name: 'Bahasa Melayu (Malay)' },
  { code: 'ta-sg', name: 'தமிழ் (Tamil)' }
];

const FONT_SIZES = [
  { value: 'Small', labelKey: 'fontSmall' },
  { value: 'Medium', labelKey: 'fontMedium' },
  { value: 'Large', labelKey: 'fontLarge' }
];

export function SettingsScreen({ user, profile, accessToken, onSignOut }) {
  const { language, setLanguage, setAccessibilitySettings } = useContext(LanguageContext);
  const [localLanguage, setLocalLanguage] = useState(language);
  const [notifications, setNotifications] = useState(true);
  const [homeAddress, setHomeAddress] = useState('');
  const [speechToText, setSpeechToText] = useState(true);
  const [textToSpeech, setTextToSpeech] = useState(true);
  const [fontSize, setFontSize] = useState('Medium');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/settings`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const loadedSettings = {
            language: data.settings.language || 'en-sg',
            notifications: data.settings.notifications !== false,
            homeAddress: data.settings.homeAddress || '',
            speechToText: data.settings.speechToText !== false,
            textToSpeech: data.settings.textToSpeech !== false,
            fontSize: data.settings.fontSize || 'Medium',
            emergencyContact: data.settings.emergencyContact || '',
            emergencyPhone: data.settings.emergencyPhone || ''
          };
          setLocalLanguage(loadedSettings.language);
          setLanguage(loadedSettings.language);
          setNotifications(loadedSettings.notifications);
          setHomeAddress(loadedSettings.homeAddress);
          setSpeechToText(loadedSettings.speechToText);
          setTextToSpeech(loadedSettings.textToSpeech);
          setFontSize(loadedSettings.fontSize);
          setEmergencyContact(loadedSettings.emergencyContact);
          setEmergencyPhone(loadedSettings.emergencyPhone);
          setAccessibilitySettings(loadedSettings);
        }
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  }

  const t = (key) => getTranslation(localLanguage, key);
  const roleLabel = {
    patient: t('patient'),
    primary_caregiver: t('primaryCaregiver'),
    community_caregiver: t('communityCaregiver')
  }[profile.role] || profile.role.replace('_', ' ');

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            language: localLanguage,
            notifications,
            homeAddress,
            speechToText,
            textToSpeech,
            fontSize,
            emergencyContact,
            emergencyPhone
          })
        }
      );

      if (response.ok) {
        if (notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        setLanguage(localLanguage);
        setAccessibilitySettings({
          notifications,
          homeAddress,
          speechToText,
          textToSpeech,
          fontSize,
          emergencyContact,
          emergencyPhone
        });
        alert(t('settingsSaved'));
      }
    } catch (error) {
      console.log('Error saving settings:', error);
      alert(t('failedSaveSettings'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="size-full bg-gradient-to-b from-gray-50 to-white overflow-auto pb-6">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6 pt-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{t('settings')}</h1>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E1F0FF' }}>
              <User className="w-8 h-8" style={{ color: '#4A9EFF' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{profile.name}</h2>
              <p className="text-gray-600 text-sm">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Log Out Button */}
        <button
          onClick={onSignOut}
          className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <LogOut className="w-5 h-5" />
          {t('logOut')}
        </button>

        {/* Push Notifications */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{t('enablePushNotifications')}</h3>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors ${
                notifications ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={notifications ? { backgroundColor: '#4A9EFF' } : {}}
            >
              <span
                className={`inline-block w-6 h-6 transform transition-transform bg-white rounded-full shadow-md ${
                  notifications ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">{t('language')}</h3>
          </div>
          <select
            value={localLanguage}
            onChange={(e) => setLocalLanguage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Home Address */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Home className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">{t('homeAddress')}</h3>
          </div>
          <input
            type="text"
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            placeholder={t('enterHomeAddress')}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Accessibility Section */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('accessibility')}</h3>
          
          {/* Speech-to-Text */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="text-base font-semibold text-gray-800">{t('speechToText')}</h4>
              </div>
            </div>
            <button
              onClick={() => setSpeechToText(!speechToText)}
              className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors ${
                speechToText ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={speechToText ? { backgroundColor: '#4A9EFF' } : {}}
            >
              <span
                className={`inline-block w-6 h-6 transform transition-transform bg-white rounded-full shadow-md ${
                  speechToText ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Text-to-Speech */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="text-base font-semibold text-gray-800">{t('textToSpeech')}</h4>
              </div>
            </div>
            <button
              onClick={() => setTextToSpeech(!textToSpeech)}
              className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors ${
                textToSpeech ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={textToSpeech ? { backgroundColor: '#4A9EFF' } : {}}
            >
              <span
                className={`inline-block w-6 h-6 transform transition-transform bg-white rounded-full shadow-md ${
                  textToSpeech ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Type className="w-5 h-5 text-gray-600" />
              <h4 className="text-base font-semibold text-gray-800">{t('fontSize')}</h4>
            </div>
            <div className="flex gap-3">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setFontSize(size.value)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    fontSize === size.value
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={fontSize === size.value ? { backgroundColor: '#4A9EFF' } : {}}
                >
                  {t(size.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="w-5 h-5 text-red-600" />
            <h3 className="text-xl font-bold text-gray-800">{t('emergencyContact')}</h3>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('contactName')}</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder={t('enterContactName')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('phoneNumber')}</label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder={t('enterPhoneNumber')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full text-white py-4 rounded-2xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#4A9EFF' }}
          onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#3B82F6')}
          onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#4A9EFF')}
        >
          <Save className="w-5 h-5" />
          {saving ? t('saving') : t('saveSettings')}
        </button>
      </div>
    </div>
  );
}
