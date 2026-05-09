import { useContext, useState } from 'react';
import { X, Plus, Users, Calendar, Clock, Mic } from 'lucide-react';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';
import { useDynamicTranslations } from '../utils/dynamicTranslations';
import { recordSpeechToText } from '../utils/voice';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
  { value: '5', label: '5 hours' },
  { value: '6', label: '6 hours' },
  { value: '8', label: '8 hours (full day)' }
];

export function CommunitySupportScheduler({ userId, accessToken, onClose, onSessionCreated }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('2');
  const [tasks, setTasks] = useState('');
  const [creating, setCreating] = useState(false);
  const [isRecordingTasks, setIsRecordingTasks] = useState(false);
  const { language, accessibilitySettings } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) =>
    getTranslation(language, key, vars);
  const dt = useDynamicTranslations(
    [...DURATION_OPTIONS.map((option) => option.label), tasks],
    language,
    accessToken
  );

  async function handleSchedule() {
    if (!date || !time) {
      alert(t('alertFillDateTime'));
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `${supabaseFunctionsApiBase}/community-support`,
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
            duration: DURATION_OPTIONS.find((option) => option.value === duration)?.label || `${duration} hours`,
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
        alert(t('alertFailedCommunitySupport'));
      }
    } catch (error) {
      console.log('Error creating community support request:', error);
      alert(t('alertFailedCommunitySupport'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDictateTasks() {
    if (!accessibilitySettings.speechToText) {
      alert(t('alertSpeechToTextOff'));
      return;
    }

    setIsRecordingTasks(true);
    try {
      alert(t('alertVoiceRecordingStartedShort'));
      const transcript = await recordSpeechToText(language, accessToken);
      if (transcript) {
        setTasks((current) => current ? `${current} ${transcript}` : transcript);
      } else {
        alert(t('alertTranscribeFailed'));
      }
    } catch (error) {
      console.log('Community support dictation error:', error);
      alert(t('alertMicrophoneUnavailable'));
    } finally {
      setIsRecordingTasks(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: '#E8F2FF' }}>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">{t('requestCommunitySupport')}</h2>
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
            ℹ️ {t('schedulerInfo')}
          </p>
          
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('dateNeeded')}
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
                {t('startTime')}
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
                {t('durationNeeded')}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {dt(option.label)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tasks/Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('tasksInstructions')}
              </label>
              <div className="relative">
                <textarea
                  value={tasks}
                  onChange={(e) => setTasks(e.target.value)}
                  placeholder={t('supportRequestPlaceholder')}
                  rows={4}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleDictateTasks}
                  disabled={!accessibilitySettings.speechToText}
                  className={`absolute right-2 top-2 rounded-lg p-2 transition-colors ${
                    isRecordingTasks ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={t('tooltipVoiceInput')}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
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
            {creating ? t('creatingRequest') : t('requestCommunitySupport')}
          </button>
        </div>
      </div>
    </div>
  );
}
