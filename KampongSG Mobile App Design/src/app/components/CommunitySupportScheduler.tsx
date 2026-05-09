import { useState } from 'react';
import { X, Plus, Users, Calendar, Clock } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';

export function CommunitySupportScheduler({ userId, accessToken, onClose, onSessionCreated }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('2');
  const [tasks, setTasks] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSchedule() {
    if (!date || !time) {
      alert('Please fill in date and time');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/community-support`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            userId,
            date,
            time,
            duration: `${duration} hours`,
            tasks,
            status: 'pending', // Waiting for a community caregiver to accept
            caregiverName: null // Not assigned yet
          })
        }
      );

      if (response.ok) {
        if (onSessionCreated) {
          onSessionCreated();
        }
        onClose();
      } else {
        alert('Failed to create community support request');
      }
    } catch (error) {
      console.log('Error creating community support request:', error);
      alert('Failed to create community support request');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: '#E8F2FF' }}>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">Request Community Support</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm text-gray-600 mb-6 bg-purple-50 border border-purple-200 rounded-lg p-3">
            ℹ️ Community caregivers will see this request and can accept it. You'll be notified when someone accepts.
          </p>
          
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Needed
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duration Needed
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="5">5 hours</option>
                <option value="6">6 hours</option>
                <option value="8">8 hours (full day)</option>
              </select>
            </div>

            {/* Tasks/Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tasks & Instructions
              </label>
              <textarea
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                placeholder="What help do you need? (e.g., Accompany patient to doctor appointment, help with daily tasks, meal preparation...)"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSchedule}
            disabled={!date || !time || creating}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating Request...' : 'Request Community Support'}
          </button>
        </div>
      </div>
    </div>
  );
}