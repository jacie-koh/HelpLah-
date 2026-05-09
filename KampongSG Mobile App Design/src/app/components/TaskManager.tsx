import { useState } from 'react';
import { X, Plus, Video, Image, Mic } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';

const TASK_TEMPLATES = [
  { title: 'Take Morning Medication', time: '08:00', videoUrl: 'https://www.youtube.com/watch?v=medication-demo', imageUrl: null },
  { title: 'Morning Shower', time: '09:00', videoUrl: 'https://www.youtube.com/watch?v=shower-guide', imageUrl: null },
  { title: 'Check Blood Pressure', time: '10:00', videoUrl: 'https://www.youtube.com/watch?v=bp-check', imageUrl: null },
  { title: 'Lunch Time', time: '12:00', videoUrl: null, imageUrl: null },
  { title: 'Afternoon Walk', time: '15:00', videoUrl: null, imageUrl: null },
  { title: 'Take Evening Medication', time: '18:00', videoUrl: 'https://www.youtube.com/watch?v=medication-demo', imageUrl: null },
  { title: 'Check Blood Sugar', time: '19:00', videoUrl: 'https://www.youtube.com/watch?v=glucose-check', imageUrl: null },
  { title: 'Bedtime', time: '21:00', videoUrl: null, imageUrl: null }
];

export function TaskManager({ patientId, accessToken, onClose, onTasksCreated }) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  function toggleTask(task) {
    if (selectedTasks.find(t => t.title === task.title)) {
      setSelectedTasks(selectedTasks.filter(t => t.title !== task.title));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  }

  function handleVoiceInput() {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate voice recording
      alert('🎤 Voice recording started. In production, this would use SEA Lion LLM for speech-to-text conversion across Singapore dialects.');
      setTimeout(() => {
        setIsRecording(false);
        setCustomTitle('Take medication after breakfast');
      }, 2000);
    } else {
      setIsRecording(false);
    }
  }

  function addCustomTask() {
    if (!customTitle) return;

    const customTask = {
      title: customTitle,
      time: customTime || null,
      videoUrl: customVideoUrl || null,
      imageUrl: customImageUrl || null
    };

    setSelectedTasks([...selectedTasks, customTask]);
    setCustomTitle('');
    setCustomTime('');
    setCustomVideoUrl('');
    setCustomImageUrl('');
  }

  async function createTasks() {
    if (selectedTasks.length === 0) return;

    setCreating(true);
    try {
      for (const task of selectedTasks) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/tasks`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              patientId,
              title: task.title,
              time: task.time,
              videoUrl: task.videoUrl,
              imageUrl: task.imageUrl,
              status: 'pending',
              reminderCount: 0
            })
          }
        );
      }

      if (onTasksCreated) {
        onTasksCreated();
      }
      onClose();
    } catch (error) {
      console.log('Error creating tasks:', error);
      alert('Failed to create tasks');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Add Tasks</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Templates */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-3">
              {TASK_TEMPLATES.map((task, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleTask(task)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedTasks.find(t => t.title === task.title)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                      {task.time && (
                        <p className="text-xs text-gray-600 mt-1">{task.time}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {task.videoUrl && (
                        <Video className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                      {task.imageUrl && (
                        <Image className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Task */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Custom Task</h3>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Task name (e.g., Exercise)"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleVoiceInput}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    isRecording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Voice input"
                >
                  <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                placeholder="Video URL (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Image URL (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addCustomTask}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Custom Task
              </button>
            </div>
          </div>

          {/* Selected Tasks Summary */}
          {selectedTasks.length > 0 && (
            <div className="mt-6 bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Selected Tasks ({selectedTasks.length})
              </h4>
              <div className="space-y-1">
                {selectedTasks.map((task, idx) => (
                  <div key={idx} className="text-sm text-blue-800 flex items-center gap-2">
                    <span>• {task.title} {task.time && `(${task.time})`}</span>
                    <div className="flex gap-1">
                      {task.videoUrl && <Video className="w-3 h-3" />}
                      {task.imageUrl && <Image className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={createTasks}
            disabled={selectedTasks.length === 0 || creating}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating Tasks...' : `Create ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}