import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CheckCircle, Clock, RefreshCw, Plus, Bell, Users, Activity, MessageSquare, MapPin, Home, HelpCircle, LayoutGrid, Video, Image as ImageIcon, Calendar, Mic, Volume2, Phone, Mail, MessageCircle, FileText, ClipboardList, Heart, X } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';
import { TaskManager } from './TaskManager';
import { CommunitySupportScheduler } from './CommunitySupportScheduler';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';

export function PrimaryCaregiverView({ user, profile, accessToken }) {
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showMyTaskManager, setShowMyTaskManager] = useState(false);
  const [showCommunitySupportScheduler, setShowCommunitySupportScheduler] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [communitySupport, setCommunitySupport] = useState([]);
  const [immediateHelpRequest, setImmediateHelpRequest] = useState(null);
  const [searchingForCaregiver, setSearchingForCaregiver] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [patientLocation, setPatientLocation] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'Patient is out of the house!', location: 'Tampines Mall', coordinates: { lat: 1.3521, lng: 103.9448 }, time: '2 mins ago' },
    { id: 2, type: 'task', message: 'Medication reminder overdue', time: '15 mins ago' }
  ]);
  const [activeView, setActiveView] = useState('home');
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = (key) => getTranslation(language, key);

  useEffect(() => {
    if (user?.id && accessToken) {
      loadLinkedPatient();
      loadCommunitySupport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLinkedPatient() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/caregiver/${user.id}/patient`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.patientId) {
          setPatientId(data.patientId);
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
          `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/patient/${patientId}/tasks`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/patient/${patientId}/voice-notes`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/patient/${patientId}/vitals`,
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
    // Load scheduled community support sessions (for planning ahead)
    setCommunitySupport([
      { id: 1, caregiverName: 'Sarah Tan', date: '2026-05-10', time: '14:00', duration: '2 hours', status: 'accepted', tasks: 'Accompany to doctor appointment' },
      { id: 2, caregiverName: null, date: '2026-05-12', time: '10:00', duration: '3 hours', status: 'pending', tasks: 'Help with grocery shopping' }
    ]);
  }

  async function handleRefresh() {
    if (patientId) {
      await loadPatientData(patientId);
    }
    await loadCommunitySupport();
  }

  function handleVoiceNote() {
    setIsRecordingNote(!isRecordingNote);
    if (!isRecordingNote) {
      alert('🎤 Voice note recording started. In production, this would use SEA Lion LLM for speech-to-text across Singapore dialects.');
      setTimeout(() => {
        setIsRecordingNote(false);
        alert('Voice note saved and shared with caregivers!');
      }, 3000);
    }
  }

  function handleTextToSpeech(text) {
    alert(`🔊 Reading aloud: "${text}"\n\nIn production, this would use SEA Lion LLM TTS to speak in the user's preferred Singapore dialect (English, Mandarin, Hokkien, Cantonese, Malay, Tamil).`);
    // In production: SEA Lion LLM TTS API call
  }

  function handleDismissNotification(notificationId) {
    setNotifications(notifications.filter(n => n.id !== notificationId));
  }

  function handleReadWholePage() {
    let pageContent = `Welcome to KampongSG. Hi ${profile.name}, welcome back. `;
    
    if (activeView === 'home') {
      if (myTasks.length > 0) {
        pageContent += `My Tasks: `;
        myTasks.forEach(task => {
          pageContent += `${task.title} at ${task.time || 'no time set'}. `;
        });
      }
      
      if (tasks.length > 0) {
        pageContent += `Patient's Tasks: `;
        tasks.forEach(task => {
          pageContent += `${task.title} at ${task.time || 'no time set'}. `;
        });
      }
      
      if (communitySupport.length > 0) {
        pageContent += `Scheduled Community Support: `;
        communitySupport.forEach(session => {
          pageContent += `${session.caregiverName} on ${session.date} at ${session.time} for ${session.duration}. Status: ${session.status}. `;
        });
      }
    } else if (activeView === 'notifications') {
      pageContent += `Notifications: `;
      notifications.forEach(notif => {
        pageContent += `${notif.message}. ${notif.time}. `;
      });
    }
    
    alert(`🔊 Reading entire page:\n\n"${pageContent}"\n\nIn production, this would use SEA Lion LLM TTS to speak the entire page content in the user's preferred Singapore dialect.`);
  }

  function handleRequestImmediateHelp() {
    setSearchingForCaregiver(true);
    setImmediateHelpRequest({
      id: Date.now(),
      requestedAt: new Date().toISOString(),
      location: 'Tampines Street 81, Block 123',
      status: 'searching'
    });

    // Simulate searching for caregivers
    setTimeout(() => {
      setImmediateHelpRequest(prev => ({
        ...prev,
        status: 'found',
        caregiverName: 'Maria Wong',
        caregiverDistance: '1.2 km away',
        estimatedArrival: '8 mins'
      }));
      setSearchingForCaregiver(false);
    }, 3000);
  }

  function handleCancelRequest() {
    setImmediateHelpRequest(null);
    setSearchingForCaregiver(false);
  }

  function handleCheckLocation(notification) {
    setPatientLocation({
      name: notification.location,
      coordinates: notification.coordinates,
      timestamp: notification.time
    });
    setShowLocationMap(true);
  }

  function handleCloseLocationMap() {
    setShowLocationMap(false);
    setPatientLocation(null);
  }

  return (
    <div className="size-full bg-white flex flex-col">
      {/* Top Bar */}
      <div className="text-white px-4 py-3 flex items-center justify-between shadow-md" style={{ background: '#4A9EFF' }}>
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-xl font-bold">KampongSG</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReadWholePage}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Read Whole Page"
          >
            <Volume2 className="w-6 h-6" />
          </button>
          <button
            onClick={handleVoiceNote}
            className={`relative p-2 rounded-full transition-colors ${
              isRecordingNote ? 'bg-red-500 animate-pulse' : 'hover:bg-white/20'
            }`}
            title="Voice Note"
          >
            <Mic className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveView('notifications')}
            className="relative p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
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
                <Users className="w-12 h-12 text-purple-600" />
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
                <span className="text-sm font-semibold text-gray-800 text-center">{t('patientNotes')}</span>
              </button>
            </div>

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
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowMyTaskManager(true)}
                    className="p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D0EBFF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Add Task"
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
                        onClick={() => handleTextToSpeech(`${task.title}. Time: ${task.time || 'No time set'}`)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        title="Read aloud"
                      >
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-semibold text-gray-800">{task.title}</span>
                          <div className="flex gap-1">
                            {task.videoUrl && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <Video className="w-3 h-3" /> Video
                              </span>
                            )}
                            {task.imageUrl && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Image
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
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowTaskManager(true)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Add Task"
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
                        onClick={() => handleTextToSpeech(`${task.title}. Time: ${task.time || 'No time set'}`)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        title="Read aloud"
                      >
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-semibold text-gray-800">{task.title}</span>
                          <div className="flex gap-1">
                            {task.videoUrl && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <Video className="w-3 h-3" /> Video
                              </span>
                            )}
                            {task.imageUrl && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Image
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
                  <Calendar className="w-5 h-5 text-purple-600" />
                  {t('scheduledSupport')}
                </h3>
                <button
                  onClick={() => setShowCommunitySupportScheduler(true)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Schedule Support"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {communitySupport.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">{t('noCommunitySupport')}</p>
                  <button
                    onClick={() => setShowCommunitySupportScheduler(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
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
                            {session.status === 'accepted' ? (
                              <>
                                <Users className="w-5 h-5 text-purple-600" />
                                <span className="text-base font-semibold text-gray-800">{session.caregiverName}</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                                  Accepted
                                </span>
                              </>
                            ) : (
                              <>
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className="text-base font-semibold text-gray-600">{t('waitingCaregiver')}</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                                  Pending
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-8 mb-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.date} at {session.time}
                            </span>
                            <span>Duration: {session.duration}</span>
                          </div>
                          {session.tasks && (
                            <p className="text-sm text-gray-600 ml-8">📋 {session.tasks}</p>
                          )}
                        </div>
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
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noNotifications')}</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-red-50 border-2 border-red-300 rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleTextToSpeech(notification.message)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                        title="Read aloud"
                      >
                        <Volume2 className="w-5 h-5 text-red-600" />
                      </button>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 text-lg mb-2">{notification.message}</p>
                        {notification.location && (
                          <button
                            onClick={() => handleCheckLocation(notification)}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {t('checkLocation')}
                          </button>
                        )}
                        <p className="text-xs text-gray-600 mt-2">{notification.time}</p>
                      </div>
                      <button
                        onClick={() => handleDismissNotification(notification.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
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
                <p className="text-gray-600 mb-6">Request immediate help from nearby community caregivers</p>
                
                {/* Grab-style Map Placeholder */}
                <div className="bg-gray-100 rounded-2xl overflow-hidden mb-6 relative" style={{ height: '400px' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Map shows your location<br/>and nearby caregivers</p>
                    </div>
                  </div>
                  {/* Simulated map pin for current location */}
                  <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <MapPin className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                {/* Request Button */}
                <button
                  onClick={handleRequestImmediateHelp}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-5 rounded-3xl font-bold text-xl hover:from-purple-700 hover:to-purple-800 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                  <Users className="w-8 h-8" />
                  {t('requestHelpNow')}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  For planned support beyond the next 6-12 hours, use "Scheduled Community Support" on the home screen
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Map View with Request */}
                <div className="flex-1 bg-gray-100 relative">
                  {/* Map Placeholder */}
                  <div className="absolute inset-0">
                    <div className="size-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                      <MapPin className="w-24 h-24 text-gray-300" />
                    </div>
                  </div>

                  {/* Current Location Pin */}
                  <div className="absolute" style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <MapPin className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1 rounded-full shadow-md text-sm font-semibold">
                      {immediateHelpRequest.location}
                    </div>
                  </div>

                  {/* Caregiver Pin (when found) */}
                  {immediateHelpRequest.status === 'found' && (
                    <div className="absolute" style={{ top: '30%', left: '60%', transform: 'translate(-50%, -50%)' }}>
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Back Button */}
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
                      <p className="text-gray-600 mb-6">Please wait while we match you with an available community caregiver</p>
                      <button
                        onClick={handleCancelRequest}
                        className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
                      >
                        {t('cancelRequest')}
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
                          <p className="text-green-600 font-semibold">{immediateHelpRequest.caregiverDistance} • {immediateHelpRequest.estimatedArrival}</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-800">{immediateHelpRequest.estimatedArrival?.split(' ')[0]}</div>
                          <div className="text-xs text-gray-500">mins</div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-700">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <span className="text-sm">Pickup: {immediateHelpRequest.location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span className="text-sm">Requested: {new Date(immediateHelpRequest.requestedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('patientNotes')}</h2>
            {voiceNotes.length === 0 ? (
              <div className="border-2 rounded-2xl p-8 text-center" style={{ backgroundColor: '#E1F0FF', borderColor: '#4A9EFF' }}>
                <MessageSquare className="w-16 h-16 mx-auto mb-4" style={{ color: '#4A9EFF' }} />
                <p className="text-gray-700">{t('noNotes')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {voiceNotes.map((note) => (
                  <div key={note.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <p className="text-gray-800">{note.summary || note.transcription}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('resourcesSupport')}</h2>
            
            {/* Resource Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Contact Us */}
              <button
                onClick={() => alert('📞 Contact Us\n\nPhone: 1800-KAMPONG\nEmail: support@kampongsg.com\n\nOur team is available 24/7 to assist you!')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-blue-400 hover:shadow-lg transition-all active:scale-95"
              >
                <Phone className="w-16 h-16 text-blue-600" />
                <span className="text-base font-semibold text-gray-800 text-center">{t('contactUs')}</span>
              </button>

              {/* Support */}
              <button
                onClick={() => alert('🔗 Support Resources\n\nCaregiving support groups\nhttps://www.caring.sg/\nhttps://www.aic.sg/Caregiving-Support/Connecting-with-other-caregivers\n\nHelpline (RED)\n\nClub Heal - 6899 3463\nMindful community - 6460 4400')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-purple-400 hover:shadow-lg transition-all active:scale-95"
              >
                <Heart className="w-16 h-16 text-purple-600" />
                <span className="text-base font-semibold text-gray-800 text-center">{t('support')}</span>
              </button>

              {/* Survey */}
              <button
                onClick={() => navigate('/assessment')}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:shadow-lg transition-all active:scale-95"
                style={{ borderColor: '#4A9EFF' }}
              >
                <ClipboardList className="w-16 h-16" style={{ color: '#4A9EFF' }} />
                <span className="text-base font-semibold text-gray-800 text-center">{t('survey')}</span>
              </button>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('help')}</h2>

            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Volume2 className="w-8 h-8 flex-shrink-0" style={{ color: '#4A9EFF' }} />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Listen to Any Text</h3>
                    <p className="text-gray-700 text-sm mb-2">Tap the <Volume2 className="w-4 h-4 inline" /> speaker icon next to any task or notification to hear it read aloud in your preferred language.</p>
                    <p className="text-gray-600 text-xs">Supports: English, Mandarin, Hokkien, Cantonese, Malay, Tamil</p>
                  </div>
                </div>
              </div>

              {/* Voice Notes */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Mic className="w-8 h-8 flex-shrink-0 text-red-500" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Record Voice Notes</h3>
                    <p className="text-gray-700 text-sm">Tap the <Mic className="w-4 h-4 inline" /> microphone icon at the top to record voice messages for your patient or other caregivers.</p>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-8 h-8 flex-shrink-0 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Tasks</h3>
                    <p className="text-gray-700 text-sm mb-2">Create tasks for your patient or yourself. Tasks can include:</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>• Video instructions</li>
                      <li>• Image guides</li>
                      <li>• Scheduled reminders</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Community Support - Immediate */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-8 h-8 flex-shrink-0 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('requestHelpNow')}</h3>
                    <p className="text-gray-700 text-sm mb-2">Tap "Community Support" for urgent help within 6-12 hours:</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>• See nearby caregivers on map</li>
                      <li>• Request help with one tap</li>
                      <li>• Track caregiver arrival time</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Scheduled Support */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-8 h-8 flex-shrink-0 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('scheduledSupport')}</h3>
                    <p className="text-gray-700 text-sm">For planned help beyond 12 hours, use "Scheduled Community Support" on the home screen to book caregivers in advance.</p>
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Activity className="w-8 h-8 flex-shrink-0 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('vitals')}</h3>
                    <p className="text-gray-700 text-sm">Monitor blood pressure, heart rate, and other health metrics. Data is shared with medical professionals.</p>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-8 h-8 flex-shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('notifications')}</h3>
                    <p className="text-gray-700 text-sm">Receive alerts when your patient leaves home, misses medication, or needs assistance. Tap <X className="w-4 h-4 inline" /> to dismiss notifications.</p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Settings className="w-8 h-8 flex-shrink-0 text-gray-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{t('settings')}</h3>
                    <p className="text-gray-700 text-sm mb-2">Tap <Settings className="w-4 h-4 inline" /> in the top right to:</p>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>• Change language preference</li>
                      <li>• Adjust font size</li>
                      <li>• Enable text-to-speech</li>
                      <li>• Manage emergency contacts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Need More Help */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-gray-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-3">{t('needMoreHelp')}</h3>
              <p className="text-gray-700 text-sm mb-4">Our support team is here 24/7</p>
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
          <div className="flex-1 relative bg-gradient-to-br from-blue-100 to-purple-100">
            {/* Map Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-32 h-32 text-gray-300" />
            </div>

            {/* Patient Location Pin */}
            <div className="absolute" style={{ top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <MapPin className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-4 py-2 rounded-xl shadow-lg">
                <p className="text-sm font-bold text-gray-800">{patientLocation.name}</p>
              </div>
            </div>

            {/* Your Location Pin (Home) */}
            <div className="absolute" style={{ top: '65%', left: '30%', transform: 'translate(-50%, -50%)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#4A9EFF' }}>
                <Home className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1 rounded-full shadow-md text-xs font-semibold">
                {t('home')}
              </div>
            </div>

            {/* Distance Line */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              <line
                x1="30%"
                y1="65%"
                x2="50%"
                y2="45%"
                stroke="#4A9EFF"
                strokeWidth="3"
                strokeDasharray="10,5"
                opacity="0.6"
              />
            </svg>

            {/* Close Button */}
            <button
              onClick={handleCloseLocationMap}
              className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
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
                <h3 className="text-xl font-bold text-gray-800 mb-1">Patient Location</h3>
                <p className="text-gray-700 font-semibold text-lg mb-2">{patientLocation.name}</p>
                <p className="text-sm text-gray-500">{patientLocation.timestamp}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => alert('📞 Calling patient...')}
                className="py-4 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 text-white"
                style={{ backgroundColor: '#4A9EFF' }}
              >
                <Phone className="w-5 h-5" />
                {t('callPatient')}
              </button>
              <button
                onClick={() => alert('🚗 Opening navigation to ' + patientLocation.name)}
                className="bg-purple-600 text-white py-4 rounded-2xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
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
