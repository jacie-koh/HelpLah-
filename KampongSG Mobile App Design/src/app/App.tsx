import { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { AuthScreen } from './components/AuthScreen';
import { PatientView } from './components/PatientView';
import { PrimaryCaregiverView } from './components/PrimaryCaregiverView';
import { CommunityCaregiverView } from './components/CommunityCaregiverView';
import { SettingsScreen } from './components/SettingsScreen';
import { AssessmentScreen } from './components/AssessmentScreen';

export const LanguageContext = createContext({ language: 'en-sg', setLanguage: () => {} });

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [language, setLanguage] = useState('en-sg');

  useEffect(() => {
    checkUser();
  }, []);

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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
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
    } catch (error) {
      console.log('Sign in error:', error);
      throw error;
    }
  }

  async function handleSignUp(email, password, name, role, phoneNumber, patientName, patientPhone) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/signup`,
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
  }

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-2xl font-semibold text-blue-600">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
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
              <Route path="/assessment" element={<AssessmentScreen user={user} profile={profile} accessToken={accessToken} patientId={user.id} />} />
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