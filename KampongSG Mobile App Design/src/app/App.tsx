import { useState, useEffect, useMemo, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { publicAnonKey } from '../../utils/supabase/info.tsx';
import { supabaseFunctionsApiBase } from '../../utils/supabase/api';
import { AuthScreen } from './components/AuthScreen';
import { PatientView } from './components/PatientView';
import { PrimaryCaregiverView } from './components/PrimaryCaregiverView';
import { CommunityCaregiverView } from './components/CommunityCaregiverView';
import { SettingsScreen } from './components/SettingsScreen';
import { AssessmentScreen } from './components/AssessmentScreen';
import { getTranslation } from './utils/translations';
import { notifyUser, type AppNotificationPayload } from './utils/notifications';

const defaultAccessibilitySettings = {
  notifications: true,
  speechToText: true,
  textToSpeech: true,
  fontSize: 'Medium',
  emergencyContact: '',
  emergencyPhone: '',
  homeAddress: ''
};

export const LanguageContext = createContext({
  language: 'en-sg',
  setLanguage: () => {},
  accessibilitySettings: defaultAccessibilitySettings,
  setAccessibilitySettings: () => {}
});

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [language, setLanguage] = useState('en-sg');
  const [accessibilitySettings, setAccessibilitySettings] = useState(defaultAccessibilitySettings);
  const [topNotification, setTopNotification] = useState<(AppNotificationPayload & { id: number }) | null>(null);

  useEffect(() => {
    const fontSize = accessibilitySettings.fontSize || 'Medium';
    const rootFontSize = fontSize === 'Large' ? '18px' : fontSize === 'Small' ? '14px' : '16px';
    document.documentElement.style.fontSize = rootFontSize;
  }, [accessibilitySettings.fontSize]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    function handleAppNotification(event: Event) {
      const detail = (event as CustomEvent<AppNotificationPayload>).detail;
      if (!detail?.title) return;
      setTopNotification({ ...detail, id: Date.now() });
    }

    window.addEventListener('helplah:notification', handleAppNotification);
    return () => window.removeEventListener('helplah:notification', handleAppNotification);
  }, []);

  useEffect(() => {
    if (!topNotification) return undefined;
    const timeout = window.setTimeout(() => setTopNotification(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [topNotification?.id]);

  useEffect(() => {
    if (profile?.role !== 'primary_caregiver' || !user?.id || !accessToken || !accessibilitySettings.notifications) {
      return undefined;
    }

    let cancelled = false;
    const timers: number[] = [];

    const reminderKeys = [
      'wellbeingReminderKopi',
      'wellbeingReminderFood',
      'wellbeingReminderToilet',
      'wellbeingReminderWater',
      'wellbeingReminderBreak',
      'wellbeingReminderMedication',
      'wellbeingReminderSleep',
      'wellbeingReminderFriends',
      'wellbeingReminderFreshAir',
      'wellbeingReminderBreathing',
      'wellbeingReminderQuietTime'
    ];

    function frequencyForScore(score: number | null) {
      if (score === null || score <= 10) return 2;
      if (score <= 20) return 3;
      return 4;
    }

    function reminderTimesForCount(count: number) {
      return {
        2: ['10:00', '18:00'],
        3: ['09:30', '14:00', '19:30'],
        4: ['09:00', '12:30', '16:30', '20:30']
      }[count] || ['10:00', '18:00'];
    }

    function msUntilNext(time: string) {
      const [hour, minute] = time.split(':').map(Number);
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= Date.now()) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime() - Date.now();
    }

    function reminderKeyForSlot(slotIndex: number) {
      const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      return reminderKeys[(dayIndex + slotIndex) % reminderKeys.length];
    }

    async function scheduleReminders() {
      let score: number | null = null;
      try {
        const response = await fetch(
          `${supabaseFunctionsApiBase}/caregiver/${user.id}/latest-score`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (response.ok) {
          const data = await response.json();
          score = typeof data.score === 'number' ? data.score : null;
        }
      } catch (error) {
        console.log('Error loading wellbeing reminder score:', error);
      }

      if (cancelled) return;

      reminderTimesForCount(frequencyForScore(score)).forEach((time, slotIndex) => {
        const schedule = () => {
          const timer = window.setTimeout(() => {
            if (cancelled) return;
            notifyUser(
              getTranslation(language, 'wellbeingReminderTitle'),
              getTranslation(language, reminderKeyForSlot(slotIndex))
            );
            schedule();
          }, msUntilNext(time));
          timers.push(timer);
        };
        schedule();
      });
    }

    scheduleReminders();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [profile?.role, user?.id, accessToken, accessibilitySettings.notifications, language]);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        await loadProfile(session.access_token);
      }
    } catch (error) {
      console.log('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(token) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const [profileResponse, settingsResponse] = await Promise.all([
        fetch(`${supabaseFunctionsApiBase}/profile`, { headers }),
        fetch(`${supabaseFunctionsApiBase}/settings`, { headers })
      ]);

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setProfile(data.profile);
      }

      if (settingsResponse.ok) {
        const data = await settingsResponse.json();
        setLanguage(data.settings?.language || 'en-sg');
        setAccessibilitySettings({
          ...defaultAccessibilitySettings,
          ...data.settings
        });
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  }

  async function handleSignIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      setUser(data.user);
      setAccessToken(data.session.access_token);
      await loadProfile(data.session.access_token);
      window.history.replaceState(null, '', '/');
    } catch (error) {
      console.log('Sign in error:', error);
      throw error;
    }
  }

  async function handleSignUp(email, password, name, role, phoneNumber, patientName, patientPhone) {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password, name, role, phoneNumber, patientName, patientPhone })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      await handleSignIn(email, password);
    } catch (error) {
      console.log('Sign up error:', error);
      throw error;
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAccessToken(null);
    window.history.replaceState(null, '', '/');
  }

  const languageContextValue = useMemo(
    () => ({ language, setLanguage, accessibilitySettings, setAccessibilitySettings }),
    [language, accessibilitySettings],
  );

  if (loading) {
    return (
      <LanguageContext.Provider value={languageContextValue}>
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
          <div className="text-2xl font-semibold text-blue-600">{getTranslation(language, 'loading')}</div>
        </div>
      </LanguageContext.Provider>
    );
  }

  if (!user || !profile) {
    return (
      <LanguageContext.Provider value={languageContextValue}>
        <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={languageContextValue}>
      {topNotification && (
        <div className="fixed left-3 right-3 top-3 z-[5000] mx-auto max-w-2xl rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-blue-900">{topNotification.title}</p>
              {topNotification.body && (
                <p className="mt-1 text-sm text-gray-700">{topNotification.body}</p>
              )}
            </div>
            <button
              onClick={() => setTopNotification(null)}
              className="rounded-lg px-2 text-lg leading-none text-gray-500 hover:bg-gray-100"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <BrowserRouter>
        <Routes>
          {profile.role === 'patient' && (
            <>
              <Route path="/" element={<PatientView user={user} profile={profile} accessToken={accessToken} />} />
              <Route path="/settings" element={<SettingsScreen user={user} profile={profile} accessToken={accessToken} onSignOut={handleSignOut} />} />
            </>
          )}

          {profile.role === 'primary_caregiver' && (
            <>
              <Route path="/" element={<PrimaryCaregiverView user={user} profile={profile} accessToken={accessToken} />} />
              <Route path="/assessment" element={<AssessmentScreen user={user} accessToken={accessToken} patientId={user.id} />} />
              <Route path="/settings" element={<SettingsScreen user={user} profile={profile} accessToken={accessToken} onSignOut={handleSignOut} />} />
            </>
          )}

          {profile.role === 'community_caregiver' && (
            <>
              <Route path="/" element={<CommunityCaregiverView user={user} profile={profile} accessToken={accessToken} />} />
              <Route path="/settings" element={<SettingsScreen user={user} profile={profile} accessToken={accessToken} onSignOut={handleSignOut} />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageContext.Provider>
  );
}
