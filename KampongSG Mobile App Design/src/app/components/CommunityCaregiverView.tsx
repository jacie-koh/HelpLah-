import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, MapPin, Users, CheckCircle, Bell, LayoutGrid, Home, HelpCircle } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';

export function CommunityCaregiverView({ user, profile, accessToken }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [activeView, setActiveView] = useState('home');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id && accessToken) {
      loadAvailability();
      loadPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAvailability() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/caregiver/${user.id}/availability`,
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

  async function loadPatients() {
    setPatients([
      {
        id: '1',
        name: 'Patient Name',
        status: 'home',
        distance: '2.3 km away',
        tasksCompleted: 5,
        tasksTotal: 7,
        lastActivity: '2h ago'
      }
    ]);
  }

  async function toggleAvailability() {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/availability`,
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

      alert(newAvailability ? '✓ You are now available to help' : '✓ You are now unavailable');
    } catch (error) {
      console.log('Error updating availability:', error);
    }
  }

  async function handleTakeOver() {
    setIsWatching(true);
    alert('✓ You are now watching the patient. All caregivers have been notified.');

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/availability`,
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
    } catch (error) {
      console.log('Error taking over care:', error);
    }
  }

  return (
    <div className="size-full bg-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
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
      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4">
          {/* Welcome Message */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Community Care</h2>
          <p className="text-gray-600 mb-6">Support when needed</p>

          {/* Availability Toggle */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">My Availability</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isAvailable ? 'You are available to help' : 'Currently unavailable'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`relative inline-flex items-center h-10 rounded-full w-20 transition-colors ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-8 h-8 transform transition-transform bg-white rounded-full shadow-md ${
                    isAvailable ? 'translate-x-11' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Support Request Alert */}
          {isAvailable && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <Bell className="w-7 h-7 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900">Primary Caregiver Needs Support</h3>
                  <p className="text-sm text-orange-800 mt-2">
                    Primary caregiver is away and needs someone to watch the patient
                  </p>
                  {!isWatching ? (
                    <button
                      onClick={handleTakeOver}
                      className="mt-4 bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors active:scale-95"
                    >
                      I'll Take Over
                    </button>
                  ) : (
                    <div className="mt-4 bg-green-100 text-green-800 px-5 py-3 rounded-xl inline-flex items-center gap-2 font-semibold">
                      <CheckCircle className="w-5 h-5" />
                      You are currently watching
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patients I Help With */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Patients I Help With
              </h3>
            </div>

            {patients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No patients linked yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {patients.map((patient) => (
                  <div key={patient.id} className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{patient.name}</h4>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {patient.distance}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                        At Home
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Tasks Today</p>
                        <p className="text-2xl font-bold text-gray-800">{patient.tasksCompleted}/{patient.tasksTotal}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Last Activity</p>
                        <p className="text-2xl font-bold text-gray-800">{patient.lastActivity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How You Help */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4">How You Help</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <span className="text-gray-800">Step in when primary caregiver is away or needs a break</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <span className="text-gray-800">Monitor patient location and respond to help requests</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <span className="text-gray-800">Support with daily tasks when assistance is needed</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <span className="text-gray-800">Your help prevents primary caregiver burnout</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'home' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors text-gray-600"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs font-semibold">Patients</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors text-gray-600"
        >
          <HelpCircle className="w-6 h-6" />
          <span className="text-xs font-semibold">Help</span>
        </button>
      </div>
    </div>
  );
}