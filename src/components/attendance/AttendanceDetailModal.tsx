'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Clock, Calendar, Edit2, Save, XCircle, Trash2, Check, Plus } from 'lucide-react';

interface TimerEvent {
  id: string;
  eventType: 'WORK' | 'REST' | 'END';
  timestamp: string;
  endTimestamp: string | null;
  durationFromNext: number | null;
  memo: string | null;
}

interface AttendanceDetail {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes: number;
  workMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day';
  notes: string | null;
  timerEvents?: TimerEvent[];
  approvalStatus?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

interface AttendanceDetailModalProps {
  attendance: AttendanceDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedAttendance: AttendanceDetail) => void;
}

export function AttendanceDetailModal({
  attendance,
  isOpen,
  onClose,
  onSave,
}: AttendanceDetailModalProps) {
  console.log('🔷 AttendanceDetailModal: Component rendering', { 
    attendance, 
    isOpen, 
    hasOnSave: !!onSave 
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<AttendanceDetail | null>(null);
  
  // Timer event editing states
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [timeEditData, setTimeEditData] = useState({ 
    year: '', 
    month: '', 
    day: '', 
    hours: '00', 
    minutes: '00', 
    eventType: '', 
    reason: '' 
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventData, setCreateEventData] = useState({
    year: '',
    month: '',
    day: '',
    hours: '00',
    minutes: '00',
    eventType: 'WORK' as 'WORK' | 'REST' | 'END',
    memo: ''
  });
  const [timerEvents, setTimerEvents] = useState<TimerEvent[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  
  const memoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update timer events when attendance changes
  useEffect(() => {
    console.log('🔷 useEffect: Attendance changed', { 
      hasTimerEvents: !!attendance?.timerEvents,
      timerEventsCount: attendance?.timerEvents?.length || 0 
    });
    
    if (attendance?.timerEvents) {
      console.log('🔷 useEffect: Setting timer events', attendance.timerEvents);
      setTimerEvents(attendance.timerEvents);
    } else {
      console.log('🔷 useEffect: No timer events, clearing array');
      setTimerEvents([]);
    }
    
    // Check if attendance is approved
    if (attendance) {
      console.log('🔷 useEffect: Checking approval', {
        hasApprovalStatus: 'approvalStatus' in attendance,
        approvalStatus: attendance.approvalStatus,
        attendance: attendance
      });
      const approved = attendance.approvalStatus === 'APPROVED';
      setIsApproved(approved);
      console.log('🔷 useEffect: Approval status', { 
        approved,
        approvalStatus: attendance.approvalStatus,
        comparison: `${attendance.approvalStatus} === 'APPROVED'`
      });
    }
  }, [attendance]);

  // Check if the selected date is today
  const isToday = () => {
    console.log('🔷 isToday: Checking if date is today', { attendanceDate: attendance?.date });
    
    if (!attendance) {
      console.log('🔷 isToday: No attendance, returning false');
      return false;
    }
    
    const selectedDate = new Date(attendance.date);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const result = selectedDate.getTime() === today.getTime();
    
    console.log('🔷 isToday: Result', { 
      selectedDate: selectedDate.toISOString(), 
      today: today.toISOString(), 
      isToday: result 
    });
    
    return result;
  };

  // Calculate total work time and break time from timer events
  const calculateTimes = () => {
    console.log('🔷 calculateTimes: Starting calculation', { 
      timerEventsCount: timerEvents.length,
      timerEvents 
    });
    
    let totalWorkSeconds = 0;
    let totalBreakSeconds = 0;
    let lastWorkStart: number | null = null;
    let lastBreakStart: number | null = null;

    for (const event of timerEvents) {
      console.log('🔷 calculateTimes: Processing event', { 
        eventId: event.id, 
        eventType: event.eventType, 
        timestamp: event.timestamp 
      });
      const timestamp = Number(event.timestamp);
      console.log('🔷 calculateTimes: Event timestamp', { timestamp, eventType: event.eventType });
      
      if (event.eventType === 'WORK') {
        console.log('🔷 calculateTimes: WORK event', { lastBreakStart, lastWorkStart });
        
        if (lastBreakStart !== null) {
          const breakDuration = timestamp - lastBreakStart;
          totalBreakSeconds += breakDuration;
          console.log('🔷 calculateTimes: Adding break time', { breakDuration, totalBreakSeconds });
          lastBreakStart = null;
        }
        // 連続WORKの場合、最初のWORK開始時刻を保持
        if (lastWorkStart === null) {
          lastWorkStart = timestamp;
          console.log('🔷 calculateTimes: Starting work period', { lastWorkStart });
        }
      } else if (event.eventType === 'REST') {
        console.log('🔷 calculateTimes: REST event', { lastWorkStart, lastBreakStart });
        if (lastWorkStart !== null) {
          const workDuration = timestamp - lastWorkStart;
          totalWorkSeconds += workDuration;
          console.log('🔷 calculateTimes: Adding work time', { workDuration, totalWorkSeconds });
          lastWorkStart = null;
        }
        // 連続RESTの場合、最初のREST開始時刻を保持
        if (lastBreakStart === null) {
          lastBreakStart = timestamp;
          console.log('🔷 calculateTimes: Starting break period', { lastBreakStart });
        }
      } else if (event.eventType === 'END') {
        console.log('🔷 calculateTimes: END event', { lastWorkStart, lastBreakStart });
        
        if (lastWorkStart !== null) {
          const workDuration = timestamp - lastWorkStart;
          totalWorkSeconds += workDuration;
          console.log('🔷 calculateTimes: Adding final work time', { workDuration, totalWorkSeconds });
          lastWorkStart = null;
        }
        if (lastBreakStart !== null) {
          const breakDuration = timestamp - lastBreakStart;
          totalBreakSeconds += breakDuration;
          console.log('🔷 calculateTimes: Adding final break time', { breakDuration, totalBreakSeconds });
          lastBreakStart = null;
        }
      }
    }

    // Only add current time for today's ongoing work/break
    const isTodayFlag = isToday();
    console.log('🔷 calculateTimes: Checking if today for ongoing calculation', { isTodayFlag });
    
    if (isTodayFlag) {
      const now = Math.floor(Date.now() / 1000);
      console.log('🔷 calculateTimes: Today - checking ongoing periods', { 
        now, 
        lastWorkStart, 
        lastBreakStart 
      });
      
      if (lastWorkStart !== null) {
        const ongoingWork = now - lastWorkStart;
        totalWorkSeconds += ongoingWork;
        console.log('🔷 calculateTimes: Adding ongoing work time', { ongoingWork, totalWorkSeconds });
      }
      if (lastBreakStart !== null) {
        const ongoingBreak = now - lastBreakStart;
        totalBreakSeconds += ongoingBreak;
        console.log('🔷 calculateTimes: Adding ongoing break time', { ongoingBreak, totalBreakSeconds });
      }
    }

    console.log('🔷 calculateTimes: Final calculation result', { 
      totalWorkSeconds, 
      totalBreakSeconds,
      workMinutes: Math.floor(totalWorkSeconds / 60),
      breakMinutes: Math.floor(totalBreakSeconds / 60)
    });

    return { totalWorkSeconds, totalBreakSeconds };
  };

  if (!isOpen || !attendance) {
    console.log('🔷 AttendanceDetailModal: Not rendering', { isOpen, hasAttendance: !!attendance });
    return null;
  }

  console.log('🔷 AttendanceDetailModal: Rendering modal');

  const formatTime = (time: string | null) => {
    console.log('🔷 formatTime: Formatting time', { time });
    if (!time) return '--:--';
    const date = new Date(time);
    const formatted = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    console.log('🔷 formatTime: Result', { time, formatted });
    return formatted;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatWorkHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatEventDate = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      leave: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      holiday: 'bg-blue-100 text-blue-800 border-blue-300',
      sick_leave: 'bg-orange-100 text-orange-800 border-orange-300',
      half_day: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'WORK':
        return 'Work';
      case 'REST':
        return 'Break';
      case 'END':
        return 'End';
      default:
        return eventType;
    }
  };

  const handleEdit = () => {
    console.log('🔷 handleEdit: Starting edit mode', { attendance });
    setEditedData({ ...attendance });
    setIsEditing(true);
    console.log('🔷 handleEdit: Edit mode activated');
  };

  const handleCancel = () => {
    console.log('🔷 handleCancel: Cancelling edit mode');
    setEditedData(null);
    setIsEditing(false);
    console.log('🔷 handleCancel: Edit mode deactivated');
  };

  const handleSave = () => {
    console.log('🔷 handleSave: Attempting to save', { 
      hasEditedData: !!editedData, 
      hasOnSave: !!onSave,
      editedData 
    });
    
    if (editedData && onSave) {
      console.log('🔷 handleSave: Calling onSave callback');
      onSave(editedData);
      setIsEditing(false);
      setEditedData(null);
      console.log('🔷 handleSave: Save completed');
    } else {
      console.log('🔷 handleSave: Cannot save - missing data or callback');
    }
  };

  const handleInputChange = (field: keyof AttendanceDetail, value: string) => {
    console.log('🔷 handleInputChange: Field changed', { field, value, hasEditedData: !!editedData });
    
    if (editedData) {
      const updatedData = {
        ...editedData,
        [field]: value,
      };
      console.log('🔷 handleInputChange: Updating edited data', { updatedData });
      setEditedData(updatedData);
    } else {
      console.log('🔷 handleInputChange: No edited data to update');
    }
  };

  const displayData = isEditing && editedData ? editedData : attendance;
  console.log('🔷 displayData: Current display data', { 
    isEditing, 
    hasEditedData: !!editedData, 
    displayData 
  });

  // Calculate work and break times from timer events
  const { totalWorkSeconds, totalBreakSeconds } = calculateTimes();
  const workMinutes = Math.floor(totalWorkSeconds / 60);
  const breakMinutes = Math.floor(totalBreakSeconds / 60);
  console.log('🔷 displayData: Calculated times', { 
    workMinutes, 
    breakMinutes, 
    totalWorkSeconds, 
    totalBreakSeconds 
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Attendance Details</h2>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(displayData.date)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={displayData.status}
                  onChange={(e) =>
                    handleInputChange(
                      'status',
                      e.target.value as AttendanceDetail['status']
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="holiday">Holiday</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="half_day">Half Day</option>
                </select>
              ) : (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    displayData.status
                  )}`}
                >
                  {displayData.status === 'present'
                    ? 'Present'
                    : displayData.status === 'absent'
                    ? 'Absent'
                    : displayData.status === 'leave'
                    ? 'Leave'
                    : displayData.status === 'holiday'
                    ? 'Holiday'
                    : displayData.status === 'sick_leave'
                    ? 'Sick Leave'
                    : 'Half Day'}
                </span>
              )}
            </div>

            {/* Time Details */}
            {displayData.status === 'present' && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Check In */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check In
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-medium text-gray-900">
                        {formatTime(displayData.checkIn)}
                      </span>
                    </div>
                  </div>

                  {/* Check Out */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check Out
                    </label>
                    {displayData.checkOut ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-lg font-medium text-gray-900">
                          {formatTime(displayData.checkOut)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-blue-600 font-medium">In Progress</span>
                    )}
                  </div>
                </div>

                {/* Work Hours & Break - Calculated from timer events */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Work Hours</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatWorkHours(workMinutes)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Break Time</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {formatWorkHours(breakMinutes)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              {isEditing ? (
                <textarea
                  value={displayData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Enter notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              ) : displayData.notes ? (
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                  {displayData.notes}
                </p>
              ) : (
                <p className="text-gray-400 italic">No notes</p>
              )}
            </div>

            {/* Timer Events - Always show section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Timer Event History
              </h3>
              {timerEvents && timerEvents.length > 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Duration</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Memo</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {timerEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-100 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono text-gray-900">
                            {formatEventDate(event.timestamp)}
                          </td>
                          <td className="px-3 py-2 text-sm font-mono text-gray-900">
                            {formatTimestamp(event.timestamp)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.eventType === 'WORK'
                                  ? 'bg-blue-100 text-blue-800'
                                  : event.eventType === 'REST'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {getEventTypeLabel(event.eventType)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm font-mono text-gray-600">
                            {event.durationFromNext !== null
                              ? formatWorkHours(Math.floor(event.durationFromNext / 60))
                              : '---'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {editingMemoId === event.id ? (
                                <div className="flex-1 relative">
                                  <textarea
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    onBlur={() => {
                                      setEditingMemoId(null);
                                      setMemoText('');
                                    }}
                                    autoFocus
                                    placeholder="Enter memo"
                                    maxLength={500}
                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={1}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    {event.memo ? (
                                      <p className="text-xs text-gray-700 truncate">
                                        {event.memo}
                                      </p>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">No memo</span>
                                    )}
                                  </div>
                              <button
                                onClick={() => {
                                  console.log('🔷 Memo Edit Button: Starting memo edit', { 
                                    eventId: event.id, 
                                    currentMemo: event.memo 
                                  });
                                  setEditingMemoId(event.id);
                                  setMemoText(event.memo || '');
                                }}
                                disabled={isApproved}
                                className={`flex-shrink-0 ${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                                title={isApproved ? 'Cannot edit - Already approved' : 'Edit memo'}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  console.log('🔷 Time Edit Button: Starting time edit', { 
                                    eventId: event.id, 
                                    timestamp: event.timestamp 
                                  });
                                  const date = new Date(Number(event.timestamp) * 1000);
                                  const year = String(date.getFullYear());
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  console.log('🔷 Time Edit Button: Parsed date and time', { 
                                    year, month, day, hours, minutes, eventType: event.eventType 
                                  });
                                  setEditingTimeId(event.id);
                                  setTimeEditData({ year, month, day, hours, minutes, eventType: event.eventType, reason: '' });
                                }}
                                disabled={isApproved}
                                className={`${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                                title={isApproved ? 'Cannot edit - Already approved' : 'Edit time'}
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  console.log('🔷 Delete Button: Delete clicked', { eventId: event.id });
                                  if (window.confirm('Delete this event?')) {
                                    console.log('🔷 Delete Button: Deletion confirmed', { eventId: event.id });
                                    try {
                                      const response = await fetch(`/api/timer-events/${event.id}`, {
                                        method: 'DELETE',
                                      });
                                      
                                      if (!response.ok) {
                                        const error = await response.json();
                                        throw new Error(error.error || 'Failed to delete event');
                                      }
                                      
                                      const result = await response.json();
                                      console.log('🔷 Delete Button: API response', { result });
                                      
                                      alert('Event deleted successfully');
                                      window.location.reload();
                                      
                                      console.log('🔷 Delete Button: Deletion completed successfully');
                                    } catch (error) {
                                      console.error('🔷 Delete Button: Error deleting event', error);
                                      alert(`Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                  } else {
                                    console.log('🔷 Delete Button: Deletion cancelled');
                                  }
                                }}
                                disabled={isApproved}
                                className={`${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                                title={isApproved ? 'Cannot delete - Already approved' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-sm">
                    No timer event history for this date
                  </p>
                </div>
              )}
              
              {/* Approval Status Notice */}
              {isApproved && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ✓ This attendance has been approved by an administrator. Editing and deletion are not allowed.
                  </p>
                </div>
              )}

              {/* Create New Event Button */}
              {!isApproved && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                    console.log('🔷 Create Event Button: Opening create event modal');
                    const attendanceDate = new Date(attendance.date);
                    
                    // Get the last event timestamp if exists
                    let defaultHours = '00';
                    let defaultMinutes = '00';
                    let defaultEventType: 'WORK' | 'REST' | 'END' = 'WORK';
                    
                    if (timerEvents && timerEvents.length > 0) {
                      // Get the last event
                      const lastEvent = timerEvents[timerEvents.length - 1];
                      // Add 1 minute (60 seconds) to the last event timestamp
                      const lastTimestamp = Number(lastEvent.timestamp);
                      const nextTimestamp = lastTimestamp + 60; // +1 minute
                      const nextDate = new Date(nextTimestamp * 1000);
                      
                      defaultHours = String(nextDate.getHours()).padStart(2, '0');
                      defaultMinutes = String(nextDate.getMinutes()).padStart(2, '0');
                      
                      // Set default event type based on last event
                      if (lastEvent.eventType === 'WORK') {
                        defaultEventType = 'REST';
                      } else if (lastEvent.eventType === 'REST') {
                        defaultEventType = 'WORK';
                      } else {
                        defaultEventType = 'END';
                      }
                      
                      console.log('🔷 Create Event Button: Default time from last event', {
                        lastTimestamp,
                        nextTimestamp,
                        defaultHours,
                        defaultMinutes,
                        defaultEventType
                      });
                    }
                    
                    setCreateEventData({
                      year: String(attendanceDate.getFullYear()),
                      month: String(attendanceDate.getMonth() + 1).padStart(2, '0'),
                      day: String(attendanceDate.getDate()).padStart(2, '0'),
                      hours: defaultHours,
                      minutes: defaultMinutes,
                      eventType: defaultEventType,
                      memo: ''
                    });
                    setIsCreatingEvent(true);
                  }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create New Event</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {onSave && (
                  <button
                    onClick={isApproved ? undefined : handleEdit}
                    disabled={isApproved}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isApproved
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={isApproved ? 'Cannot edit - Already approved' : ''}
                  >
                    {isApproved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Approved</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        {isCreatingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Create New Event</h3>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  Attendance Date: <span className="font-mono font-semibold">
                    {formatDate(attendance.date)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={createEventData.year}
                    onChange={(e) => setCreateEventData({ ...createEventData, year: e.target.value })}
                    placeholder="Year"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-lg font-bold">/</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={createEventData.month}
                    onChange={(e) => setCreateEventData({ ...createEventData, month: e.target.value.padStart(2, '0') })}
                    placeholder="Month"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-lg font-bold">/</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={createEventData.day}
                    onChange={(e) => setCreateEventData({ ...createEventData, day: e.target.value.padStart(2, '0') })}
                    placeholder="Day"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={createEventData.hours}
                    onChange={(e) => setCreateEventData({ ...createEventData, hours: e.target.value.padStart(2, '0') })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-2xl font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={createEventData.minutes}
                    onChange={(e) => setCreateEventData({ ...createEventData, minutes: e.target.value.padStart(2, '0') })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  value={createEventData.eventType}
                  onChange={(e) => setCreateEventData({ ...createEventData, eventType: e.target.value as 'WORK' | 'REST' | 'END' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="WORK">WORK (Start Work)</option>
                  <option value="REST">REST (Start Break)</option>
                  <option value="END">END (End Work)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memo (Optional)
                </label>
                <textarea
                  value={createEventData.memo}
                  onChange={(e) => setCreateEventData({ ...createEventData, memo: e.target.value })}
                  placeholder="Enter memo about the event..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    console.log('🔷 Create Event Modal: Cancel clicked');
                    setIsCreatingEvent(false);
                    setCreateEventData({
                      year: '',
                      month: '',
                      day: '',
                      hours: '00',
                      minutes: '00',
                      eventType: 'WORK',
                      memo: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    console.log('🔷 Create Event Modal: Submit clicked', { createEventData });
                    
                    try {
                      // Convert year, month, day, hours and minutes to Unix timestamp
                      const eventDate = new Date(
                        parseInt(createEventData.year),
                        parseInt(createEventData.month) - 1, // Month is 0-indexed
                        parseInt(createEventData.day),
                        parseInt(createEventData.hours),
                        parseInt(createEventData.minutes),
                        0,
                        0
                      );
                      const timestamp = Math.floor(eventDate.getTime() / 1000);
                      
                      console.log('🔷 Create Event Modal: Calculated timestamp', { 
                        year: createEventData.year,
                        month: createEventData.month,
                        day: createEventData.day,
                        hours: createEventData.hours,
                        minutes: createEventData.minutes,
                        timestamp,
                        date: new Date(timestamp * 1000).toISOString()
                      });
                      
                      // Call the create event API
                      const response = await fetch('/api/timer-events', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          attendanceId: attendance.id,
                          eventType: createEventData.eventType,
                          timestamp,
                          memo: createEventData.memo.trim() || null,
                        }),
                      });
                      
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to create event');
                      }
                      
                      const result = await response.json();
                      console.log('🔷 Create Event Modal: API response', { result });
                      
                      // Close modal
                      setIsCreatingEvent(false);
                      setCreateEventData({
                        year: '',
                        month: '',
                        day: '',
                        hours: '00',
                        minutes: '00',
                        eventType: 'WORK',
                        memo: ''
                      });
                      
                      // Refresh the page
                      alert('Event created successfully');
                      window.location.reload();
                      
                      console.log('🔷 Create Event Modal: Event creation completed successfully');
                    } catch (error) {
                      console.error('🔷 Create Event Modal: Error creating event', error);
                      alert(`Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Edit Modal */}
        {editingTimeId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Correct Time Record</h3>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg space-y-2">
                <p className="text-sm text-yellow-800">
                  Current Date: <span className="font-mono font-semibold">
                    {formatEventDate(timerEvents.find(e => e.id === editingTimeId)?.timestamp || '0')}
                  </span>
                </p>
                <p className="text-sm text-yellow-800">
                  Current Time: <span className="font-mono font-semibold">
                    {formatTimestamp(timerEvents.find(e => e.id === editingTimeId)?.timestamp || '0')}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={timeEditData.year}
                    onChange={(e) => setTimeEditData({ ...timeEditData, year: e.target.value })}
                    placeholder="Year"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-lg font-bold">/</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={timeEditData.month}
                    onChange={(e) => setTimeEditData({ ...timeEditData, month: e.target.value.padStart(2, '0') })}
                    placeholder="Month"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-lg font-bold">/</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={timeEditData.day}
                    onChange={(e) => setTimeEditData({ ...timeEditData, day: e.target.value.padStart(2, '0') })}
                    placeholder="Day"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={timeEditData.hours}
                    onChange={(e) => setTimeEditData({ ...timeEditData, hours: e.target.value.padStart(2, '0') })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-2xl font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timeEditData.minutes}
                    onChange={(e) => setTimeEditData({ ...timeEditData, minutes: e.target.value.padStart(2, '0') })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={timeEditData.eventType}
                  onChange={(e) => setTimeEditData({ ...timeEditData, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="WORK">WORK</option>
                  <option value="REST">REST</option>
                  <option value="END">END</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Correction (Optional)
                </label>
                <textarea
                  value={timeEditData.reason}
                  onChange={(e) => setTimeEditData({ ...timeEditData, reason: e.target.value })}
                  placeholder="Enter reason for correction (optional)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    console.log('🔷 Time Edit Modal: Cancel clicked');
                    setEditingTimeId(null);
                    setTimeEditData({ year: '', month: '', day: '', hours: '00', minutes: '00', eventType: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    console.log('🔷 Time Edit Modal: Submit clicked', { 
                      editingTimeId, 
                      timeEditData 
                    });
                    
                    try {
                      // Find the event being edited and check if it's the first event
                      const eventIndex = timerEvents.findIndex(e => e.id === editingTimeId);
                      const isFirstEvent = eventIndex === 0;
                      
                      console.log('🔷 Time Edit Modal: Event position check', { 
                        eventIndex, 
                        isFirstEvent,
                        totalEvents: timerEvents.length 
                      });
                      
                      // Convert year, month, day, hours and minutes to Unix timestamp
                      const eventDate = new Date(
                        parseInt(timeEditData.year),
                        parseInt(timeEditData.month) - 1, // Month is 0-indexed
                        parseInt(timeEditData.day),
                        parseInt(timeEditData.hours),
                        parseInt(timeEditData.minutes),
                        0,
                        0
                      );
                      const newTimestamp = Math.floor(eventDate.getTime() / 1000);
                      
                      console.log('🔷 Time Edit Modal: Calculated new timestamp', { 
                        year: timeEditData.year,
                        month: timeEditData.month,
                        day: timeEditData.day,
                        hours: timeEditData.hours,
                        minutes: timeEditData.minutes,
                        newTimestamp,
                        newDate: new Date(newTimestamp * 1000).toISOString()
                      });
                      
                      // Call the time correction API
                      const response = await fetch(`/api/timer-events/${editingTimeId}/correct-time`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          newTimestamp,
                          newEventType: timeEditData.eventType,
                          reason: timeEditData.reason.trim() || 'No reason provided',
                        }),
                      });
                      
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to correct time');
                      }
                      
                      const result = await response.json();
                      console.log('🔷 Time Edit Modal: API response', { result });
                      
                      // Close modal
                      setEditingTimeId(null);
                      setTimeEditData({ year: '', month: '', day: '', hours: '00', minutes: '00', eventType: '', reason: '' });
                      
                      // Refresh the page or notify parent to reload data
                      alert('Time correction completed successfully');
                      window.location.reload();
                      
                      console.log('🔷 Time Edit Modal: Time correction completed successfully');
                    } catch (error) {
                      console.error('🔷 Time Edit Modal: Error submitting time correction', error);
                      alert(`Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Correct
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
