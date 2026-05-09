import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mic, AlertCircle, Settings, CheckCircle, Video, Home, LayoutGrid } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';
import { recordSpeechToText } from '../utils/voice';

export function PatientView({ user, profile, accessToken }) {
  const [tasks, setTasks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const [isHome, setIsHome] = useState(true);
  const navigate = useNavigate();
  const { language, accessibilitySettings } = useContext(LanguageContext);
  const t = (key) => getTranslation(language, key);

  useEffect(() => {
    if (user?.id && accessToken) {
      loadTasks();
      startLocationTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTasks() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/patient/${user.id}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.log('Error loading tasks:', error);
    }
  }

  async function completeTask(taskId) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        loadTasks();
      }
    } catch (error) {
      console.log('Error completing task:', error);
    }
  }

  function startLocationTracking() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          setLocation(newLocation);

          try {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/location`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(newLocation)
              }
            );
          } catch (error) {
            console.log('Error updating location:', error);
          }
        },
        (error) => {
          console.log('Location error:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }

  async function handleVoiceNote() {
    if (!accessibilitySettings.speechToText) {
      alert('Speech-to-text is turned off in Settings.');
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      try {
        console.log('Starting voice recording...');
        alert('Voice recording started!');
        const transcript = await recordSpeechToText(language, accessToken);
        if (!transcript) {
          alert('I could not transcribe that recording. Please try again.');
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/voice-notes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              patientId: user.id,
              transcription: transcript,
              summary: transcript
            })
          }
        );

        if (response.ok) {
          alert('Voice note saved and sent to caregivers.');
        }
      } catch (error) {
        console.log('Voice note error:', error);
        alert('Microphone or speech-to-text is not available.');
      } finally {
        setIsRecording(false);
      }
    } else {
      console.log('Stopping voice recording...');
      setIsRecording(false);
    }
  }

  async function handleHelpButton() {
    const emergencyLine = accessibilitySettings.emergencyPhone
      ? `\n\nEmergency contact: ${accessibilitySettings.emergencyContact || 'Saved contact'} (${accessibilitySettings.emergencyPhone})`
      : '';
    alert(`Help request sent to all caregivers!\n\nYour location has been shared and the nearest caregiver will be notified to assist you.${emergencyLine}`);
    console.log('Sending help notification to caregivers');
  }

  const todayTasks = tasks.filter(task => !task.completedAt);
  const completedTasks = tasks.filter(task => task.completedAt);

  return (
    <div className="size-full bg-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-xl font-bold">KampongSG</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="p-4">
          {/* Welcome Message */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800">{t('welcome')} {profile.name}!</h2>
            <p className="text-lg text-gray-600 mt-2 flex items-center gap-2">
              {isHome ? (
                <>
                  <Home className="w-5 h-5 text-green-600" />
                  <span>{t('youAreHome')}</span>
                </>
              ) : (
                'Stay safe'
              )}
            </p>
          </div>

          {/* Today's Tasks */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('todaysTasks')}</h3>

            {todayTasks.length === 0 ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-gray-800">{t('allTasksCompleted')}</p>
                <p className="text-gray-600 mt-1">{t('greatJobToday')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border-2 border-gray-200 rounded-3xl p-5 shadow-sm flex items-center gap-4"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      className="flex-shrink-0 w-16 h-16 border-4 border-blue-600 rounded-full hover:bg-blue-50 transition-colors active:scale-95"
                      title="Mark as done"
                    />

                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800">{task.title}</h4>
                      {task.time && (
                        <p className="text-base text-gray-600 flex items-center gap-2 mt-2">
                          <Bell className="w-5 h-5" />
                          {task.time}
                        </p>
                      )}
                    </div>

                    {task.videoUrl && (
                      <a
                        href={task.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-4 bg-blue-100 rounded-2xl hover:bg-blue-200 transition-colors active:scale-95"
                      >
                        <Video className="w-8 h-8 text-blue-600" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{t('completed')}</h3>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 opacity-70"
                  >
                    <CheckCircle className="w-7 h-7 text-green-600" />
                    <span className="text-lg text-gray-700 line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
          <button
            onClick={handleVoiceNote}
            disabled={!accessibilitySettings.speechToText}
            className={`py-5 rounded-2xl font-bold text-white text-lg shadow-md transition-all flex items-center justify-center gap-3 active:scale-95 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Mic className="w-7 h-7" />
            {isRecording ? t('stopRecording') : t('shareNote')}
          </button>

          <button
            onClick={handleHelpButton}
            className="bg-red-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-red-700 shadow-md transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <AlertCircle className="w-7 h-7" />
            {t('needHelp')}
          </button>
        </div>
      </div>
    </div>
  );
}
