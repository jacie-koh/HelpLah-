import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, Settings, CheckCircle, Video, Home, LayoutGrid, MapPin, Navigation } from 'lucide-react';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';
import { useDynamicTranslations } from '../utils/dynamicTranslations';
import { notifyInBrowser } from '../utils/notifications';

export function PatientView({ user, profile, accessToken }) {
  const [tasks, setTasks] = useState([]);
  const [location, setLocation] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [isHome, setIsHome] = useState(true);
  const lastReverseGeocodeRef = useRef(null);
  const reminderTimersRef = useRef([]);
  const navigate = useNavigate();
  const { language, accessibilitySettings } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) =>
    getTranslation(language, key, vars);
  const dt = useDynamicTranslations(
    tasks.map((task) => task.title),
    language,
    accessToken
  );

  useEffect(() => {
    if (user?.id && accessToken) {
      loadTasks();
      startLocationTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reminderTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    reminderTimersRef.current = [];

    if (!accessibilitySettings.notifications) return;

    const reminderCount = Math.max(0, Math.min(5, Number(accessibilitySettings.taskReminderCount ?? 2)));
    if (reminderCount === 0) return;

    const now = new Date();
    const todayTasks = tasks.filter((task) => !task.completedAt && task.time);
    todayTasks.forEach((task) => {
      const [hours, minutes] = String(task.time).split(':');
      const dueAt = new Date();
      dueAt.setHours(Number(hours), Number(minutes || 0), 0, 0);

      for (let index = 0; index < reminderCount; index += 1) {
        const reminderAt = new Date(dueAt.getTime() + index * 5 * 60 * 1000);
        const delay = reminderAt.getTime() - now.getTime();
        if (delay < 0 || delay > 24 * 60 * 60 * 1000) continue;

        const timerId = window.setTimeout(() => {
          notifyInBrowser(t('taskReminderTitle'), dt(task.title));
        }, delay);
        reminderTimersRef.current.push(timerId);
      }
    });

    return () => {
      reminderTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      reminderTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, accessibilitySettings.notifications, accessibilitySettings.taskReminderCount, language]);

  function demoPatientTasks() {
    return [
      { id: 'patient-demo-meds', title: 'Take Morning Medication', time: '08:00', completedAt: null, videoUrl: 'https://www.youtube.com/watch?v=medication-demo' },
      { id: 'patient-demo-breakfast', title: 'Eat Breakfast', time: '08:30', completedAt: null, videoUrl: null },
      { id: 'patient-demo-bp', title: 'Check Blood Pressure', time: '10:00', completedAt: null, videoUrl: 'https://www.youtube.com/watch?v=bp-check' },
      { id: 'patient-demo-water', title: 'Drink Water', time: '11:30', completedAt: null, videoUrl: null },
      { id: 'patient-demo-walk', title: 'Short Walk Near Home', time: '16:00', completedAt: null, videoUrl: null },
      { id: 'patient-demo-evening', title: 'Take Evening Medication', time: '19:00', completedAt: null, videoUrl: 'https://www.youtube.com/watch?v=medication-demo' }
    ];
  }

  function demoLocationState() {
    return {
      current: {
        latitude: 1.3519,
        longitude: 103.9447,
        address: 'Tampines Street 81, Block 827A'
      },
      geofence: {
        patientId: user?.id || 'demo-patient',
        homeAddress: accessibilitySettings.homeAddress || 'Tampines Street 82, Block 821',
        homeDistanceAvailable: true,
        distanceFromHomeMeters: 260,
        isHome: false,
        updatedAt: new Date().toISOString()
      }
    };
  }

  async function loadTasks() {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/patient/${user.id}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks((data.tasks || []).length > 0 ? data.tasks : demoPatientTasks());
      }
    } catch (error) {
      console.log('Error loading tasks:', error);
      setTasks(demoPatientTasks());
    }
  }

  async function completeTask(taskId) {
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/tasks/${taskId}/complete`,
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

  async function reverseGeocodeLocation(latitude, longitude) {
    const last = lastReverseGeocodeRef.current;
    const movedEnough = !last ||
      Math.abs(last.latitude - latitude) > 0.00035 ||
      Math.abs(last.longitude - longitude) > 0.00035;

    if (!movedEnough && last?.address) {
      return last.address;
    }

    try {
      const url = new URL(`${supabaseFunctionsApiBase}/location/reverse-geocode`);
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          lastReverseGeocodeRef.current = { latitude, longitude, address: data.address };
          return data.address;
        }
      }
    } catch (error) {
      console.log('Reverse geocode error:', error);
    }

    return last?.address || '';
  }

  async function buildAddressedLocation(latitude, longitude) {
    const address = await reverseGeocodeLocation(latitude, longitude);
    return { latitude, longitude, address };
  }

  function startLocationTracking() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = await buildAddressedLocation(
            position.coords.latitude,
            position.coords.longitude
          );

          setLocation(newLocation);

          try {
            const response = await fetch(
              `${supabaseFunctionsApiBase}/location`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(newLocation)
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (typeof data.geofence?.isHome === 'boolean') {
                setIsHome(data.geofence.isHome);
                setGeofence(data.geofence);
              }
            }
          } catch (error) {
            console.log('Error updating location:', error);
          }
        },
      (error) => {
        console.log('Location error:', error);
        const demo = demoLocationState();
        setLocation(demo.current);
        setGeofence(demo.geofence);
        setIsHome(demo.geofence.isHome);
      },
      { enableHighAccuracy: true }
      );
    }
    else {
      const demo = demoLocationState();
      setLocation(demo.current);
      setGeofence(demo.geofence);
      setIsHome(demo.geofence.isHome);
    }
  }

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

  async function handleHelpButton() {
    let helpLocation = location;
    try {
      if (!helpLocation) {
        const position = await getCurrentPosition();
        helpLocation = await buildAddressedLocation(position.coords.latitude, position.coords.longitude);
        setLocation(helpLocation);
      } else if (!helpLocation.address) {
        helpLocation = await buildAddressedLocation(helpLocation.latitude, helpLocation.longitude);
        setLocation(helpLocation);
      }

      const response = await fetch(
        `${supabaseFunctionsApiBase}/patient/lost-alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(helpLocation)
        }
      );

      if (!response.ok) {
        throw new Error('Lost alert failed');
      }
    } catch (error) {
      console.log('Error sending lost alert:', error);
      alert(t('alertNoPatientLocation'));
      return;
    }

    const emergencyLine = accessibilitySettings.emergencyPhone
      ? `\n\n${t('alertEmergencyContactLine', {
          contact: accessibilitySettings.emergencyContact || t('emergencyContact'),
          phone: accessibilitySettings.emergencyPhone,
        })}`
      : '';
    alert(`${t('alertHelpRequestSentTitle')}\n\n${t('alertHelpRequestSentBody')}${emergencyLine}`);
  }

  const todayTasks = tasks.filter(task => !task.completedAt);
  const currentLocationLabel = location
    ? location.address || t('resolvingAddress')
    : t('waitingForGps');
  const homeLocationLabel = geofence?.homeAddress === 'Home address not set'
    ? t('homeAddressNotSet')
    : geofence?.homeAddress || t('homeAddressNotSet');
  const distanceFromHome = geofence?.homeDistanceAvailable === false || homeLocationLabel === t('homeAddressNotSet')
    ? t('homeAddressNotSet')
    : typeof geofence?.distanceFromHomeMeters === 'number'
    ? geofence.distanceFromHomeMeters < 1000
      ? t('metersAway', { distance: geofence.distanceFromHomeMeters })
      : t('kilometersAway', { distance: (geofence.distanceFromHomeMeters / 1000).toFixed(1) })
    : t('calculatingDistance');

  return (
    <div className="size-full isomer-app-shell flex flex-col">
      {/* Top Bar */}
      <div className="relative isomer-topbar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold">{t('brandName')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={t('settings')}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-8">
        <div className="p-4 space-y-5 max-w-2xl mx-auto w-full">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-4 ${isHome ? 'bg-emerald-600' : 'bg-amber-500'} text-white`}>
              <p className="text-sm font-semibold opacity-90">{t('patientLocation')}</p>
              <div className="mt-2 flex items-center gap-3">
                {isHome ? <Home className="w-8 h-8" /> : <Navigation className="w-8 h-8" />}
                <h2 className="text-3xl font-bold leading-tight">
                  {isHome ? t('youAreHome') : t('awayFromHome')}
                </h2>
              </div>
            </div>

            <div className="p-5 grid gap-3">
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
                <MapPin className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">{t('whereYouAre')}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{currentLocationLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-600">{t('home')}</p>
                  <p className="text-base font-bold text-gray-900 mt-1 break-words">{homeLocationLabel}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-600">{t('distanceFromHome')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{distanceFromHome}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleHelpButton}
            className="w-full min-h-32 rounded-3xl bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 active:scale-[0.99] transition-all flex items-center justify-center gap-4 px-5"
          >
            <AlertCircle className="w-12 h-12 shrink-0" />
            <span className="text-3xl font-bold">{t('needHelp')}</span>
          </button>

          {/* Today's Tasks */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('todaysTasks')}</h3>

            {todayTasks.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-gray-800">{t('allTasksCompleted')}</p>
                <p className="text-gray-600 mt-1">{t('greatJobToday')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-gray-200 rounded-3xl p-5 flex items-center gap-4"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      className="flex-shrink-0 w-16 h-16 border-4 border-blue-600 rounded-full hover:bg-blue-50 transition-colors active:scale-95"
                      title={t('tooltipMarkDone')}
                    />

                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800">{dt(task.title)}</h4>
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
        </div>
      </div>
    </div>
  );
}
