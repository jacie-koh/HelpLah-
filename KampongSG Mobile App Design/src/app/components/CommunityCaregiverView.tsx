import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, MapPin, Users, CheckCircle, Bell, LayoutGrid, Home, FileText, BookOpen, Calendar, MessageCircle } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';

export function CommunityCaregiverView({ user, profile, accessToken }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [communityNotes, setCommunityNotes] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [activeView, setActiveView] = useState('home');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteSummary, setNewNoteSummary] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSummary, setEditingSummary] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [weeklyAvailability, setWeeklyAvailability] = useState([
    { day: 'M', available: true, startTime: '08:00', endTime: '17:00' },
    { day: 'T', available: true, startTime: '08:00', endTime: '17:00' },
    { day: 'W', available: false, startTime: '', endTime: '' },
    { day: 'T', available: true, startTime: '08:00', endTime: '17:00' },
    { day: 'F', available: true, startTime: '08:00', endTime: '17:00' },
    { day: 'S', available: false, startTime: '', endTime: '' },
    { day: 'S', available: false, startTime: '', endTime: '' }
  ]);
  const navigate = useNavigate();

  const greetingName = profile?.name || 'Caregiver';

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

  async function saveAvailability(available) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/caregiver/${user.id}/availability`,
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
    const patientsData = [
      {
        id: '1',
        name: 'Uncle Tan',
        status: 'home',
        distance: '2.3 km away',
        tasksCompleted: 5,
        tasksTotal: 7,
        lastActivity: '2h ago',
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
        assignmentId: 'a1',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
        assignmentStart: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Tomorrow 2 PM
        assignmentEnd: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000) // Tomorrow 4 PM
      },
      {
        id: 'n2',
        patientId: '1',
        title: 'Mobility Note',
        summary: 'Patient was assisted with a short walk today. No dizziness reported.',
        time: '45 min ago',
        assignmentId: 'a2',
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
        assignmentStart: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        assignmentEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
      }
    ]);

    setSupportRequests([
      {
        id: 'r1',
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
        id: 'avail1',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '11:00',
        patientName: 'Uncle Tan',
        task: 'Morning medication and breakfast support',
        location: 'Bedok Central'
      },
      {
        id: 'avail2',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        startTime: '14:00',
        endTime: '16:00',
        patientName: 'Mrs. Lim',
        task: 'Afternoon medication and lunch',
        location: 'Paya Lebar'
      },
      {
        id: 'avail3',
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '12:00',
        patientName: 'Uncle Tan',
        task: 'Morning routine assistance',
        location: 'Bedok Central'
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

  function handleAcceptRequest(requestId) {
    setSupportRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId ? { ...request, status: 'accepted' } : request
      )
    );
    alert('✓ You accepted the request and the primary caregiver has been notified.');
  }

  function isNoteAccessible(note) {
    const now = new Date();
    const assignmentStart = new Date(note.assignmentStart);
    const assignmentEnd = new Date(note.assignmentEnd);

    // Check if current time is within 60 minutes before or after the assignment
    const sixtyMinBefore = new Date(assignmentStart.getTime() - 60 * 60 * 1000);
    const sixtyMinAfter = new Date(assignmentEnd.getTime() + 60 * 60 * 1000);

    return now >= sixtyMinBefore && now <= sixtyMinAfter;
  }

  function getAccessibleNotes() {
    return communityNotes.filter(note => isNoteAccessible(note));
  }

  function handleAddNote() {
    if (!selectedPatientId) {
      alert('Please select a patient first.');
      return;
    }
    if (!newNoteTitle.trim() || !newNoteSummary.trim()) {
      alert('Please enter both a title and a note.');
      return;
    }

    const now = new Date();
    const note = {
      id: `n${Date.now()}`,
      patientId: selectedPatientId,
      title: newNoteTitle.trim(),
      summary: newNoteSummary.trim(),
      time: 'Just now',
      assignmentId: null, // Would be set based on current assignment
      createdAt: now,
      assignmentStart: now, // Would be set to actual assignment time
      assignmentEnd: now
    };

    setCommunityNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteSummary('');
  }

  function handleEditNote(note) {
    if (!isNoteAccessible(note)) {
      alert('This note is locked and can no longer be edited.');
      return;
    }
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setEditingSummary(note.summary);
  }

  function handleSaveNote() {
    if (!editingTitle.trim() || !editingSummary.trim()) {
      alert('Please enter both a title and note content.');
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

  function handleCancelEdit() {
    setEditingNoteId(null);
    setEditingTitle('');
    setEditingSummary('');
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

  function handleTakeAssignment(assignmentId) {
    const assignment = availableAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const now = new Date();
    const assignmentTime = new Date(assignment.date);
    const timeDiff = assignmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      alert('Assignments must be taken at least 24 hours in advance.');
      return;
    }

    alert(`✓ You have taken the assignment for ${assignment.patientName} on ${assignment.date.toLocaleDateString()} from ${assignment.startTime} to ${assignment.endTime}.`);
    setAvailableAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }

  function openChatbot() {
    alert('🤖 SEA Lion Chatbot\n\nOpening voice/text chat interface for communication with primary caregivers and patients.\n\nFeatures:\n• Text-to-speech in multiple languages\n• Speech-to-text for SEA dialects\n• Real-time communication\n• Emergency alerts');
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
          <div className="mb-6">
            <p className="text-sm text-gray-500">Hi {greetingName}, welcome back!</p>
          </div>

          {activeView === 'home' && (
            <>
              <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">My Schedule</h3>
                    <p className="text-sm text-gray-600">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
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
                  <div className="py-2">Sun</div>
                  <div className="py-2">Mon</div>
                  <div className="py-2">Tue</div>
                  <div className="py-2">Wed</div>
                  <div className="py-2">Thu</div>
                  <div className="py-2">Fri</div>
                  <div className="py-2">Sat</div>
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
                      Assignments for {selectedDate.toLocaleDateString()}
                    </h4>
                    {getAssignmentsForDate(selectedDate).length === 0 ? (
                      <p className="text-sm text-gray-600">No assignments available</p>
                    ) : (
                      <div className="space-y-2">
                        {getAssignmentsForDate(selectedDate).map((assignment) => (
                          <div key={assignment.id} className="bg-gray-50 rounded-xl p-3 border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-800">{assignment.patientName}</span>
                              <span className="text-xs text-gray-600">{assignment.startTime} - {assignment.endTime}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{assignment.task}</p>
                            <p className="text-xs text-gray-600 mb-3">📍 {assignment.location}</p>
                            <button
                              onClick={() => handleTakeAssignment(assignment.id)}
                              className="w-full bg-purple-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-purple-700 transition"
                            >
                              Take Assignment
                            </button>
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
                    <h3 className="text-lg font-bold text-gray-800">My Availability</h3>
                    <p className="text-sm text-gray-600">This week - for ad-hoc matching</p>
                  </div>
                  <button
                    onClick={() => {
                      const newStatus = !isAvailable;
                      setIsAvailable(newStatus);
                      setIsWatching(newStatus);
                      saveAvailability(newStatus);
                    }}
                    className={`px-3 py-1 rounded-xl text-sm font-semibold transition ${
                      isAvailable ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isAvailable ? 'Go Offline' : 'Go Online'}
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-600 mb-3">
                  {weeklyAvailability.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const newAvailability = [...weeklyAvailability];
                        newAvailability[index].available = !newAvailability[index].available;
                        if (!newAvailability[index].available) {
                          newAvailability[index].startTime = '';
                          newAvailability[index].endTime = '';
                        } else {
                          newAvailability[index].startTime = '08:00';
                          newAvailability[index].endTime = '17:00';
                        }
                        setWeeklyAvailability(newAvailability);
                      }}
                      className={`rounded-2xl p-3 border transition ${
                        day.available ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      <div>{day.day}</div>
                      <div className="text-[10px] mt-1">{day.available ? `${day.startTime} - ${day.endTime}` : 'Off'}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-600">
                  <p>💡 Your availability determines when you can receive ad-hoc support requests from primary caregivers in your area.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-white border-2 border-gray-200 rounded-3xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Bell className="w-6 h-6 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-800">Immediate assistance</h3>
                  </div>
                  <p className="text-sm text-gray-600">If a nearby primary caregiver needs support, you will see it here.</p>
                  {isAvailable && supportRequests.length > 0 ? (
                    <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
                      Primary caregiver request active in your area.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-slate-50 border border-gray-200 p-4 text-sm text-gray-600">
                      No urgent support requests right now.
                    </div>
                  )}
                </div>


              </div>
            </>
          )}

          {activeView === 'resources' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-7 h-7 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">Community Care Resources</h3>
                  </div>
                  <p className="text-gray-600 mb-3">Quick links and support information for community caregivers.</p>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li><a href="https://www.caring.sg/" target="_blank" rel="noreferrer" className="underline">Caring SG</a></li>
                    <li><a href="https://www.aic.sg/Caregiving-Support/Connecting-with-other-caregivers" target="_blank" rel="noreferrer" className="underline">AIC Caregiving Support</a></li>
                    <li><a href="https://www.aic.sg/" target="_blank" rel="noreferrer" className="underline">AIC Help for Caregivers</a></li>
                  </ul>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-7 h-7 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">Helpline Contacts</h3>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <div className="rounded-xl border border-gray-200 p-4 bg-slate-50">
                      <p className="font-semibold">Club Heal</p>
                      <p>6899 3463</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-slate-50">
                      <p className="font-semibold">Mindful Community</p>
                      <p>6460 4400</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageCircle className="w-7 h-7 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">SEA Lion Chatbot</h3>
                  </div>
                  <p className="text-gray-600 mb-3">Voice and text communication with primary caregivers and patients.</p>
                  <button
                    onClick={openChatbot}
                    className="w-full bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-purple-700 transition"
                  >
                    Open Chatbot
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Community Notes</h3>
                  <select
                    value={selectedPatientId || ''}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPatientId && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Note title..."
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <textarea
                        placeholder="Add a community note..."
                        value={newNoteSummary}
                        onChange={(e) => setNewNoteSummary(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        rows={2}
                      />
                      <button
                        onClick={handleAddNote}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {selectedPatientId ? (
                  getAccessibleNotes().filter(note => note.patientId === selectedPatientId).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No accessible notes for this patient.</p>
                      <p className="text-xs mt-1">Notes are only available 60 minutes before and after assignments.</p>
                    </div>
                  ) : (
                    getAccessibleNotes().filter(note => note.patientId === selectedPatientId).map((note) => (
                      <div key={note.id} className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-4">
                        {editingNoteId === note.id ? (
                          <div className="space-y-3">
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                            />
                            <textarea
                              value={editingSummary}
                              onChange={(e) => setEditingSummary(e.target.value)}
                              className="w-full min-h-[120px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={handleSaveNote}
                                className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-gray-800">{note.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{note.time}</span>
                                <button
                                  onClick={() => handleEditNote(note)}
                                  className="text-xs text-purple-600 hover:text-purple-800"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-700 mb-4">{note.summary}</p>
                          </>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Please select a patient to view their community notes.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="space-y-4">
              {supportRequests.length === 0 ? (
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center text-gray-600">
                  No nearby requests right now.
                </div>
              ) : (
                supportRequests.map((request) => (
                  <div key={request.id} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">{request.time}</p>
                        <h3 className="text-lg font-bold text-gray-800">{request.caregiverName} needs help</h3>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{request.distance}</span>
                    </div>
                    <p className="text-gray-700 mb-3">{request.request}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Patient: {request.patientName}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Location: {request.location}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-purple-600 text-white rounded-xl px-5 py-3 font-semibold hover:bg-purple-700 transition-colors active:scale-95"
                        disabled={request.status !== 'pending'}
                      >
                        {request.status === 'accepted' ? 'Accepted' : 'Accept'}
                      </button>
                      {request.status === 'pending' && (
                        <span className="inline-flex items-center px-3 py-2 rounded-xl bg-yellow-100 text-yellow-800 text-sm font-semibold">Pending</span>
                      )}
                      {request.status === 'accepted' && (
                        <span className="inline-flex items-center px-3 py-2 rounded-xl bg-green-100 text-green-800 text-sm font-semibold">Accepted</span>
                      )}
                    </div>
                  </div>
                ))
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
            activeView === 'home' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button
          onClick={() => setActiveView('resources')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'resources' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs font-semibold">Resources</span>
        </button>
        <button
          onClick={() => setActiveView('notes')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'notes' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs font-semibold">Notes</span>
        </button>
        <button
          onClick={() => setActiveView('notifications')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'notifications' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <Bell className="w-6 h-6" />
          <span className="text-xs font-semibold">Alerts</span>
        </button>
      </div>
    </div>
  );
}