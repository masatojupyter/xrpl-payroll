'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, FileText, Edit2, Check, AlertCircle, RotateCcw, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimerEvent {
  id: string;
  eventType: 'WORK' | 'REST' | 'END';
  timestamp: string;
  durationFromNext: number | null;
  endTimestamp: string | null;
  memo: string | null;
}

interface AttendanceRecord {
  id: string;
  status: string;
  totalWorkMinutes: number;
  approvalStatus?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export default function AttendanceTimerPanel() {
  const [events, setEvents] = useState<TimerEvent[]>([]);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [previewMemoId, setPreviewMemoId] = useState<string | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [timeEditData, setTimeEditData] = useState({ hours: '00', minutes: '00', eventType: '', reason: '' });
  const [canCancelEnd, setCanCancelEnd] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  
  const memoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);

  // Fetch timer events for selected date
  const fetchEvents = useCallback(async () => {
    try {
      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('🔍 [DEBUG] Fetching events for date:', dateStr);
      
      const response = await fetch(`/api/timer-events?date=${dateStr}`);
      const data = await response.json();
      
      console.log('🔍 [DEBUG] API Response:', {
        success: data.success,
        hasRecord: !!data.record,
        record: data.record,
        eventsCount: data.events?.length || 0
      });
      
      if (data.success) {
        setEvents(data.events || []);
        setRecord(data.record);
        setError(null);
        
        // Check approval status
        console.log('🔍 [DEBUG] Checking approval status:', {
          hasRecord: !!data.record,
          approvalStatus: data.record?.approvalStatus,
          recordObject: data.record
        });
        
        const approved = data.record?.approvalStatus === 'APPROVED';
        console.log('🔍 [DEBUG] Approval check result:', {
          approved,
          comparison: `${data.record?.approvalStatus} === 'APPROVED'`
        });
        
        setIsApproved(approved);
        console.log('🔍 [DEBUG] Set isApproved to:', approved);
        
        // Check if can cancel END (not if approved)
        if (data.events && data.events.length > 0 && !approved) {
          const lastEvent = data.events[data.events.length - 1];
          if (lastEvent.eventType === 'END') {
            setCanCancelEnd(true);
          } else {
            setCanCancelEnd(false);
          }
        } else {
          setCanCancelEnd(false);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load data');
    }
  }, [selectedDate]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initial load and reload when date changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle date navigation
  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0, 0, 0, 0);
    
    // Don't allow future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate.getTime() <= today.getTime()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  };

  const isFutureDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected > today;
  };

  // Auto-scroll history panel to bottom when new event is added
  useEffect(() => {
    if (historyPanelRef.current) {
      historyPanelRef.current.scrollTop = historyPanelRef.current.scrollHeight;
    }
  }, [events.length]);

  // Handle button click (WORK, REST, END)
  const handleButtonClick = async (eventType: 'WORK' | 'REST' | 'END') => {
    if (eventType === 'END') {
      const confirmed = window.confirm('Clock out? This action will be recorded.');
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/timer-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel END
  const handleCancelEnd = async () => {
    const confirmed = window.confirm('Cancel clock out? (Limited to 3 times per day)');
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/timer-events/cancel-end', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
      } else {
        setError(data.error || 'Failed to cancel clock out');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Save memo with debounce
  const saveMemo = useCallback(async (eventId: string, memo: string) => {
    setMemoSaving(true);
    setMemoSaved(false);

    try {
      const response = await fetch(`/api/timer-events/${eventId}/memo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });

      const data = await response.json();

      if (data.success) {
        setEvents(prevEvents =>
          prevEvents.map(e =>
            e.id === eventId ? { ...e, memo } : e
          )
        );
        setMemoSaved(true);
        setTimeout(() => setMemoSaved(false), 2000);
      } else {
        setError(data.error || 'Failed to save memo');
      }
    } catch (err) {
      console.error('Error saving memo:', err);
      setError('Error occurred while saving memo');
    } finally {
      setMemoSaving(false);
    }
  }, []);

  // Handle memo change with debounce
  const handleMemoChange = (eventId: string, value: string) => {
    setMemoText(value);

    if (memoTimeoutRef.current) {
      clearTimeout(memoTimeoutRef.current);
    }

    memoTimeoutRef.current = setTimeout(() => {
      saveMemo(eventId, value);
    }, 1000);
  };

  // Handle Ctrl+Enter for immediate save
  const handleMemoKeyDown = (e: React.KeyboardEvent, eventId: string) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      
      if (memoTimeoutRef.current) {
        clearTimeout(memoTimeoutRef.current);
      }
      
      saveMemo(eventId, memoText);
    }
  };

  // Open memo editor
  const openMemoEditor = (event: TimerEvent) => {
    setEditingMemoId(event.id);
    setMemoText(event.memo || '');
    setPreviewMemoId(null);
  };

  // Close memo editor
  const closeMemoEditor = () => {
    if (memoTimeoutRef.current) {
      clearTimeout(memoTimeoutRef.current);
      if (editingMemoId) {
        saveMemo(editingMemoId, memoText);
      }
    }
    
    setEditingMemoId(null);
    setMemoText('');
  };

  // Open time editor
  const openTimeEditor = (event: TimerEvent) => {
    const date = new Date(Number(event.timestamp) * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    setEditingTimeId(event.id);
    setTimeEditData({ hours, minutes, eventType: event.eventType, reason: '' });
  };

  // Close time editor
  const closeTimeEditor = () => {
    setEditingTimeId(null);
    setTimeEditData({ hours: '00', minutes: '00', eventType: '', reason: '' });
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm('Delete this timestamp? This action will be recorded.');
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/timer-events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
        alert('Timestamp deleted');
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Submit time correction
  const submitTimeCorrection = async () => {
    if (!editingTimeId) return;

    if (!timeEditData.reason.trim()) {
      setError('Please enter a reason for correction');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const event = events.find(e => e.id === editingTimeId);
      if (!event) return;

      const originalDate = new Date(Number(event.timestamp) * 1000);
      originalDate.setHours(parseInt(timeEditData.hours), parseInt(timeEditData.minutes), 0, 0);
      const newTimestamp = Math.floor(originalDate.getTime() / 1000);

      const response = await fetch(`/api/timer-events/${editingTimeId}/correct-time`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTimestamp: newTimestamp.toString(),
          newEventType: timeEditData.eventType,
          reason: timeEditData.reason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        closeTimeEditor();
        await fetchEvents();
        alert('Time corrected');
      } else {
        setError(data.error || 'Failed to correct time');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Calculate elapsed time from last event
  const getElapsedTime = (): number => {
    if (events.length === 0) return 0;
    
    const lastEvent = events[events.length - 1];
    const lastTimestamp = Number(lastEvent.timestamp);
    
    // Only show real-time elapsed time for today
    if (!isToday()) {
      return 0; // Don't show elapsed time for past dates
    }
    
    const now = Math.floor(Date.now() / 1000);
    return now - lastTimestamp;
  };

  // Calculate total work time and break time
  const calculateTimes = () => {
    let totalWorkSeconds = 0;
    let totalBreakSeconds = 0;
    let lastWorkStart: number | null = null;
    let lastBreakStart: number | null = null;

    for (const event of events) {
      const timestamp = Number(event.timestamp);
      
      if (event.eventType === 'WORK') {
        if (lastBreakStart !== null) {
          totalBreakSeconds += timestamp - lastBreakStart;
          lastBreakStart = null;
        }
        // 連続WORKの場合、最初のWORK開始時刻を保持
        if (lastWorkStart === null) {
          lastWorkStart = timestamp;
        }
      } else if (event.eventType === 'REST') {
        if (lastWorkStart !== null) {
          totalWorkSeconds += timestamp - lastWorkStart;
          lastWorkStart = null;
        }
        // 連続RESTの場合、最初のREST開始時刻を保持
        if (lastBreakStart === null) {
          lastBreakStart = timestamp;
        }
      } else if (event.eventType === 'END') {
        if (lastWorkStart !== null) {
          totalWorkSeconds += timestamp - lastWorkStart;
          lastWorkStart = null;
        }
        if (lastBreakStart !== null) {
          totalBreakSeconds += timestamp - lastBreakStart;
          lastBreakStart = null;
        }
      }
    }

    // Only add current time for today's ongoing work/break
    if (isToday()) {
      const now = Math.floor(Date.now() / 1000);
      if (lastWorkStart !== null) {
        totalWorkSeconds += now - lastWorkStart;
      }
      if (lastBreakStart !== null) {
        totalBreakSeconds += now - lastBreakStart;
      }
    }

    return { totalWorkSeconds, totalBreakSeconds };
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Determine button states
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const isWorkEnabled = !lastEvent || lastEvent.eventType !== 'END';
  const isRestEnabled = lastEvent?.eventType === 'WORK';
  const isEndEnabled = lastEvent && lastEvent.eventType !== 'END';

  const { totalWorkSeconds, totalBreakSeconds } = calculateTimes();
  const elapsedSeconds = getElapsedTime();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Timer</h2>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handlePreviousDay}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <p className="text-sm text-gray-500 min-w-[200px] text-center">
              {selectedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
              {isToday() && <span className="ml-2 text-blue-600 font-semibold">(Today)</span>}
            </p>
            <button
              onClick={handleNextDay}
              disabled={isToday()}
              className={`p-1 rounded-lg transition-colors ${
                isToday() 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Current Time</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 font-mono" suppressHydrationWarning>
            {currentTime.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      </div>

      {/* Timer Display Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-6">
          {/* Current Status */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Current Status</div>
            <div className={`text-4xl font-bold font-mono ${
              !lastEvent ? 'text-gray-600' :
              lastEvent.eventType === 'WORK' ? 'text-green-700' :
              lastEvent.eventType === 'REST' ? 'text-yellow-700' :
              'text-gray-600'
            }`}>
              {!lastEvent ? 'Standby' :
               lastEvent.eventType === 'WORK' ? 'Working' :
               lastEvent.eventType === 'REST' ? 'On Break' :
               'Clocked Out'}
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Elapsed Time Since Last Action</div>
            <div className="text-4xl font-bold text-indigo-900 font-mono">
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/80 p-4 rounded-lg text-center">
            <div className="text-xs text-gray-600 mb-1">Total Work Time</div>
            <div className="text-2xl font-bold text-green-700 font-mono">
              {formatTime(totalWorkSeconds)}
            </div>
          </div>
          <div className="bg-white/80 p-4 rounded-lg text-center">
            <div className="text-xs text-gray-600 mb-1">Total Break Time</div>
            <div className="text-2xl font-bold text-orange-700 font-mono">
              {formatTime(totalBreakSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Status Buttons Panel */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Buttons</h3>
        {!isToday() && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              A past date is selected. Timestamp operations are only available for today.
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleButtonClick('WORK')}
            disabled={!isWorkEnabled || loading || !isToday()}
            className={`py-4 px-6 rounded-lg font-semibold text-white transition-all ${
              isWorkEnabled && !loading && isToday()
                ? 'bg-green-500 hover:bg-green-600 active:scale-95'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="text-lg">Work</div>
            <div className="text-xs mt-1 opacity-90">
              {isWorkEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </button>

          <button
            onClick={() => handleButtonClick('REST')}
            disabled={!isRestEnabled || loading || !isToday()}
            className={`py-4 px-6 rounded-lg font-semibold text-white transition-all ${
              isRestEnabled && !loading && isToday()
                ? 'bg-yellow-500 hover:bg-yellow-600 active:scale-95'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="text-lg">Rest</div>
            <div className="text-xs mt-1 opacity-90">
              {isRestEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </button>

          <button
            onClick={() => handleButtonClick('END')}
            disabled={!isEndEnabled || loading || !isToday()}
            className={`py-4 px-6 rounded-lg font-semibold text-white transition-all ${
              isEndEnabled && !loading && isToday()
                ? 'bg-red-500 hover:bg-red-600 active:scale-95'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="text-lg">End</div>
            <div className="text-xs mt-1 opacity-90">
              {isEndEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </button>
        </div>

        {/* Cancel End Button */}
        {canCancelEnd && isToday() && (
          <div className="mt-4">
            <button
              onClick={handleCancelEnd}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Cancel Clock Out
            </button>
          </div>
        )}

        {/* Approval Status Notice */}
        {isApproved && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ✓ This attendance has been approved by administrator. Editing and deletion are not allowed.
            </p>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📋 About Operation Logs:</span>
          All operations are automatically recorded and can be reviewed by administrators to prevent fraud.
        </p>
      </div>

      {/* History Panel - MOVED TO BOTTOM */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">History Panel</h3>
        <div 
          ref={historyPanelRef}
          className="bg-gray-50 rounded-lg border border-gray-200 max-h-80 overflow-y-auto"
        >
          {events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>{isToday() ? 'No operation history for today' : 'No operation history for this date'}</p>
              {isToday() && <p className="text-sm mt-1">Press Work button to start</p>}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Duration</th>
                  <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600">Memo</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr className="hover:bg-gray-100 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.eventType === 'WORK' ? 'bg-green-100 text-green-800' :
                        event.eventType === 'REST' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {event.durationFromNext !== null 
                        ? formatTime(event.durationFromNext)
                        : '---'
                      }
                    </td>
                      {/* Memo column - hidden on small screens */}
                      <td className="hidden md:table-cell px-4 py-3">
                        <div className="flex items-center gap-2">
                          {editingMemoId === event.id ? (
                            <div className="flex-1 relative">
                              <textarea
                                value={memoText}
                                onChange={(e) => handleMemoChange(event.id, e.target.value)}
                                onKeyDown={(e) => handleMemoKeyDown(e, event.id)}
                                onBlur={closeMemoEditor}
                                autoFocus
                                placeholder="Enter memo (Ctrl+Enter to save)"
                                maxLength={500}
                                className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={2}
                              />
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                  {memoText.length}/500
                                </span>
                                {memoSaving && (
                                  <span className="text-xs text-blue-600">Saving...</span>
                                )}
                                {memoSaved && (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Saved
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                {event.memo ? (
                                  <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap break-words">
                                    {event.memo}
                                  </p>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">No memo</span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  console.log('🔍 [DEBUG] Memo edit button clicked', {
                                    isApproved,
                                    eventId: event.id
                                  });
                                  if (!isApproved) {
                                    openMemoEditor(event);
                                  }
                                }}
                                disabled={isApproved}
                                className={`flex-shrink-0 ${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                                title={isApproved ? 'Cannot edit (approved)' : 'Edit memo'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              console.log('🔍 [DEBUG] Time edit button clicked', {
                                isApproved,
                                eventId: event.id
                              });
                              if (!isApproved) {
                                openTimeEditor(event);
                              }
                            }}
                            disabled={isApproved}
                            className={`${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                            title={isApproved ? 'Cannot edit (approved)' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              console.log('🔍 [DEBUG] Delete button clicked', {
                                isApproved,
                                eventId: event.id
                              });
                              if (!isApproved) {
                                handleDeleteEvent(event.id);
                              }
                            }}
                            disabled={isApproved}
                            className={`${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                            title={isApproved ? 'Cannot delete (approved)' : 'Delete'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Memo row - visible only on small screens */}
                    <tr className="md:hidden bg-gray-50">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-600 flex-shrink-0 mt-1">Memo:</span>
                          <div className="flex-1 min-w-0">
                            {editingMemoId === event.id ? (
                              <div className="relative">
                                <textarea
                                  value={memoText}
                                  onChange={(e) => handleMemoChange(event.id, e.target.value)}
                                  onKeyDown={(e) => handleMemoKeyDown(e, event.id)}
                                  onBlur={closeMemoEditor}
                                  autoFocus
                                  placeholder="Enter memo (Ctrl+Enter to save)"
                                  maxLength={500}
                                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={2}
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500">
                                    {memoText.length}/500
                                  </span>
                                  {memoSaving && (
                                    <span className="text-xs text-blue-600">Saving...</span>
                                  )}
                                  {memoSaved && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Saved
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  {event.memo ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                      {event.memo}
                                    </p>
                                  ) : (
                                    <span className="text-sm text-gray-400 italic">No memo</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => openMemoEditor(event)}
                                  disabled={isApproved}
                                  className={`flex-shrink-0 ${isApproved ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                                  title={isApproved ? 'Cannot edit (approved)' : 'Edit memo'}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Time Edit Modal */}
      {editingTimeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Correct Timestamp</h3>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                Current time: <span className="font-mono font-semibold">
                  {formatTimestamp(events.find(e => e.id === editingTimeId)?.timestamp || '0')}
                </span>
              </p>
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
                Reason for Correction (Required)
              </label>
              <textarea
                value={timeEditData.reason}
                onChange={(e) => setTimeEditData({ ...timeEditData, reason: e.target.value })}
                placeholder="Enter reason for correction..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeTimeEditor}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitTimeCorrection}
                disabled={loading || !timeEditData.reason.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium"
              >
                {loading ? 'Submitting...' : 'Correct'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
