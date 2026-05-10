import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CheckCircle, Clock, RefreshCw, Plus, Bell, Users, Activity, MessageSquare, MapPin, Home, HelpCircle, LayoutGrid, Video, Image as ImageIcon, Calendar, Mic, Volume2, Phone, Mail, MessageCircle, FileText, ClipboardList, Heart, X, Thermometer, BookOpen } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';
import { TaskManager } from './TaskManager';
import { CommunitySupportScheduler } from './CommunitySupportScheduler';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';
import { useDynamicTranslations } from '../utils/dynamicTranslations';
import { recordSpeechToText, speakText } from '../utils/voice';
import { callPhoneNumber, phoneHref } from '../utils/phone';

const patientMapIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 6px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;">P</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const homeMapIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 6px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;">H</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const caregiverMapIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:9999px;background:#16a34a;border:3px solid white;box-shadow:0 6px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;">C</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export function PrimaryCaregiverView({ user, profile, accessToken }) {
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [caregiverStressScore, setCaregiverStressScore] = useState(null);
  const [latestAssessmentAt, setLatestAssessmentAt] = useState(null);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showMyTaskManager, setShowMyTaskManager] = useState(false);
  const [showCommunitySupportScheduler, setShowCommunitySupportScheduler] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [communitySupport, setCommunitySupport] = useState([]);
  const [immediateHelpRequest, setImmediateHelpRequest] = useState(null);
  const [searchingForCaregiver, setSearchingForCaregiver] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [patientLocation, setPatientLocation] = useState(null);
  const [patientContactPhone, setPatientContactPhone] = useState('');
  const [availableCaregivers, setAvailableCaregivers] = useState([]);
  const [requestLocation, setRequestLocation] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeView, setActiveView] = useState('home');
  const [showDistressThermometerInfo, setShowDistressThermometerInfo] = useState(false);
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [newCommunityNoteText, setNewCommunityNoteText] = useState('');
  const [isRecordingNewCommunityNote, setIsRecordingNewCommunityNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [recordingNoteId, setRecordingNoteId] = useState(null);
  const navigate = useNavigate();
  const { language, accessibilitySettings } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) =>
    getTranslation(language, key, vars);
  const visibleNotifications = accessibilitySettings.notifications ? notifications : [];
  const dt = useDynamicTranslations(
    [
      ...tasks.map((task) => task.title),
      ...myTasks.map((task) => task.title),
      ...visibleNotifications.flatMap((notification) => [
        notification.message,
        notification.messageKey ? t(notification.messageKey) : '',
        notification.location,
        notification.time
      ]),
      ...communitySupport.flatMap((session) => [session.duration, session.status, session.tasks]),
      ...voiceNotes.flatMap((note) => [note.summary, note.transcription]),
      immediateHelpRequest?.location,
      immediateHelpRequest?.caregiverDistance,
      immediateHelpRequest?.estimatedArrival,
      'Accepted',
      'Pending',
      'Notifications are turned off in Settings.',
      'Pickup',
      'Requested',
      'Status',
      'Time',
      'No time set',
      'no time set',
      'mins',
      'Caring SG',
      'AIC Caregiving Support',
      'AIC Help for Caregivers',
      'Club Heal',
      'Mindful Community',
      'SEA Lion Chatbot',
      '1800-KAMPONG',
      'support@kampongsg.com',
      'Volunteer assigned',
      'Awaiting volunteer',
      'Your request'
    ],
    language,
    accessToken
  );

  useEffect(() => {
    if (user?.id && accessToken) {
      loadLinkedPatient();
      loadCommunitySupport();
      loadCaregiverStressScore();
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.id && accessToken) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caregiverStressScore, latestAssessmentAt]);

  useEffect(() => {
    if (activeView !== 'community' || !user?.id || !accessToken) {
      return;
    }

    loadAvailableCaregivers();
    if (!requestLocation) {
      getCurrentPosition()
        .then((position) => {
          setRequestLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Current location'
          });
        })
        .catch(() => {
          setRequestLocation({
            latitude: 1.3521,
            longitude: 103.9448,
            address: 'Tampines Street 81, Block 123'
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, user?.id, accessToken]);

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        return reject(new Error('Geolocation unsupported'));
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  function formatCoordinates(latitude, longitude) {
    return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  }

  function formatGpsTimestamp(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  }

  async function fetchPatientGpsLocation(patientIdToLoad = patientId) {
    if (!patientIdToLoad || !accessToken) return null;

    const response = await fetch(
      `${supabaseFunctionsApiBase}/location/${patientIdToLoad}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) return null;
    const locationData = await response.json();
    if (!locationData.location?.latitude || !locationData.location?.longitude) return null;
    return locationData.location;
  }

  async function loadAvailableCaregivers() {
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/caregivers/available`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableCaregivers(data.caregivers || []);
      }
    } catch (error) {
      console.log('Error loading available caregivers:', error);
    }
  }

  async function loadLinkedPatient() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/caregiver/${user.id}/patient`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.patientId) {
          setPatientId(data.patientId);
          setPatientContactPhone(data.patient?.phoneNumber || '');
          loadPatientData(data.patientId);
        }
      }
    } catch (error) {
      console.log('Error loading linked patient:', error);
    }
  }

  async function loadPatientData(patientId) {
    try {
      const [tasksRes, notesRes, vitalsRes] = await Promise.all([
        fetch(
          `${supabaseFunctionsApiBase}/patient/${patientId}/tasks`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `${supabaseFunctionsApiBase}/patient/${patientId}/voice-notes`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `${supabaseFunctionsApiBase}/patient/${patientId}/vitals`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (notesRes.ok) {
        const data = await notesRes.json();
        setVoiceNotes(data.notes || []);
      }

      if (vitalsRes.ok) {
        const data = await vitalsRes.json();
        setVitals(data.vitals || []);
      }
    } catch (error) {
      console.log('Error loading patient data:', error);
    }
  }

  async function loadCommunitySupport() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/community-support`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setCommunitySupport(data.requests || []);
      }
    } catch (error) {
      console.log('Error loading community support:', error);
    }
  }

  async function loadCaregiverStressScore() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/caregiver/${user.id}/latest-score`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setCaregiverStressScore(typeof data.score === 'number' ? data.score : null);
        setLatestAssessmentAt(data.latestAssessment?.createdAt || null);
      }
    } catch (error) {
      console.log('Error loading caregiver stress score:', error);
    }
  }

  async function loadNotifications() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/notifications`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const serverNotifications = data.notifications || [];
        const localNotifications = [];
        const now = Date.now();
        const assessmentAgeMs = latestAssessmentAt ? now - new Date(latestAssessmentAt).getTime() : Infinity;

        if (caregiverStressScore !== null && caregiverStressScore >= 29) {
          localNotifications.push({
            id: 'local-mental-health-resources',
            type: 'mental_health_resources',
            messageKey: 'mentalHealthResourcePrompt',
            time: new Date().toISOString(),
            severity: 'info'
          });
        }

        if (assessmentAgeMs >= 14 * 24 * 60 * 60 * 1000) {
          localNotifications.push({
            id: 'local-biweekly-assessment',
            type: 'caregiver_assessment_due',
            messageKey: 'biweeklyAssessmentPrompt',
            time: new Date().toISOString(),
            severity: 'info'
          });
        }

        setNotifications([...localNotifications, ...serverNotifications]);
      }
    } catch (error) {
      console.log('Error loading notifications:', error);
    }
  }

  async function handleRefresh() {
    if (patientId) {
      await loadPatientData(patientId);
    }
    await loadNotifications();
    await loadCommunitySupport();
    await loadCaregiverStressScore();
  }

  async function handleVoiceNote() {
    if (!accessibilitySettings.speechToText) {
      alert(t('alertSpeechToTextOff'));
      return;
    }

    if (!patientId) {
      alert(t('alertNoLinkedPatient'));
      return;
    }

    if (!isRecordingNote) {
      setIsRecordingNote(true);
      try {
        alert(t('alertVoiceRecordingStarted'));
        const transcript = await recordSpeechToText(language, accessToken);
        if (!transcript) {
          alert(t('alertTranscribeFailed'));
          return;
        }

        const response = await fetch(
          `${supabaseFunctionsApiBase}/voice-notes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              patientId,
              transcription: transcript,
              summary: transcript
            })
          }
        );

        if (response.ok) {
          await loadPatientData(patientId);
          alert(t('alertVoiceNoteSavedShared'));
        }
      } catch (error) {
        console.log('Voice note error:', error);
        alert(t('alertMicrophoneUnavailable'));
      } finally {
        setIsRecordingNote(false);
      }
    } else {
      setIsRecordingNote(false);
    }
  }

  async function handleTextToSpeech(text) {
    if (!accessibilitySettings.textToSpeech) {
      alert(t('alertTextToSpeechOff'));
      return;
    }

    await speakText(text, language, accessToken);
  }

  function getNoteText(note) {
    return note.summary || note.transcription || '';
  }

  async function createCommunityNote(text) {
    if (!patientId) {
      alert(t('alertNoLinkedPatient'));
      return null;
    }

    const response = await fetch(
      `${supabaseFunctionsApiBase}/voice-notes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          patientId,
          transcription: text,
          summary: text
        })
      }
    );

    if (!response.ok) throw new Error('Failed to create community note.');
    await loadPatientData(patientId);
    return true;
  }

  async function handleSaveNewCommunityNote() {
    if (!newCommunityNoteText.trim()) {
      alert(t('alertNeedTitleAndContent'));
      return;
    }

    try {
      await createCommunityNote(newCommunityNoteText.trim());
      setNewCommunityNoteText('');
      alert(t('alertCommunityNoteUpdated'));
    } catch (error) {
      console.log('Community note create error:', error);
      alert(t('alertFailedUpdateNote'));
    }
  }

  async function handleRecordNewCommunityNote() {
    if (!accessibilitySettings.speechToText) {
      alert(t('alertSpeechToTextOff'));
      return;
    }

    setIsRecordingNewCommunityNote(true);
    try {
      alert(t('alertVoiceRecordingStarted'));
      const transcript = await recordSpeechToText(language, accessToken);
      if (!transcript) {
        alert(t('alertTranscribeFailed'));
        return;
      }
      setNewCommunityNoteText(transcript);
    } catch (error) {
      console.log('Community note recording error:', error);
      alert(t('alertMicrophoneUnavailable'));
    } finally {
      setIsRecordingNewCommunityNote(false);
    }
  }

  function handleEditCommunityNote(note) {
    setEditingNoteId(note.id);
    setEditingNoteText(getNoteText(note));
  }

  function handleCancelCommunityNoteEdit() {
    setEditingNoteId(null);
    setEditingNoteText('');
  }

  async function updateCommunityNote(noteId, text) {
    const response = await fetch(
      `${supabaseFunctionsApiBase}/voice-notes/${noteId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          transcription: text,
          summary: text
        })
      }
    );

    if (!response.ok) throw new Error('Failed to update community note.');
    const data = await response.json();
    setVoiceNotes((current) => current.map((note) => note.id === noteId ? data.note : note));
    return data.note;
  }

  async function handleSaveCommunityNote(noteId) {
    if (!editingNoteText.trim()) {
      alert(t('alertNeedTitleAndContent'));
      return;
    }

    try {
      await updateCommunityNote(noteId, editingNoteText.trim());
      setEditingNoteId(null);
      setEditingNoteText('');
    } catch (error) {
      console.log('Community note update error:', error);
      alert(t('alertFailedUpdateNote'));
    }
  }

  async function handleRerecordCommunityNote(noteId) {
    if (!accessibilitySettings.speechToText) {
      alert(t('alertSpeechToTextOff'));
      return;
    }

    setRecordingNoteId(noteId);
    try {
      alert(t('alertVoiceRecordingStarted'));
      const transcript = await recordSpeechToText(language, accessToken);
      if (!transcript) {
        alert(t('alertTranscribeFailed'));
        return;
      }

      await updateCommunityNote(noteId, transcript);
      if (editingNoteId === noteId) {
        setEditingNoteText(transcript);
      }
      alert(t('alertCommunityNoteUpdated'));
    } catch (error) {
      console.log('Community note rerecord error:', error);
      alert(t('alertMicrophoneUnavailable'));
    } finally {
      setRecordingNoteId(null);
    }
  }

  function getHelpPageText() {
    return [
      t('help'),
      t('helpListenTitle'),
      t('helpListenBody'),
      t('helpLanguageSupport'),
      t('helpVoiceTitle'),
      t('helpVoiceBody'),
      t('helpTasksTitle'),
      t('helpTasksBody'),
      t('taskGuideVideoBullet'),
      t('taskGuideImageBullet'),
      t('taskGuideReminderBullet'),
      t('requestHelpNow'),
      t('helpImmediateBody'),
      t('helpImmediateBullet1'),
      t('helpImmediateBullet2'),
      t('helpImmediateBullet3'),
      t('scheduledSupport'),
      t('helpScheduledBody'),
      t('vitals'),
      t('helpVitalsBody'),
      t('notifications'),
      t('helpNotificationsBody'),
      t('settings'),
      t('helpSettingsBody'),
      t('helpSettingsBullet1'),
      t('helpSettingsBullet2'),
      t('helpSettingsBullet3'),
      t('helpSettingsBullet4'),
      t('needMoreHelp'),
      t('supportTeamAlwaysHere')
    ].join(' ');
  }

  async function handleDismissNotification(notificationId) {
    setNotifications(notifications.filter(n => n.id !== notificationId));

    try {
      await fetch(
        `${supabaseFunctionsApiBase}/notifications/${notificationId}/dismiss`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
    } catch (error) {
      console.log('Error dismissing notification:', error);
    }
  }

  async function handleRequestImmediateHelp() {
    setSearchingForCaregiver(true);
    setImmediateHelpRequest({
      id: Date.now(),
      requestedAt: new Date().toISOString(),
      location: requestLocation?.address || 'Tampines Street 81, Block 123',
      status: 'searching'
    });

    let location = requestLocation;
    if (!location) {
      try {
        const position = await getCurrentPosition();
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: 'Current location'
        };
        setRequestLocation(location);
      } catch (error) {
        location = {
          latitude: 1.3521,
          longitude: 103.9448,
          address: 'Tampines Street 81, Block 123'
        };
        setRequestLocation(location);
      }
    }

    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/match-help`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address
          })
        }
      );

      const data = await response.json();
      if (response.ok && data?.status === 'matched') {
        const matched = data.request;
        const distanceKm = Number(matched.distanceKm ?? 0);
        setImmediateHelpRequest({
          id: matched.id,
          requestedAt: matched.requestedAt,
          location: matched.patientLocation.address,
          status: 'found',
          caregiverName: matched.caregiverName,
          caregiverDistance: `${distanceKm.toFixed(1)} km away`,
          estimatedArrival: `${Math.max(5, Math.round(distanceKm * 4))} mins`,
          caregiverPhone: matched.caregiverPhone,
          caregiverLatitude: matched.caregiverLocation.latitude,
          caregiverLongitude: matched.caregiverLocation.longitude,
          patientLatitude: matched.patientLocation.latitude,
          patientLongitude: matched.patientLocation.longitude
        });
      } else {
        setImmediateHelpRequest(prev => ({
          ...prev,
          status: 'not_found',
          failureReason: data?.error || 'No available caregivers found'
        }));
      }
    } catch (error) {
      console.log('Error requesting help:', error);
      setImmediateHelpRequest(prev => ({
        ...prev,
        status: 'failed',
        failureReason: 'Unable to contact the matching service'
      }));
    } finally {
      await loadAvailableCaregivers();
      setSearchingForCaregiver(false);
    }
  }

  function handleCancelRequest() {
    setImmediateHelpRequest(null);
    setSearchingForCaregiver(false);
  }

  function handleCallCaregiver() {
    callPhoneNumber(immediateHelpRequest?.caregiverPhone);
  }

  function handleCallPatient() {
    callPhoneNumber(patientContactPhone);
  }

  async function handleCheckLocation(notification) {
    if (!patientId) {
      alert(t('alertNoLinkedPatient'));
      return;
    }

    try {
      const location = await fetchPatientGpsLocation(patientId);
      if (location) {
        setPatientLocation({
          name: location.address || formatCoordinates(location.latitude, location.longitude),
          coordinates: {
            lat: location.latitude,
            lng: location.longitude
          },
          timestamp: formatGpsTimestamp(location.updatedAt)
        });
        setShowLocationMap(true);
        return;
      }
    } catch (error) {
      console.log('Error fetching patient location:', error);
    }

    if (notification?.coordinates?.lat && notification?.coordinates?.lng) {
      setPatientLocation({
        name: notification.location || formatCoordinates(notification.coordinates.lat, notification.coordinates.lng),
        coordinates: notification.coordinates,
        timestamp: notification.time ? formatGpsTimestamp(notification.time) : ''
      });
      setShowLocationMap(true);
      return;
    }

    alert(t('alertNoPatientLocation'));
  }

  function handleCloseLocationMap() {
    setShowLocationMap(false);
    setPatientLocation(null);
  }

  function handleNavigateToPatientLocation() {
    if (!patientLocation?.coordinates) return;
    const { lat, lng } = patientLocation.coordinates;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  }

  function normalizeName(name = '') {
    return name
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isAssignedToPrimaryCaregiver(session) {
    if (!session) return false;
    if (session.caregiverId && session.caregiverId === user?.id) return true;
    const assignedName = normalizeName(session.caregiverName);
    const primaryName = normalizeName(profile?.name);
    return Boolean(assignedName && primaryName && assignedName === primaryName);
  }

  function hasAssignedVolunteer(session) {
    return session.status === 'accepted' && session.caregiverName && !isAssignedToPrimaryCaregiver(session);
  }

  function getCaregiverStressLevel(score) {
    if (score === null || score === undefined) {
      return {
        levelKey: 'assessmentNotCompleted',
        messageKey: 'assessmentNotCompletedMsg',
        band: 'none',
        colorClass: 'text-gray-700',
        bgClass: 'bg-gray-100',
        borderClass: 'border-gray-200',
        tipKey: 'assessmentNotCompletedMsg',
        markerPercent: 0
      };
    }

    if (score <= 10) {
      return {
        levelKey: 'burdenLowTitle',
        messageKey: 'burdenLowMsg',
        band: 'green',
        label: 'Green',
        colorClass: 'text-green-700',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        tipKey: 'burdenLowTip',
        markerPercent: Math.min(100, Math.max(0, (score / 48) * 100))
      };
    }

    if (score <= 20) {
      return {
        levelKey: 'burdenMidTitle',
        messageKey: 'burdenMidMsg',
        band: 'orange',
        label: 'Orange',
        colorClass: 'text-orange-700',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        tipKey: 'burdenMidTip',
        markerPercent: Math.min(100, Math.max(0, (score / 48) * 100))
      };
    }

    return {
      levelKey: 'burdenHighTitle',
      messageKey: 'burdenHighMsg',
      band: 'red',
      label: 'Red',
      colorClass: 'text-red-700',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      tipKey: 'burdenHighTip',
      markerPercent: Math.min(100, Math.max(0, (score / 48) * 100))
    };
  }

  return (
    <div className="size-full isomer-app-shell flex flex-col">
      {/* Top Bar */}
      <div className="relative isomer-topbar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold">{t('brandName')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('notifications')}
            className="relative p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Bell className="w-6 h-6" />
            {visibleNotifications.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {visibleNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20">
        {activeView === 'home' && (
          <div className="p-4">
            {/* Welcome Message */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('welcome')} {profile.name}, {t('welcomeBack')}</h2>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setActiveView('community')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-purple-400 hover:shadow-lg transition-all active:scale-95"
              >
                <Users className="w-12 h-12 text-blue-700" />
                <span className="text-sm font-semibold text-gray-800 text-center">{t('communitySupport')}</span>
              </button>

              <button
                onClick={() => setActiveView('vitals')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-blue-400 hover:shadow-lg transition-all active:scale-95"
              >
                <Activity className="w-12 h-12 text-blue-600" />
                <span className="text-sm font-semibold text-gray-800 text-center">{t('vitals')}</span>
              </button>

              <button
                onClick={() => setActiveView('notes')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:shadow-lg transition-all active:scale-95"
                style={{ borderColor: '#4A9EFF' }}
              >
                <MessageSquare className="w-12 h-12" style={{ color: '#4A9EFF' }} />
                <span className="text-sm font-semibold text-gray-800 text-center">{t('communityNotes')}</span>
              </button>
            </div>

            {(() => {
              const stressLevel = getCaregiverStressLevel(caregiverStressScore);
              const distressGuide = [
                {
                  colorClass: 'text-green-700',
                  dotClass: 'bg-green-500',
                  titleKey: 'burdenLowTitle',
                  messageKey: 'burdenLowMsg',
                  tipKey: 'burdenLowTip'
                },
                {
                  colorClass: 'text-yellow-700',
                  dotClass: 'bg-yellow-400',
                  titleKey: 'burdenMidTitle',
                  messageKey: 'burdenMidMsg',
                  tipKey: 'burdenMidTip'
                },
                {
                  colorClass: 'text-red-700',
                  dotClass: 'bg-red-500',
                  titleKey: 'burdenHighTitle',
                  messageKey: 'burdenHighMsg',
                  tipKey: 'burdenHighTip'
                }
              ];
              const distressThermometerText = [
                t('caregiverStressThermometer'),
                t('distressThermometerDescription'),
                t(stressLevel.levelKey),
                t(stressLevel.messageKey),
                ...distressGuide.flatMap((item) => [
                  t(item.titleKey),
                  t(item.messageKey),
                  t(item.tipKey)
                ])
              ].join('. ');

              return (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => setShowDistressThermometerInfo((current) => !current)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Thermometer className={`h-5 w-5 ${stressLevel.colorClass}`} />
                        <span className="truncate text-sm font-bold text-gray-800">{t('caregiverStressThermometer')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${stressLevel.colorClass} ${stressLevel.bgClass}`}>
                          {stressLevel.label}
                        </span>
                        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200">
                          {caregiverStressScore === null || caregiverStressScore === undefined
                            ? t('assessmentPendingShort')
                            : t('assessmentScoreOutOf', { score: caregiverStressScore, total: 48 })}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                      <div className="absolute inset-y-0 left-0 w-[23%] bg-green-500" />
                      <div className="absolute inset-y-0 left-[23%] w-[19%] bg-yellow-400" />
                      <div className="absolute inset-y-0 left-[42%] right-0 bg-red-500" />
                      {caregiverStressScore !== null && caregiverStressScore !== undefined && (
                        <div
                          className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-gray-900 shadow"
                          style={{ left: `calc(${stressLevel.markerPercent}% - 3px)` }}
                        />
                      )}
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-gray-500">
                      <span>{t('burdenLowTitle')}</span>
                      <span>{t('burdenMidTitle')}</span>
                      <span>{t('burdenHighTitle')}</span>
                    </div>
                  </button>

                  {showDistressThermometerInfo && (
                    <div className={`border-t px-4 py-4 ${stressLevel.bgClass} ${stressLevel.borderClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t('distressThermometerWhatItMeans')}</p>
                          <p className="mt-1 text-sm text-gray-700">{t('distressThermometerDescription')}</p>
                          <div className="mt-4 grid gap-3">
                            {distressGuide.map((item) => (
                              <div
                                key={item.titleKey}
                                className={`rounded-xl border bg-white/80 p-3 ${
                                  stressLevel.levelKey === item.titleKey ? `${stressLevel.borderClass} ring-2 ring-white` : 'border-white/70'
                                }`}
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                                  <p className={`text-sm font-bold ${item.colorClass}`}>{t(item.titleKey)}</p>
                                </div>
                                <p className="text-xs leading-relaxed text-gray-700">{t(item.messageKey)}</p>
                                <p className="mt-2 text-xs font-semibold leading-relaxed text-gray-800">{t(item.tipKey)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleTextToSpeech(distressThermometerText)}
                          disabled={!accessibilitySettings.textToSpeech}
                          className="shrink-0 rounded-xl bg-white p-2 text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('tooltipReadAloud')}
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* My Tasks Section */}
            <div className="bg-white rounded-2xl border-2 overflow-hidden mb-4" style={{ borderColor: '#4A9EFF' }}>
              <div className="px-4 py-3 flex items-center justify-between border-b-2" style={{ backgroundColor: '#E1F0FF', borderColor: '#4A9EFF' }}>
                <h3 className="text-lg font-bold text-gray-800">{t('myTasks')}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-lg transition-colors"
                    style={{ hover: { backgroundColor: '#D0EBFF' } }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D0EBFF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={t('tooltipRefresh')}
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowMyTaskManager(true)}
                    className="p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D0EBFF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={t('tooltipAddTask')}
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">{t('noTasks')}</p>
                  <button
                    onClick={() => setShowMyTaskManager(true)}
                    className="px-6 py-3 text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                    style={{ backgroundColor: '#4A9EFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A9EFF'}
                  >
                    <Plus className="w-5 h-5" />
                    {t('addFirstTask')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => handleTextToSpeech(`${dt(task.title)}. ${dt('Time')}: ${task.time || dt('No time set')}`)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        title={t('readAloud')}
                      >
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-semibold text-gray-800">{dt(task.title)}</span>
                          <div className="flex gap-1">
                            {task.videoUrl && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <Video className="w-3 h-3" /> {t('labelVideo')}
                              </span>
                            )}
                            {task.imageUrl && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> {t('labelImage')}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.time && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{task.time}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {task.completedAt ? (
                          <CheckCircle className="w-6 h-6" style={{ color: '#4A9EFF' }} />
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient's Tasks Section */}
            <div className="bg-white rounded-2xl border-2 border-blue-300 overflow-hidden mb-4">
              <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-800">{t('patientTasks')}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title={t('tooltipRefresh')}
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowTaskManager(true)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title={t('tooltipAddTask')}
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">{t('noTasksScheduled')}</p>
                  <button
                    onClick={() => setShowTaskManager(true)}
                    className="px-6 py-3 text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                    style={{ backgroundColor: '#4A9EFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A9EFF'}
                  >
                    <Plus className="w-5 h-5" />
                    {t('addFirstTask')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => handleTextToSpeech(`${dt(task.title)}. ${dt('Time')}: ${task.time || dt('No time set')}`)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        title={t('readAloud')}
                      >
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-semibold text-gray-800">{dt(task.title)}</span>
                          <div className="flex gap-1">
                            {task.videoUrl && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <Video className="w-3 h-3" /> {t('labelVideo')}
                              </span>
                            )}
                            {task.imageUrl && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> {t('labelImage')}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.time && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{task.time}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {task.completedAt ? (
                          <CheckCircle className="w-6 h-6" style={{ color: '#4A9EFF' }} />
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Community Support Section */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
              <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b-2 border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-700" />
                  {t('scheduledSupport')}
                </h3>
                <button
                  onClick={() => setShowCommunitySupportScheduler(true)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title={t('tooltipScheduleSupport')}
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {communitySupport.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">{t('noCommunitySupport')}</p>
                  <button
                    onClick={() => setShowCommunitySupportScheduler(true)}
                    className="px-6 py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    {t('scheduleCommunitySupport')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {communitySupport.map((session) => (
                    <div
                      key={session.id}
                      className="px-4 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {hasAssignedVolunteer(session) ? (
                              <>
                                <Users className="w-5 h-5 text-blue-700" />
                                <span className="text-base font-semibold text-gray-800">{session.caregiverName}</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                                  {dt('Volunteer assigned')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className="text-base font-semibold text-gray-600">{t('waitingCaregiver')}</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                                  {dt('Awaiting volunteer')}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-purple-700 ml-8 mb-2">{dt('Your request')}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-8 mb-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.date} {t('at')} {session.time}
                            </span>
                            <span>{t('duration')}: {dt(session.duration)}</span>
                          </div>
                          {session.tasks && (
                            <p className="text-sm text-gray-600 ml-8">📋 {dt(session.tasks)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleTextToSpeech([
                            t('scheduledSupport'),
                            hasAssignedVolunteer(session) ? `${dt('Volunteer assigned')}: ${session.caregiverName}` : dt('Awaiting volunteer'),
                            `${session.date} ${t('at')} ${session.time}`,
                            `${t('duration')}: ${dt(session.duration)}`,
                            session.tasks ? dt(session.tasks) : ''
                          ].filter(Boolean).join('. '))}
                          disabled={!accessibilitySettings.textToSpeech}
                          className="ml-3 rounded-xl bg-purple-50 p-2 text-purple-600 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('tooltipReadAloud')}
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'notifications' && (
          <div className="p-4">
            <button
              onClick={() => setActiveView('home')}
              className="mb-4 font-semibold flex items-center gap-2"
              style={{ color: '#4A9EFF' }}
            >
              ← {t('backToHome')}
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('notifications')}</h2>
            {!accessibilitySettings.notifications ? (
              <p className="text-gray-500 text-center py-8">{dt('Notifications are turned off in Settings.')}</p>
            ) : visibleNotifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noNotifications')}</p>
            ) : (
              <div className="space-y-3">
                {visibleNotifications.map((notification) => {
                  const notificationMessage = notification.messageKey
                    ? t(notification.messageKey)
                    : dt(notification.message);

                  return (
                  <div
                    key={notification.id}
                    className="bg-red-50 border-2 border-red-300 rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleTextToSpeech(notificationMessage)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                        title={t('readAloud')}
                      >
                        <Volume2 className="w-5 h-5 text-red-600" />
                      </button>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 text-lg mb-2">{notificationMessage}</p>
                        {notification.location && (
                          <button
                            onClick={() => handleCheckLocation(notification)}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {t('checkLocation')}
                          </button>
                        )}
                        <p className="text-xs text-gray-600 mt-2">{dt(notification.time)}</p>
                      </div>
                      <button
                        onClick={() => handleDismissNotification(notification.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title={t('tooltipDismiss')}
                      >
                        <X className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'community' && (
          <div className="size-full bg-white flex flex-col">
            {!immediateHelpRequest ? (
              <div className="p-4">
                <button
                  onClick={() => setActiveView('home')}
                  className="mb-4 font-semibold flex items-center gap-2"
                  style={{ color: '#4A9EFF' }}
                >
                  ← {t('backToHome')}
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('communitySupport')}</h2>
                <p className="text-gray-600 mb-6">{t('helpImmediateIntro')}</p>
                
                <div className="bg-gray-100 rounded-2xl overflow-hidden mb-6 relative" style={{ height: '400px' }}>
                  {requestLocation ? (
                    <MapContainer
                      center={[requestLocation.latitude, requestLocation.longitude]}
                      zoom={17}
                      style={{ height: '100%', width: '100%' }}
                      className="rounded-2xl"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        maxZoom={19}
                      />
                      <Marker position={[requestLocation.latitude, requestLocation.longitude]} icon={homeMapIcon}>
                        <Popup>
                          <strong>{t('youAreHome')}</strong><br />
                          {requestLocation.address}
                        </Popup>
                      </Marker>
                      {availableCaregivers.map((caregiver, index) => (
                        caregiver.latitude && caregiver.longitude && (
                          <Marker
                            key={`caregiver-${index}`}
                            position={[caregiver.latitude, caregiver.longitude]}
                            icon={caregiverMapIcon}
                          >
                            <Popup>
                              <strong>{caregiver.name || t('communityCaregiver')}</strong><br />
                              {t('myAvailability')}
                            </Popup>
                          </Marker>
                        )
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t('mapShowsLocation')}<br />{t('mapShowsCaregivers')}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-white/90 rounded-2xl px-4 py-3 shadow-lg text-sm text-gray-700 z-[1000]">
                    {t('mapShowsLocation')}<br />{t('mapShowsCaregivers')}
                  </div>
                </div>

                {/* Request Button */}
                <button
                  onClick={handleRequestImmediateHelp}
                  className="w-full bg-blue-700 text-white py-5 rounded-3xl font-bold text-xl hover:bg-blue-800 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                  <Users className="w-8 h-8" />
                  {t('requestHelpNow')}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  {t('plannedSupportHint')}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Map View with Request */}
                <div className="flex-1 relative">
                  {requestLocation ? (
                    <MapContainer
                      center={[
                        immediateHelpRequest.patientLatitude || requestLocation.latitude,
                        immediateHelpRequest.patientLongitude || requestLocation.longitude
                      ]}
                      zoom={17}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        maxZoom={19}
                      />
                      <Marker
                        position={[
                          immediateHelpRequest.patientLatitude || requestLocation.latitude,
                          immediateHelpRequest.patientLongitude || requestLocation.longitude
                        ]}
                        icon={patientMapIcon}
                      >
                        <Popup>
                          <strong>{t('patientLocation')}</strong><br />
                          {immediateHelpRequest.location || requestLocation.address}
                        </Popup>
                      </Marker>
                      {immediateHelpRequest.status === 'found' && immediateHelpRequest.caregiverLatitude && immediateHelpRequest.caregiverLongitude && (
                        <>
                          <Marker
                            position={[immediateHelpRequest.caregiverLatitude, immediateHelpRequest.caregiverLongitude]}
                            icon={caregiverMapIcon}
                          >
                            <Popup>
                              <strong>{immediateHelpRequest.caregiverName}</strong><br />
                              {immediateHelpRequest.caregiverDistance}
                            </Popup>
                          </Marker>
                          <Polyline
                            positions={[
                              [
                                immediateHelpRequest.patientLatitude || requestLocation.latitude,
                                immediateHelpRequest.patientLongitude || requestLocation.longitude
                              ],
                              [immediateHelpRequest.caregiverLatitude, immediateHelpRequest.caregiverLongitude]
                            ]}
                            pathOptions={{ color: '#16a34a', weight: 4, opacity: 0.7 }}
                          />
                        </>
                      )}
                      {immediateHelpRequest.status !== 'found' && availableCaregivers.map((caregiver, index) => (
                        caregiver.latitude && caregiver.longitude && (
                          <Marker
                            key={`caregiver-${index}`}
                            position={[caregiver.latitude, caregiver.longitude]}
                            icon={caregiverMapIcon}
                          >
                            <Popup>
                              <strong>{caregiver.name || t('communityCaregiver')}</strong>
                            </Popup>
                          </Marker>
                        )
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="size-full bg-slate-100 flex items-center justify-center">
                      <MapPin className="w-24 h-24 text-gray-300" />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 bg-white/90 rounded-2xl px-4 py-3 shadow-lg text-sm text-gray-700 z-[1000]">
                    {t('mapShowsLocation')}<br />{t('mapShowsCaregivers')}
                  </div>

                  <button
                    onClick={() => setActiveView('home')}
                    className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50"
                  >
                    <X className="w-6 h-6 text-gray-700" />
                  </button>
                </div>

                {/* Bottom Sheet - Request Status */}
                <div className="bg-white rounded-t-3xl shadow-2xl p-6">
                  {searchingForCaregiver ? (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-purple-600 rounded-full animate-spin" style={{ borderTopColor: 'transparent' }}></div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{t('findingCaregivers')}</h3>
                      <p className="text-gray-600 mb-6">{t('findingCaregiversBody')}</p>
                      <button
                        onClick={handleCancelRequest}
                        className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
                      >
                        {t('cancelRequest')}
                      </button>
                    </div>
                  ) : immediateHelpRequest.status === 'not_found' || immediateHelpRequest.status === 'failed' ? (
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <Users className="w-12 h-12 text-gray-400 mx-auto" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">No caregiver match found</h3>
                      <p className="text-gray-600 mb-6">{immediateHelpRequest.failureReason || 'Please try again later or refresh the app.'}</p>
                      <button
                        onClick={handleCancelRequest}
                        className="w-full bg-blue-700 text-white py-4 rounded-2xl font-semibold hover:bg-blue-800 transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800">{immediateHelpRequest.caregiverName}</h3>
                          <p className="text-green-600 font-semibold">{dt(immediateHelpRequest.caregiverDistance)} • {dt(immediateHelpRequest.estimatedArrival)}</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-800">{immediateHelpRequest.estimatedArrival?.split(' ')[0]}</div>
                          <div className="text-xs text-gray-500">{dt('mins')}</div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-700">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <span className="text-sm">{dt('Pickup')}: {dt(immediateHelpRequest.location)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span className="text-sm">{dt('Requested')}: {new Date(immediateHelpRequest.requestedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleCallCaregiver}
                          className="bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone className="w-5 h-5" />
                          {t('call')}
                        </button>
                        <button
                          onClick={handleCancelRequest}
                          className="bg-red-50 text-red-600 py-4 rounded-2xl font-semibold hover:bg-red-100 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'vitals' && (
          <div className="p-4">
            <button
              onClick={() => setActiveView('home')}
              className="mb-4 font-semibold flex items-center gap-2"
              style={{ color: '#4A9EFF' }}
            >
              ← {t('backToHome')}
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('vitals')}</h2>
            {vitals.length === 0 ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
                <Activity className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-700">{t('noNotes')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {vitals.map((vital) => (
                  <div key={vital.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <p className="text-sm text-gray-600 mb-1">{vital.type}</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {vital.value} <span className="text-base font-normal text-gray-600">{vital.unit}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(vital.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'notes' && (
          <div className="p-4">
            <button
              onClick={() => setActiveView('home')}
              className="mb-4 font-semibold flex items-center gap-2"
              style={{ color: '#4A9EFF' }}
            >
              ← {t('backToHome')}
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('communityNotes')}</h2>
            <div className="mb-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
              <textarea
                value={newCommunityNoteText}
                onChange={(e) => setNewCommunityNoteText(e.target.value)}
                placeholder={t('addCommunityNotePlaceholder')}
                className="min-h-[110px] w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveNewCommunityNote}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#4A9EFF' }}
                >
                  {t('save')}
                </button>
                <button
                  onClick={handleRecordNewCommunityNote}
                  disabled={!accessibilitySettings.speechToText || isRecordingNewCommunityNote}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic className={`w-4 h-4 ${isRecordingNewCommunityNote ? 'animate-pulse' : ''}`} />
                  {isRecordingNewCommunityNote ? t('stopRecording') : t('recordNote')}
                </button>
              </div>
            </div>
            {voiceNotes.length === 0 ? (
              <div className="border-2 rounded-2xl p-8 text-center" style={{ backgroundColor: '#E1F0FF', borderColor: '#4A9EFF' }}>
                <MessageSquare className="w-16 h-16 mx-auto mb-4" style={{ color: '#4A9EFF' }} />
                <p className="text-gray-700">{t('noNotes')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {voiceNotes.map((note) => (
                  <div key={note.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    {editingNoteId === note.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="min-h-[120px] w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleSaveCommunityNote(note.id)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                            style={{ backgroundColor: '#4A9EFF' }}
                          >
                            {t('save')}
                          </button>
                          <button
                            onClick={handleCancelCommunityNoteEdit}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            onClick={() => handleRerecordCommunityNote(note.id)}
                            disabled={!accessibilitySettings.speechToText || recordingNoteId === note.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Mic className={`w-4 h-4 ${recordingNoteId === note.id ? 'animate-pulse' : ''}`} />
                            {recordingNoteId === note.id ? t('stopRecording') : t('rerecordNote')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <p className="flex-1 text-gray-800">{dt(getNoteText(note))}</p>
                          <button
                            onClick={() => handleTextToSpeech(dt(getNoteText(note)))}
                            disabled={!accessibilitySettings.textToSpeech}
                            className="rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={t('tooltipReadAloud')}
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-gray-500">
                            {new Date(note.updatedAt || note.createdAt).toLocaleString()}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditCommunityNote(note)}
                              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleRerecordCommunityNote(note.id)}
                              disabled={!accessibilitySettings.speechToText || recordingNoteId === note.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Mic className={`w-4 h-4 ${recordingNoteId === note.id ? 'animate-pulse' : ''}`} />
                              {recordingNoteId === note.id ? t('stopRecording') : t('rerecordNote')}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'resources' && (
          <div className="p-4">
            <button
              onClick={() => setActiveView('home')}
              className="mb-4 font-semibold flex items-center gap-2"
              style={{ color: '#4A9EFF' }}
            >
              ← {t('backToHome')}
            </button>

            <div className="space-y-4">
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-7 h-7 text-blue-700" />
                  <h3 className="text-lg font-bold text-gray-800">{t('resourcesSupport')}</h3>
                </div>
                <p className="text-gray-600 mb-4">{t('resourceQuickLinks')}</p>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>
                    <a href="https://www.caring.sg/" target="_blank" rel="noreferrer" className="underline">
                      {dt('Caring SG')}
                    </a>
                  </li>
                  <li>
                    <a href="https://www.aic.sg/Caregiving-Support/Connecting-with-other-caregivers" target="_blank" rel="noreferrer" className="underline">
                      {dt('AIC Caregiving Support')}
                    </a>
                  </li>
                  <li>
                    <a href="https://www.aic.sg/" target="_blank" rel="noreferrer" className="underline">
                      {dt('AIC Help for Caregivers')}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-7 h-7 text-blue-700" />
                  <h3 className="text-lg font-bold text-gray-800">{t('helplineContacts')}</h3>
                </div>
                <div className="space-y-3 text-gray-700">
                  <div className="rounded-xl border border-gray-200 p-4 bg-slate-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{dt('Club Heal')}</p>
                      <p>6899 3463</p>
                    </div>
                    <a
                      href={phoneHref('6899 3463')}
                      className="shrink-0 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      {t('call')}
                    </a>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 bg-slate-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{dt('Mindful Community')}</p>
                      <p>6460 4400</p>
                    </div>
                    <a
                      href={phoneHref('6460 4400')}
                      className="shrink-0 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      {t('call')}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardList className="w-7 h-7 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">{t('wellbeingAssessment')}</h3>
                </div>
                <p className="text-gray-600 mb-4">{t('supportTeamAlwaysHere')}</p>
                <button
                  onClick={() => navigate('/assessment')}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition"
                >
                  {t('takeAssessment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'help' && (
          <div className="p-4">
            <button
              onClick={() => setActiveView('home')}
              className="mb-4 font-semibold flex items-center gap-2"
              style={{ color: '#4A9EFF' }}
            >
              ← {t('backToHome')}
            </button>
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-gray-800">{t('help')}</h2>
              <button
                onClick={() => handleTextToSpeech(getHelpPageText())}
                disabled={!accessibilitySettings.textToSpeech}
                className="rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('tooltipReadAloud')}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Volume2 className="w-8 h-8 flex-shrink-0" style={{ color: '#4A9EFF' }} />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('helpListenTitle')}</h3>
                    <p className="text-gray-700 text-sm mb-2">{t('helpListenBody')}</p>
                    <p className="text-gray-600 text-xs">{t('helpLanguageSupport')}</p>
                  </div>
                </div>
              </div>

              {/* Voice Notes */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Mic className="w-8 h-8 flex-shrink-0 text-red-500" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('helpVoiceTitle')}</h3>
                    <p className="text-gray-700 text-sm">{t('helpVoiceBody')}</p>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-8 h-8 flex-shrink-0 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('helpTasksTitle')}</h3>
                    <p className="text-gray-700 text-sm mb-2">{t('helpTasksBody')}</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>{t('taskGuideVideoBullet')}</li>
                      <li>{t('taskGuideImageBullet')}</li>
                      <li>{t('taskGuideReminderBullet')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Community Support - Immediate */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-8 h-8 flex-shrink-0 text-blue-700" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('requestHelpNow')}</h3>
                    <p className="text-gray-700 text-sm mb-2">{t('helpImmediateBody')}</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>{t('helpImmediateBullet1')}</li>
                      <li>{t('helpImmediateBullet2')}</li>
                      <li>{t('helpImmediateBullet3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Scheduled Support */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-8 h-8 flex-shrink-0 text-blue-700" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('scheduledSupport')}</h3>
                    <p className="text-gray-700 text-sm">{t('helpScheduledBody')}</p>
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Activity className="w-8 h-8 flex-shrink-0 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('vitals')}</h3>
                    <p className="text-gray-700 text-sm">{t('helpVitalsBody')}</p>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-8 h-8 flex-shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('notifications')}</h3>
                    <p className="text-gray-700 text-sm">{t('helpNotificationsBody')}</p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Settings className="w-8 h-8 flex-shrink-0 text-gray-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('settings')}</h3>
                    <p className="text-gray-700 text-sm mb-2">{t('helpSettingsBody')}</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>{t('helpSettingsBullet1')}</li>
                      <li>{t('helpSettingsBullet2')}</li>
                      <li>{t('helpSettingsBullet3')}</li>
                      <li>{t('helpSettingsBullet4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Need More Help */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-gray-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-3">{t('needMoreHelp')}</h3>
              <p className="text-gray-700 text-sm mb-4">{t('supportTeamAlwaysHere')}</p>
              <button
                onClick={() => setActiveView('resources')}
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all hover:shadow-lg"
                style={{ backgroundColor: '#4A9EFF' }}
              >
                {t('contactSupport')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'home' ? '' : 'text-gray-600'
          }`}
          style={activeView === 'home' ? { color: '#4A9EFF' } : {}}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('home')}</span>
        </button>
        <button
          onClick={() => setActiveView('resources')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'resources' ? '' : 'text-gray-600'
          }`}
          style={activeView === 'resources' ? { color: '#4A9EFF' } : {}}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('resources')}</span>
        </button>
        <button
          onClick={() => setActiveView('help')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'help' ? '' : 'text-gray-600'
          }`}
          style={activeView === 'help' ? { color: '#4A9EFF' } : {}}
        >
          <HelpCircle className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('help')}</span>
        </button>
      </div>

      {showTaskManager && (
        <TaskManager
          patientId={patientId || user.id}
          accessToken={accessToken}
          onClose={() => setShowTaskManager(false)}
          onTasksCreated={() => {
            setShowTaskManager(false);
            if (patientId) loadPatientData(patientId);
          }}
        />
      )}

      {showMyTaskManager && (
        <TaskManager
          patientId={user.id}
          accessToken={accessToken}
          onClose={() => setShowMyTaskManager(false)}
          onTasksCreated={() => {
            setShowMyTaskManager(false);
            // Load my tasks
            setMyTasks([...myTasks, { id: Date.now(), title: 'Sample task', time: '10:00', completedAt: null }]);
          }}
        />
      )}

      {showCommunitySupportScheduler && (
        <CommunitySupportScheduler
          userId={user.id}
          accessToken={accessToken}
          onClose={() => setShowCommunitySupportScheduler(false)}
          onSessionCreated={() => {
            setShowCommunitySupportScheduler(false);
            loadCommunitySupport();
          }}
        />
      )}

      {/* Location Map Modal */}
      {showLocationMap && patientLocation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          {/* Map View */}
          <div className="flex-1 relative">
            <MapContainer
              center={[patientLocation.coordinates.lat, patientLocation.coordinates.lng]}
              zoom={17}
              style={{ height: '100%', width: '100%' }}
              className="rounded-none"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
              <Marker
                position={[patientLocation.coordinates.lat, patientLocation.coordinates.lng]}
                icon={patientMapIcon}
              >
                <Popup>
                  <strong>{t('patientLocation')}</strong><br />
                  {patientLocation.name}<br />
                  <small>{patientLocation.timestamp}</small>
                </Popup>
              </Marker>
              {requestLocation && (
                <>
                  <Marker
                    position={[requestLocation.latitude, requestLocation.longitude]}
                    icon={homeMapIcon}
                  >
                    <Popup>
                      <strong>{t('youAreHome')}</strong><br />
                      {requestLocation.address}
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[
                      [requestLocation.latitude, requestLocation.longitude],
                      [patientLocation.coordinates.lat, patientLocation.coordinates.lng]
                    ]}
                    pathOptions={{ color: '#dc2626', weight: 4, opacity: 0.7 }}
                  />
                </>
              )}
            </MapContainer>

            {/* Close Button */}
            <button
              onClick={handleCloseLocationMap}
              className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-colors z-[1000]"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Bottom Info Sheet */}
          <div className="bg-white rounded-t-3xl shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{t('patientLocation')}</h3>
                <p className="text-gray-700 font-semibold text-lg mb-2">{patientLocation.name}</p>
                <p className="text-sm text-gray-500">{patientLocation.timestamp}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCallPatient}
                disabled={!patientContactPhone}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Phone className="w-5 h-5" />
                {t('callPatient')}
              </button>
              <button
                onClick={handleNavigateToPatientLocation}
                className="w-full bg-blue-700 text-white py-4 rounded-2xl font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                {t('navigate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
