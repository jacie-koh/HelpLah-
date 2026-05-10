import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, MapPin, Users, CheckCircle, Bell, LayoutGrid, Home, FileText, BookOpen, Calendar, MessageCircle, Mic, Phone } from 'lucide-react';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';
import { useDynamicTranslations } from '../utils/dynamicTranslations';
import { recordSpeechToText } from '../utils/voice';
import { phoneHref } from '../utils/phone';

export function CommunityCaregiverView({ user, profile, accessToken }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [communityNotes, setCommunityNotes] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [lostAlerts, setLostAlerts] = useState([]);
  const [activeView, setActiveView] = useState('home');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteSummary, setNewNoteSummary] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSummary, setEditingSummary] = useState('');
  const [recordingNoteField, setRecordingNoteField] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [editingDayIndex, setEditingDayIndex] = useState(null);
  const [editingStartTime, setEditingStartTime] = useState('');
  const [editingEndTime, setEditingEndTime] = useState('');
  const [weeklyAvailability, setWeeklyAvailability] = useState([
    { day: 'Mon', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Tue', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Wed', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Thu', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Fri', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'Sat', available: false, startTime: '09:00', endTime: '17:00' },
    { day: 'Sun', available: false, startTime: '09:00', endTime: '17:00' }
  ]);
  const navigate = useNavigate();
  const { language, accessibilitySettings } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) =>
    getTranslation(language, key, vars);
  const greetingName = profile?.name || 'Caregiver';
  const dt = useDynamicTranslations(
    [
      ...patients.flatMap((patient) => [
        patient.distance,
        patient.lastActivity,
        patient.helpNeeded,
        patient.timeNeeded,
        ...(patient.assignments || []).flatMap((assignment) => [assignment.task])
      ]),
      ...communityNotes.flatMap((note) => [note.title, note.summary, note.time]),
      ...supportRequests.flatMap((request) => [
        request.location,
        request.distance,
        request.request,
        request.time,
        request.status
      ]),
      ...availableAssignments.flatMap((assignment) => [
        assignment.task,
        assignment.location,
        assignment.status
      ]),
      ...getCommunityAlerts().flatMap((alertItem) => [
        alertItem.message,
        alertItem.title,
        alertItem.alert?.address,
        alertItem.alert?.distanceLabel,
        alertItem.patient?.helpNeeded,
        alertItem.patient?.timeNeeded,
        alertItem.patient?.distance
      ]),
      'Notifications are turned off in Settings.',
      'Just now',
      'Updated now',
      'Caring SG',
      'AIC Caregiving Support',
      'AIC Help for Caregivers',
      'Club Heal',
      'Mindful Community',
      'SEA Lion Chatbot'
    ],
    language,
    accessToken
  );
  const localeByLanguage = {
    'en-sg': 'en-SG',
    'zh-sg': 'zh-SG',
    'zh-min': 'zh-SG',
    'zh-yue': 'zh-HK',
    'ms-sg': 'ms-SG',
    'ta-sg': 'ta-SG'
  };
  const locale = localeByLanguage[language] || 'en-SG';

  useEffect(() => {
    if (user?.id && accessToken) {
      loadAvailability();
      loadPatients();
      loadLostAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAvailable) {
      reportCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable]);

  async function loadAvailability() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/caregiver/${user.id}/availability`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.availability?.available || false);
        setIsWatching(data.availability?.available || false);
      }
    } catch (error) {
      console.log('Error loading availability:', error);
    }
  }

  async function reportCurrentLocation() {
    if (!navigator?.geolocation || !accessToken || !user?.id) {
      return;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
        };

        try {
            await fetch(
              `${supabaseFunctionsApiBase}/location`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify(location)
              }
            );
            await loadLostAlerts();
          } catch (error) {
            console.log('Error reporting current location:', error);
          }

        resolve(location);
      }, (error) => {
        console.log('Geolocation error:', error);
        resolve(null);
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  async function loadLostAlerts() {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/community/lost-alerts`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setLostAlerts(data.alerts || []);
      }
    } catch (error) {
      console.log('Error loading lost alerts:', error);
    }
  }

  function openLostAlertMap(alert) {
    if (!alert?.latitude || !alert?.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function saveAvailability(available) {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/caregiver/${user.id}/availability`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ available })
        }
      );

      if (response.ok) {
        console.log('Availability updated successfully');
      } else {
        console.log('Error updating availability');
      }
    } catch (error) {
      console.log('Error saving availability:', error);
    }
  }

  async function loadPatients() {
    const now = new Date();
    const demoAssignmentStart = new Date(now);
    demoAssignmentStart.setMinutes(0, 0, 0);
    const demoAssignmentEnd = new Date(demoAssignmentStart.getTime() + 60 * 60 * 1000);
    const formatAssignmentTime = (date) =>
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const patientsData = [
      {
        id: '1',
        name: 'Uncle Tan',
        status: 'home',
        distance: '2.3 km away',
        tasksCompleted: 5,
        tasksTotal: 7,
        lastActivity: '2h ago',
        hasAssignedCaretaker: true,
        needsCareSoon: false,
        assignments: [
          {
            id: 'a1',
            date: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            startTime: '14:00',
            endTime: '16:00',
            task: 'Medication assistance and lunch support'
          },
          {
            id: 'a2',
            date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
            startTime: '10:00',
            endTime: '12:00',
            task: 'Morning medication and breakfast'
          }
        ]
      },
      {
        id: '2',
        name: 'Mrs. Lim',
        status: 'home',
        distance: '1.8 km away',
        tasksCompleted: 3,
        tasksTotal: 5,
        lastActivity: '30 min ago',
        hasAssignedCaretaker: false,
        needsCareSoon: true,
        requesterName: 'Nisha',
        helpNeeded: 'Meal preparation and medication reminders',
        timeNeeded: 'Today at 5:00 PM - 7:00 PM',
        assignments: []
      },
      {
        id: '3',
        name: 'Mr. Chen',
        status: 'clinic',
        distance: '3.1 km away',
        tasksCompleted: 8,
        tasksTotal: 10,
        lastActivity: '1h ago',
        hasAssignedCaretaker: false,
        needsCareSoon: true,
        requesterName: 'Sarah Tan',
        helpNeeded: 'Transportation to clinic and follow-up care',
        timeNeeded: 'Today at 2:00 PM - 4:00 PM',
        assignments: []
      }
    ];
    setPatients(patientsData);

    // Patient-specific notes with time locks
    setCommunityNotes([
      {
        id: 'n1',
        patientId: '1',
        title: 'Medication Check',
        summary: 'Primary caregiver logged that medications were administered at 5:00 PM and the patient is resting.',
        time: '10 min ago',
        assignmentId: 'accepted_demo_1',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
        assignmentStart: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago (currently accessible)
        assignmentEnd: new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now
      },
      {
        id: 'n2',
        patientId: '1',
        title: 'Mobility Note',
        summary: 'Patient was assisted with a short walk today. No dizziness reported.',
        time: '45 min ago',
        assignmentId: 'accepted_demo_1',
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
        assignmentStart: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago (currently accessible)
        assignmentEnd: new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
      }
    ]);

    setSupportRequests([
      {
        id: 'r1',
        patientId: '1',
        caregiverName: 'Mei Ling',
        patientName: 'Uncle Tan',
        location: 'Bedok Central',
        distance: '1.1 km away',
        request: 'Need help with dinner and medication this evening.',
        time: '3 min ago',
        status: 'pending'
      },
      {
        id: 'r2',
        patientId: '2',
        caregiverName: 'Nisha',
        patientName: 'Mrs. Lim',
        location: 'Paya Lebar',
        distance: '2.4 km away',
        request: 'Looking for a caregiver to watch the patient for 2 hours while I attend a clinic visit.',
        time: '12 min ago',
        status: 'pending'
      }
    ]);

    // Available assignments for the calendar
    setAvailableAssignments([
      {
        id: 'accepted_demo_1',
        patientId: '1',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        startTime: formatAssignmentTime(demoAssignmentStart),
        endTime: formatAssignmentTime(demoAssignmentEnd),
        patientName: 'Uncle Tan',
        task: 'Medication assistance and lunch support',
        location: 'Bedok Central',
        status: 'accepted'
      },
      {
        id: 'avail1',
        patientId: '1',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '11:00',
        patientName: 'Uncle Tan',
        task: 'Morning medication and breakfast support',
        location: 'Bedok Central',
        status: 'open'
      },
      {
        id: 'avail2',
        patientId: '2',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        startTime: '14:00',
        endTime: '16:00',
        patientName: 'Mrs. Lim',
        task: 'Afternoon medication and lunch',
        location: 'Paya Lebar',
        status: 'open'
      },
      {
        id: 'avail3',
        patientId: '1',
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '12:00',
        patientName: 'Uncle Tan',
        task: 'Morning routine assistance',
        location: 'Bedok Central',
        status: 'open'
      }
    ]);

    await loadOpenCommunitySupportRequests();
  }

  async function loadOpenCommunitySupportRequests() {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/community-support/open`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const openAssignments = (data.requests || []).map((request) => {
          const assignmentDate = request.date ? new Date(`${request.date}T00:00:00`) : new Date();
          const startTime = request.time || '09:00';
          const [startHour = '9', startMinute = '0'] = startTime.split(':');
          const end = new Date(assignmentDate);
          end.setHours(Number(startHour), Number(startMinute), 0, 0);
          end.setHours(end.getHours() + Math.max(1, Number(String(request.duration || '1').match(/\d+/)?.[0] || 1)));

          return {
            id: request.id,
            patientId: request.patientId || request.id,
            date: assignmentDate,
            startTime,
            endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
            patientName: request.patientName || t('patient'),
            task: request.tasks || t('requestCommunitySupport'),
            location: request.location || request.address || '',
            status: request.status === 'accepted' ? 'accepted' : 'open',
            source: 'backend'
          };
        });

        setAvailableAssignments((current) => {
          const demoAssignments = current.filter((assignment) => assignment.source !== 'backend');
          return [...demoAssignments, ...openAssignments];
        });
      }
    } catch (error) {
      console.log('Error loading open community support requests:', error);
    }
  }

  async function toggleAvailability() {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);

    try {
      await fetch(
        `${supabaseFunctionsApiBase}/availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            caregiverId: user.id,
            available: newAvailability,
            patientId: patients[0]?.id
          })
        }
      );

      if (newAvailability) {
        await reportCurrentLocation();
      }

      alert(newAvailability ? t('alertNowAvailable') : t('alertNowUnavailable'));
    } catch (error) {
      console.log('Error updating availability:', error);
    }
  }

  async function handleTakeOver() {
    setIsWatching(true);
    alert(t('alertWatchingPatient'));

    try {
      await fetch(
        `${supabaseFunctionsApiBase}/availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            caregiverId: user.id,
            available: true,
            patientId: patients[0]?.id
          })
        }
      );
      await reportCurrentLocation();
    } catch (error) {
      console.log('Error taking over care:', error);
    }
  }

  function handleAcceptRequest(requestId) {
    const request = supportRequests.find(r => r.id === requestId);
    if (request) {
      // Add the accepted request to available assignments
      const today = new Date();
      const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const newAssignment = {
        id: `accepted_${requestId}`,
        patientId: request.patientId,
        date: todayAtMidnight, // Today at midnight for proper date comparison
        startTime: '14:00', // Default start time
        endTime: '16:00', // Default end time
        patientName: request.patientName,
        task: request.request,
        location: request.location,
        status: 'accepted'
      };
      setAvailableAssignments(prev => [...prev, newAssignment]);
    }

    setSupportRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId ? { ...request, status: 'accepted' } : request
      )
    );
    alert(t('alertAcceptedRequest'));
  }

  function handleOfferHelp(patientId) {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      const today = new Date();
      const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const newAssignment = {
        id: `offered_${patientId}_${Date.now()}`,
        patientId: patient.id,
        date: todayAtMidnight,
        startTime: '14:00',
        endTime: '17:00',
        patientName: patient.name,
        task: patient.helpNeeded,
        location: patient.distance,
        status: 'accepted'
      };
      setAvailableAssignments(prev => [...prev, newAssignment]);
      alert(t('alertOfferHelpPrimaryNotified', { name: patient.name }));
    }
  }

  function getAssignmentDateTime(assignment, timeKey) {
    const [hours = '0', minutes = '0'] = assignment[timeKey].split(':');
    const date = new Date(assignment.date);
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date;
  }

  function isWithinAssignmentAccessWindow(assignment) {
    const now = new Date();
    const assignmentStart = getAssignmentDateTime(assignment, 'startTime');
    const assignmentEnd = getAssignmentDateTime(assignment, 'endTime');
    const sixtyMinBefore = new Date(assignmentStart.getTime() - 60 * 60 * 1000);
    const sixtyMinAfter = new Date(assignmentEnd.getTime() + 60 * 60 * 1000);

    return now >= sixtyMinBefore && now <= sixtyMinAfter;
  }

  function isHandledPatient(patientId) {
    return availableAssignments.some((assignment) =>
      assignment.status === 'accepted' &&
      assignment.patientId === patientId &&
      isWithinAssignmentAccessWindow(assignment)
    );
  }

  function getHandledPatients() {
    return patients.filter((patient) => isHandledPatient(patient.id));
  }

  function normalizeName(name = '') {
    return name
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isOwnRequest(request) {
    if (request.requesterId && request.requesterId === user?.id) {
      return true;
    }

    const currentName = normalizeName(profile?.name);
    const requesterName = normalizeName(request.requesterName || request.caregiverName);

    return Boolean(
      currentName &&
      requesterName &&
      (currentName === requesterName ||
        currentName.includes(requesterName) ||
        requesterName.includes(currentName))
    );
  }

  function getVisibleSupportRequests() {
    return supportRequests.filter((request) => !isOwnRequest(request));
  }

  function getVisibleImmediateAssistancePatients() {
    return patients.filter((patient) =>
      !patient.hasAssignedCaretaker &&
      patient.needsCareSoon &&
      !isOwnRequest(patient)
    );
  }

  function getCommunityAlerts() {
    if (!accessibilitySettings.notifications) {
      return [];
    }

    const patientHelpAlerts = getVisibleImmediateAssistancePatients().map((patient) => ({
      type: 'patient_help',
      id: `patient_${patient.id}`,
      patient
    }));

    const lostPatientAlerts = lostAlerts.map((alert) => ({
      type: 'lost_patient',
      id: `lost_${alert.id}`,
      alert,
      title: t('lostPatientNearby'),
      message: t('patientPressedLostButton')
    }));

    const openAssignmentCount = availableAssignments.filter((assignment) => assignment.status === 'open').length;
    const assignmentDropAlert = openAssignmentCount > 0 ? [{
      type: 'assignment_drop',
      id: 'assignment_drop',
      count: openAssignmentCount,
      message: t('assignmentDropMessage', { count: openAssignmentCount })
    }] : [];

    const incentiveMessages = [
      t('volunteerStreak'),
      t('volunteerIncentive2'),
      t('volunteerIncentive3'),
      t('volunteerIncentive4'),
      t('volunteerIncentive5')
    ];
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % incentiveMessages.length;
    const incentiveAlerts = [{
      type: 'incentive',
      id: 'daily_incentive',
      title: t('dailyCommunityBoost'),
      message: incentiveMessages[dayIndex]
    }];

    return [...lostPatientAlerts, ...patientHelpAlerts, ...assignmentDropAlert, ...incentiveAlerts];
  }

  function isNoteAccessible(note) {
    const now = new Date();
    const assignmentStart = new Date(note.assignmentStart);
    const assignmentEnd = new Date(note.assignmentEnd);

    // Check if current time is within 60 minutes before or after the assignment
    const sixtyMinBefore = new Date(assignmentStart.getTime() - 60 * 60 * 1000);
    const sixtyMinAfter = new Date(assignmentEnd.getTime() + 60 * 60 * 1000);

    const hasHandledAssignment = availableAssignments.some((assignment) =>
      assignment.status === 'accepted' &&
      assignment.id === note.assignmentId &&
      assignment.patientId === note.patientId &&
      isWithinAssignmentAccessWindow(assignment)
    );

    return hasHandledAssignment && now >= sixtyMinBefore && now <= sixtyMinAfter;
  }

  function getAccessibleNotes() {
    return communityNotes.filter(note => isNoteAccessible(note));
  }

  function handleAddNote() {
    if (!selectedPatientId) {
      alert(t('alertSelectPatientFirst'));
      return;
    }
    if (!newNoteTitle.trim() || !newNoteSummary.trim()) {
      alert(t('alertNeedTitleAndNote'));
      return;
    }

    const now = new Date();
    const activeAssignment = availableAssignments.find((assignment) =>
      assignment.status === 'accepted' &&
      assignment.patientId === selectedPatientId &&
      isWithinAssignmentAccessWindow(assignment)
    );

    if (!activeAssignment) {
      alert(t('alertNotesOnlyWhileHandling'));
      return;
    }

    const note = {
      id: `n${Date.now()}`,
      patientId: selectedPatientId,
      title: newNoteTitle.trim(),
      summary: newNoteSummary.trim(),
      time: 'Just now',
      assignmentId: activeAssignment.id,
      createdAt: now,
      assignmentStart: now,
      assignmentEnd: now
    };

    setCommunityNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteSummary('');
  }

  function handleEditNote(note) {
    if (!isNoteAccessible(note)) {
      alert(t('alertNoteLocked'));
      return;
    }
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setEditingSummary(note.summary);
  }

  function handleSaveNote() {
    if (!editingTitle.trim() || !editingSummary.trim()) {
      alert(t('alertNeedTitleAndContent'));
      return;
    }

    setCommunityNotes((prev) =>
      prev.map((note) =>
        note.id === editingNoteId
          ? { ...note, title: editingTitle.trim(), summary: editingSummary.trim(), time: 'Updated now' }
          : note
      )
    );
    setEditingNoteId(null);
    setEditingTitle('');
    setEditingSummary('');
  }

  function handleCancelNoteEdit() {
    setEditingNoteId(null);
    setEditingTitle('');
    setEditingSummary('');
  }

  async function handleDictateNoteField(field) {
    if (!accessibilitySettings.speechToText) {
      alert(t('alertSpeechToTextOff'));
      return;
    }

    setRecordingNoteField(field);
    try {
      alert(t('alertVoiceRecordingStartedShort'));
      const transcript = await recordSpeechToText(language, accessToken);
      if (!transcript) {
        alert(t('alertTranscribeFailed'));
        return;
      }

      if (field === 'title') setNewNoteTitle((current) => current ? `${current} ${transcript}` : transcript);
      if (field === 'summary') setNewNoteSummary((current) => current ? `${current} ${transcript}` : transcript);
      if (field === 'editTitle') setEditingTitle((current) => current ? `${current} ${transcript}` : transcript);
      if (field === 'editSummary') setEditingSummary((current) => current ? `${current} ${transcript}` : transcript);
    } catch (error) {
      console.log('Note dictation error:', error);
      alert(t('alertMicrophoneUnavailable'));
    } finally {
      setRecordingNoteField(null);
    }
  }

  function navigateMonth(direction) {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  }

  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function getAssignmentsForDate(date) {
    return availableAssignments.filter(assignment =>
      assignment.date.toDateString() === date.toDateString()
    );
  }

  async function handleTakeAssignment(assignmentId) {
    const assignment = availableAssignments.find((item) => item.id === assignmentId);
    if (assignment?.source === 'backend') {
      try {
        const response = await fetch(
          `${supabaseFunctionsApiBase}/community-support/${assignmentId}/accept`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        if (!response.ok) throw new Error('Failed to accept assignment');
      } catch (error) {
        console.log('Error accepting community support assignment:', error);
      }
    }

    setAvailableAssignments((prevAssignments) =>
      prevAssignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, status: 'accepted' } : assignment
      )
    );
    alert(t('alertAssignmentScheduled'));
  }

  function handleEditDayTime(dayIndex) {
    const day = weeklyAvailability[dayIndex];
    setEditingDayIndex(dayIndex);
    setEditingStartTime(day.startTime);
    setEditingEndTime(day.endTime);
  }

  function handleSaveDayTime() {
    if (editingDayIndex === null) return;

    const newAvailability = [...weeklyAvailability];
    newAvailability[editingDayIndex].startTime = editingStartTime;
    newAvailability[editingDayIndex].endTime = editingEndTime;
    newAvailability[editingDayIndex].available = true; // Make sure it's available if they set times
    setWeeklyAvailability(newAvailability);
    setEditingDayIndex(null);
    setEditingStartTime('');
    setEditingEndTime('');
  }

  function handleCancelDayEdit() {
    setEditingDayIndex(null);
    setEditingStartTime('');
    setEditingEndTime('');
  }

  function toggleDayAvailability(dayIndex) {
    const newAvailability = [...weeklyAvailability];
    newAvailability[dayIndex].available = !newAvailability[dayIndex].available;
    if (!newAvailability[dayIndex].available) {
      newAvailability[dayIndex].startTime = '';
      newAvailability[dayIndex].endTime = '';
    } else {
      newAvailability[dayIndex].startTime = '08:00';
      newAvailability[dayIndex].endTime = '17:00';
    }
    setWeeklyAvailability(newAvailability);
  }

  function openChatbot() {
    alert(t('alertChatbotInfo'));
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
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4">
          <div className="mb-6">
            <p className="text-sm text-gray-500">{t('welcome')} {greetingName}, {t('welcomeBack')}</p>
          </div>

          {activeView === 'home' && (
            <>
              <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{t('mySchedule')}</h3>
                    <p className="text-sm text-gray-600">{currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-600 mb-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <div key={day} className="py-2">
                      {new Date(2026, 0, 4 + day).toLocaleDateString(locale, { weekday: 'short' })}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <div key={index} className="min-h-[60px] rounded-xl"></div>;
                    }

                    const assignments = getAssignmentsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(date)}
                        className={`min-h-[60px] rounded-xl border p-1 text-left transition ${
                          isToday ? 'border-blue-500 bg-blue-50' :
                          isSelected ? 'border-purple-500 bg-purple-50' :
                          assignments.length > 0 ? 'border-green-300 bg-green-50' :
                          'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-800 mb-1">{date.getDate()}</div>
                        {assignments.length > 0 && (
                          <div className="space-y-1">
                            {assignments.slice(0, 2).map((assignment, idx) => (
                              <div key={idx} className="text-[10px] bg-green-600 text-white rounded px-1 py-0.5 truncate">
                                {assignment.startTime}
                              </div>
                            ))}
                            {assignments.length > 2 && (
                              <div className="text-[10px] text-green-700 font-semibold">
                                +{assignments.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected date assignments */}
                {selectedDate && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3">
                      {t('scheduledSupport')} - {selectedDate.toLocaleDateString()}
                    </h4>
                    {getAssignmentsForDate(selectedDate).length === 0 ? (
                      <p className="text-sm text-gray-600">{t('noCommunitySupport')}</p>
                    ) : (
                      <div className="space-y-2">
                        {getAssignmentsForDate(selectedDate).map((assignment) => (
                          <div key={assignment.id} className="bg-gray-50 rounded-xl p-3 border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-800">{assignment.patientName}</span>
                              <span className="text-xs text-gray-600">{assignment.startTime} - {assignment.endTime}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{dt(assignment.task)}</p>
                            <p className="text-xs text-gray-600 mb-3">📍 {dt(assignment.location)}</p>
                            {assignment.status === 'open' ? (
                              <button
                                onClick={() => handleTakeAssignment(assignment.id)}
                                className="w-full bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 transition"
                              >
                                {t('add')}
                              </button>
                            ) : (
                              <div className="rounded-xl bg-green-50 px-3 py-2 text-center text-sm font-semibold text-green-700">
                                {t('addedToSchedule')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{t('myAvailability')}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-600 mb-3">
                  {weeklyAvailability.map((day, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <button
                        onClick={() => toggleDayAvailability(index)}
                        className={`rounded-2xl p-2 border transition w-full ${
                          day.available ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
                        }`}
                      >
                        <div>{new Date(2026, 0, 5 + index).toLocaleDateString(locale, { weekday: 'short' })}</div>
                        <div className="text-[10px] mt-1">{day.available ? `${day.startTime} - ${day.endTime}` : t('off')}</div>
                      </button>
                      {day.available && (
                        <button
                          onClick={() => handleEditDayTime(index)}
                          className="text-[8px] text-blue-600 hover:text-blue-800 mt-1"
                        >
                          {t('edit')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {editingDayIndex !== null && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                      {t('edit')} {new Date(2026, 0, 5 + editingDayIndex).toLocaleDateString(locale, { weekday: 'short' })} {t('myAvailability')}
                    </h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">{t('from')}:</label>
                        <input
                          type="time"
                          value={editingStartTime}
                          onChange={(e) => setEditingStartTime(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">{t('to')}:</label>
                        <input
                          type="time"
                          value={editingEndTime}
                          onChange={(e) => setEditingEndTime(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDayTime}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                      >
                        {t('save')}
                      </button>
                      <button
                        onClick={handleCancelDayEdit}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-semibold hover:bg-gray-700 transition"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-3xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="w-6 h-6 text-orange-600" />
                  <h3 className="text-lg font-bold text-gray-800">{t('immediateAssistance')}</h3>
                </div>
                <p className="text-sm text-gray-600">{t('patientsNeedCare')}</p>
                {getVisibleImmediateAssistancePatients().length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {getVisibleImmediateAssistancePatients().map(patient => (
                      <div key={patient.id} className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-orange-900">{patient.name}</p>
                          <span className="shrink-0 text-xs text-orange-800">{dt(patient.distance)}</span>
                        </div>
                        <p className="text-orange-700 text-xs mt-2">📋 {dt(patient.helpNeeded)}</p>
                        <p className="text-orange-700 text-xs mt-1">🕐 {dt(patient.timeNeeded)}</p>
                        <button
                          onClick={() => handleOfferHelp(patient.id)}
                          className="mt-3 w-full bg-orange-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-orange-700 transition"
                        >
                          {t('immediateAssignmentsToHelpNow')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 border border-gray-200 p-4 text-sm text-gray-600">
                    {t('noImmediateNeeds')}
                  </div>
                )}
              </div>
            </>
          )}

          {activeView === 'resources' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-7 h-7 text-blue-700" />
                    <h3 className="text-lg font-bold text-gray-800">{t('resourcesSupport')}</h3>
                  </div>
                  <p className="text-gray-600 mb-3">{t('resourceQuickLinks')}</p>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li><a href="https://www.caring.sg/" target="_blank" rel="noreferrer" className="underline">{dt('Caring SG')}</a></li>
                    <li><a href="https://www.aic.sg/Caregiving-Support/Connecting-with-other-caregivers" target="_blank" rel="noreferrer" className="underline">{dt('AIC Caregiving Support')}</a></li>
                    <li><a href="https://www.aic.sg/" target="_blank" rel="noreferrer" className="underline">{dt('AIC Help for Caregivers')}</a></li>
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
                    <MessageCircle className="w-7 h-7 text-blue-700" />
                    <h3 className="text-lg font-bold text-gray-800">{dt('SEA Lion Chatbot')}</h3>
                  </div>
                  <p className="text-gray-600 mb-3">{t('chatbotDescription')}</p>
                  <button
                    onClick={openChatbot}
                    className="w-full bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-800 transition"
                  >
                    {t('openChatbot')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{t('communityNotes')}</h3>
                  <select
                    value={selectedPatientId || ''}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">{t('selectPatient')}</option>
                    {getHandledPatients().map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>

                {getHandledPatients().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">{t('noActiveNotes')}</p>
                    <p className="text-xs mt-1">{t('notesWindow')}</p>
                  </div>
                ) : selectedPatientId && (
                  <div className="mb-4 rounded-2xl bg-purple-50 border border-purple-200 p-4 text-sm text-purple-900">
                    {t('communityNotesReadOnly')}
                  </div>
                )}

                {getHandledPatients().length > 0 && selectedPatientId ? (
                  getAccessibleNotes().filter(note => note.patientId === selectedPatientId).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">{t('noAccessibleNotes')}</p>
                      <p className="text-xs mt-1">{t('notesWindow')}</p>
                    </div>
                  ) : (
                    getAccessibleNotes().filter(note => note.patientId === selectedPatientId).map((note) => (
                      <div key={note.id} className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h3 className="text-lg font-bold text-gray-800">{dt(note.title)}</h3>
                          <span className="text-xs text-gray-500">{dt(note.time)}</span>
                        </div>
                        <p className="text-gray-700 mb-4">{dt(note.summary)}</p>
                      </div>
                    ))
                  )
                ) : getHandledPatients().length > 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">{t('selectPatient')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-bold text-gray-800">{t('alerts')}</h3>
              </div>
              <p className="text-sm text-gray-600">{t('alertsDescription')}</p>
              {!accessibilitySettings.notifications ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-gray-200 p-4 text-sm text-gray-600">
                  {dt('Notifications are turned off in Settings.')}
                </div>
              ) : getCommunityAlerts().length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-gray-200 p-4 text-sm text-gray-600">
                  {t('noNearbyRequests')}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {getCommunityAlerts().map((alertItem) => {
                    if (alertItem.type === 'patient_help') {
                      const { patient } = alertItem;

                      return (
                        <div key={alertItem.id} className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-orange-900">{patient.name}</p>
                            <span className="shrink-0 text-xs text-orange-800">{dt(patient.distance)}</span>
                          </div>
                          <p className="text-orange-700 text-xs mt-2">📋 {dt(patient.helpNeeded)}</p>
                          <p className="text-orange-700 text-xs mt-1">🕐 {dt(patient.timeNeeded)}</p>
                          <button
                            onClick={() => handleOfferHelp(patient.id)}
                            className="mt-3 w-full bg-orange-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-orange-700 transition"
                          >
                            {t('immediateAssignmentsToHelpNow')}
                          </button>
                        </div>
                      );
                    }

                    if (alertItem.type === 'assignment_drop') {
                      return (
                        <div key={alertItem.id} className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                          <p className="font-semibold text-blue-900">{t('assignmentDrop')}</p>
                              <p className="text-blue-700 text-xs mt-1">{alertItem.message}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveView('home');
                              setSelectedDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
                            }}
                            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                          >
                            {t('mySchedule')}
                          </button>
                        </div>
                      );
                    }

                    if (alertItem.type === 'lost_patient') {
                      const { alert } = alertItem;

                      return (
                        <div key={alertItem.id} className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-red-900">{t('lostPatientNearby')}</p>
                              <p className="text-red-700 text-xs mt-1">{alert.patientName}</p>
                              <p className="text-red-700 text-xs mt-1">{dt(alert.address)}</p>
                              {alert.distanceLabel && (
                                <p className="text-red-700 text-xs mt-1">{dt(alert.distanceLabel)}</p>
                              )}
                            </div>
                            <MapPin className="w-5 h-5 text-red-600 shrink-0" />
                          </div>
                          <button
                            onClick={() => openLostAlertMap(alert)}
                            className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                          >
                            {t('checkLocation')}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={alertItem.id} className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900">{dt(alertItem.title)}</p>
                            <p className="text-green-700 text-xs mt-1">{dt(alertItem.message)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'home' ? 'text-blue-700' : 'text-gray-600'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('home')}</span>
        </button>
        <button
          onClick={() => setActiveView('resources')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'resources' ? 'text-blue-700' : 'text-gray-600'
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('resources')}</span>
        </button>
        <button
          onClick={() => setActiveView('notes')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'notes' ? 'text-blue-700' : 'text-gray-600'
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('communityNotes')}</span>
        </button>
        <button
          onClick={() => setActiveView('notifications')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'notifications' ? 'text-blue-700' : 'text-gray-600'
          }`}
        >
          <Bell className="w-6 h-6" />
          <span className="text-xs font-semibold">{t('alerts')}</span>
        </button>
      </div>
    </div>
  );
}
