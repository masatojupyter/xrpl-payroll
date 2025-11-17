'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Calendar, List, Download, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AttendanceDetailModal } from '@/components/attendance/AttendanceDetailModal';
import { MonthPicker } from '@/components/attendance/MonthPicker';

// Types
type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  breakMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day';
  createdAt: string;
  updatedAt: string;
};

type TimerEvent = {
  id: string;
  eventType: 'WORK' | 'REST' | 'END';
  timestamp: string;
  endTimestamp: string | null;
  durationFromNext: number | null;
  memo: string | null;
};

type CalendarAttendanceRecord = {
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
};

type AttendanceResponse = {
  success: boolean;
  data: AttendanceRecord[];
  summary: {
    totalRecords: number;
    totalWorkingHours: number;
    totalBreakMinutes: number;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EmployeeAttendancePage() {
  console.log('[EmployeeAttendancePage] Component rendering');
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAttendance, setSelectedAttendance] = useState<CalendarAttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isCalendarMonthPickerOpen, setIsCalendarMonthPickerOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  console.log('[EmployeeAttendancePage] State:', {
    viewMode,
    currentDate,
    year,
    month,
    selectedAttendance,
    isModalOpen,
    isMonthPickerOpen,
    isCalendarMonthPickerOpen
  });

  // Build query string
  const queryString = useMemo(() => {
    console.log('[queryString useMemo] Recalculating query string for:', { year, month });
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    console.log('[queryString useMemo] Date range:', { startDate, endDate });
    
    const params = new URLSearchParams({
      startDate,
      endDate,
      limit: '1000',
    });
    
    const query = params.toString();
    console.log('[queryString useMemo] Generated query string:', query);
    
    return query;
  }, [year, month]);

  // Fetch attendance data
  console.log('[useSWR] Setting up SWR hook with key:', `/api/employee/attendance?${queryString}`);
  
  const { data: attendanceResponse, error: attendanceError, isLoading: attendanceLoading } = useSWR<AttendanceResponse>(
    `/api/employee/attendance?${queryString}`,
    fetcher,
    {
      // Refresh every 30 seconds if there's any data to capture active timers
      refreshInterval: 30000,
      // Revalidate on focus to ensure fresh data
      revalidateOnFocus: true,
      onSuccess: (data) => {
        console.log('[useSWR onSuccess] Attendance data fetched successfully:', data);
      },
      onError: (error) => {
        console.error('[useSWR onError] Failed to fetch attendance data:', error);
      },
    }
  );
  
  console.log('[useSWR] Current state:', {
    isLoading: attendanceLoading,
    hasError: !!attendanceError,
    error: attendanceError,
    dataReceived: !!attendanceResponse,
    recordCount: attendanceResponse?.data?.length || 0
  });

  const handlePreviousMonth = () => {
    console.log('[handlePreviousMonth] Navigating to previous month:', { currentYear: year, currentMonth: month, newMonth: month - 1 });
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    console.log('[handleNextMonth] Navigating to next month:', { currentYear: year, currentMonth: month, newMonth: month + 1 });
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleMonthSelect = (selectedYear: number, selectedMonth: number) => {
    console.log('[handleMonthSelect] Month selected:', { selectedYear, selectedMonth });
    setCurrentDate(new Date(selectedYear, selectedMonth, 1));
  };

  const handleDateClick = async (date: string) => {
    console.log('[handleDateClick] Date clicked:', date);
    
    const attendance = attendanceResponse?.data?.find(
      (record) => record.date === date
    );
    
    console.log('[handleDateClick] Attendance record found:', attendance);

    if (attendance) {
      console.log('[handleDateClick] Processing existing attendance record');
      const workMinutes = calculateWorkMinutes(attendance.checkIn, attendance.checkOut, attendance.breakMinutes);
      console.log('[handleDateClick] Calculated work minutes:', workMinutes);
      
      // Fetch timer events for this attendance record
      let timerEvents = [];
      let approvalStatus = undefined;
      let approvedBy = null;
      let approvedAt = null;
      
      try {
        console.log('[handleDateClick] Fetching timer events for date:', date);
        const response = await fetch(`/api/timer-events?date=${date}`);
        const data = await response.json();
        console.log('[handleDateClick] Timer events response:', data);
        
        if (data.success && data.events) {
          timerEvents = data.events;
          console.log('[handleDateClick] Timer events loaded:', timerEvents.length, 'events');
        }
        
        // Get approval status from the record
        if (data.record) {
          approvalStatus = data.record.approvalStatus;
          approvedBy = data.record.approvedBy;
          approvedAt = data.record.approvedAt;
          console.log('[handleDateClick] Approval info:', { approvalStatus, approvedBy, approvedAt });
        }
      } catch (error) {
        console.error('[handleDateClick] Failed to fetch timer events:', error);
      }
      
      const detailRecord: CalendarAttendanceRecord = {
        id: attendance.id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        breakMinutes: attendance.breakMinutes,
        workMinutes,
        status: attendance.status,
        notes: null,
        timerEvents,
        approvalStatus,
        approvedBy,
        approvedAt,
      };
      
      console.log('[handleDateClick] Detail record created:', detailRecord);
      setSelectedAttendance(detailRecord);
      setIsModalOpen(true);
    } else {
      console.log('[handleDateClick] No attendance record found, creating new empty record');
      // Create a new empty record for dates without attendance
      const newRecord: CalendarAttendanceRecord = {
        id: '', // Empty ID indicates a new record
        date: date,
        checkIn: null,
        checkOut: null,
        breakMinutes: 0,
        workMinutes: 0,
        status: 'present', // Default to present status
        notes: null,
      };
      
      console.log('[handleDateClick] New record created:', newRecord);
      setSelectedAttendance(newRecord);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    console.log('[handleCloseModal] Closing modal');
    setIsModalOpen(false);
    setSelectedAttendance(null);
  };

  const handleSaveAttendance = async (updatedAttendance: CalendarAttendanceRecord) => {
    console.log('[handleSaveAttendance] Saving attendance:', updatedAttendance);
    
    try {
      // Call API to update attendance
      const response = await fetch(`/api/employee/attendance/${updatedAttendance.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updatedAttendance.status,
          notes: updatedAttendance.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[handleSaveAttendance] API error:', errorData);
        alert(`Failed to save attendance: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const result = await response.json();
      console.log('[handleSaveAttendance] Save successful:', result);

      // Refresh the data with SWR's mutate
      const { mutate } = await import('swr');
      await mutate(`/api/employee/attendance?${queryString}`);
      
      console.log('[handleSaveAttendance] Data refreshed');
      
      // Close modal
      handleCloseModal();
      
      // Show success message
      alert('Attendance updated successfully');
    } catch (error) {
      console.error('[handleSaveAttendance] Error:', error);
      alert('Failed to save attendance. Please try again.');
    }
  };

  const handleExport = async () => {
    console.log('[handleExport] Starting export process');
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      console.log('[handleExport] Export date range:', { startDate, endDate });
      
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const url = `/api/attendance/report?${params.toString()}`;
      console.log('[handleExport] Fetching report from:', url);
      
      const response = await fetch(url);
      console.log('[handleExport] Response status:', response.status, response.statusText);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      console.log('[handleExport] Blob size:', blob.size, 'bytes');
      
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename = `my_attendance_${year}_${String(month + 1).padStart(2, '0')}.csv`;
      a.download = filename;
      console.log('[handleExport] Downloading file:', filename);
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      
      console.log('[handleExport] Export completed successfully');
    } catch (error) {
      console.error('[handleExport] Error exporting:', error);
      alert('Failed to export attendance report');
    }
  };

  const formatTime = (time: string | null) => {
    console.log('[formatTime] Formatting time:', time);
    if (!time) return '--:--';
    const date = new Date(time);
    const formatted = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    console.log('[formatTime] Formatted result:', formatted);
    return formatted;
  };

  const formatWorkHours = (minutes: number) => {
    console.log('[formatWorkHours] Formatting minutes:', minutes);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const formatted = `${hours}h ${mins}m`;
    console.log('[formatWorkHours] Formatted result:', formatted);
    return formatted;
  };

  // Calculate simple time difference between checkIn and checkOut (without subtracting breaks)
  const calculateTimeDifference = (checkIn: string | null, checkOut: string | null) => {
    console.log('[calculateTimeDifference] Calculating time difference:', { checkIn, checkOut });
    
    if (!checkIn || !checkOut) {
      console.log('[calculateTimeDifference] Missing checkIn or checkOut time, returning 0');
      return 0;
    }
    
    const endTime = new Date(checkOut).getTime();
    const startTime = new Date(checkIn).getTime();
    const diffMs = endTime - startTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    const result = Math.max(0, diffMinutes);
    console.log('[calculateTimeDifference] Result:', result, 'minutes');
    return result;
  };

  const calculateWorkMinutes = (checkIn: string, checkOut: string | null, breakMinutes: number) => {
    console.log('[calculateWorkMinutes] Calculating work minutes:', { checkIn, checkOut, breakMinutes });
    
    if (!checkOut) {
      console.log('[calculateWorkMinutes] No checkout time, returning 0');
      return 0;
    }
    
    const workMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const workMinutes = Math.floor(workMs / (1000 * 60));
    const result = Math.max(0, workMinutes - breakMinutes);
    console.log('[calculateWorkMinutes] Completed work result:', result, 'minutes');
    return result;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      leave: 'bg-yellow-100 text-yellow-800',
      holiday: 'bg-blue-100 text-blue-800',
      sick_leave: 'bg-orange-100 text-orange-800',
      half_day: 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'leave':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'holiday':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'sick_leave':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case 'half_day':
        return <Clock className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    console.log('[summary useMemo] Recalculating summary statistics');
    
    if (!attendanceResponse?.data) {
      console.log('[summary useMemo] No attendance data available');
      return { present: 0, absent: 0, leave: 0, holiday: 0, sick_leave: 0, half_day: 0, totalHours: 0 };
    }
    
    console.log('[summary useMemo] Processing', attendanceResponse.data.length, 'records');
    
    const result = attendanceResponse.data.reduce(
      (acc, record) => {
        acc[record.status]++;
        if (record.status === 'present') {
          const workMinutes = calculateWorkMinutes(record.checkIn, record.checkOut, record.breakMinutes);
          acc.totalHours += workMinutes;
        }
        return acc;
      },
      { present: 0, absent: 0, leave: 0, holiday: 0, sick_leave: 0, half_day: 0, totalHours: 0 }
    );
    
    console.log('[summary useMemo] Summary calculated:', result);
    return result;
  }, [attendanceResponse]);

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getStatusColor = (status: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day') => {
    switch (status) {
      case 'present':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'absent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'leave':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'holiday':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'sick_leave':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'half_day':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getCalendarStatusBadge = (status: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day') => {
    switch (status) {
      case 'present':
        return 'P';
      case 'absent':
        return 'A';
      case 'leave':
        return 'L';
      case 'holiday':
        return 'H';
      case 'sick_leave':
        return 'S';
      case 'half_day':
        return 'HD';
      default:
        return '';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isFutureDate = (day: number) => {
    const date = new Date(year, month, day);
    return date > today;
  };

  // Generate calendar for current month
  const calendarData = useMemo(() => {
    console.log('[calendarData useMemo] Generating calendar data for:', { year, month });
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    console.log('[calendarData useMemo] Calendar info:', { daysInMonth, firstDay });
    
    // Create a map for quick lookup
    const attendanceMap = new Map<string, CalendarAttendanceRecord>();
    
    const recordCount = attendanceResponse?.data?.length || 0;
    console.log('[calendarData useMemo] Processing', recordCount, 'attendance records');
    
    attendanceResponse?.data?.forEach((record) => {
      const workMinutes = calculateWorkMinutes(record.checkIn, record.checkOut, record.breakMinutes);
      attendanceMap.set(record.date, {
        id: record.id,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        breakMinutes: record.breakMinutes,
        workMinutes,
        status: record.status,
        notes: null,
      });
    });
    
    console.log('[calendarData useMemo] Attendance map size:', attendanceMap.size);

    // Generate calendar days
    const calendarDays: (number | null)[] = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    console.log('[calendarData useMemo] Calendar days generated:', calendarDays.length, 'cells');

    return { calendarDays, attendanceMap };
  }, [year, month, attendanceResponse]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-sm text-gray-600 mt-1">
            View your attendance records and statistics
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Days</span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {attendanceResponse?.summary?.totalRecords || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Present</span>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.present}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Absent</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Leave</span>
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{summary.leave}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            View Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {attendanceLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : attendanceError ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <p className="text-red-600">Failed to load attendance data</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setIsCalendarMonthPickerOpen(true)}
              className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {monthNames[month]} {year}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarData.calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const attendance = calendarData.attendanceMap.get(dateStr);
                const isTodayDate = isToday(day);
                const isFuture = isFutureDate(day);

                return (
                  <div
                    key={day}
                    className={`relative border rounded-lg p-2 min-h-[100px] transition-all cursor-pointer hover:shadow-md ${
                      isTodayDate
                        ? 'ring-2 ring-blue-500'
                        : attendance
                        ? getStatusColor(attendance.status)
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } ${isFuture ? 'opacity-50' : ''}`}
                    onClick={() => handleDateClick(dateStr)}
                  >
                    {/* Day number */}
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isTodayDate
                            ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full'
                            : attendance
                            ? ''
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </span>
                      {attendance && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded">
                          {getCalendarStatusBadge(attendance.status)}
                        </span>
                      )}
                      {!attendance && !isFuture && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateClick(dateStr);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Add attendance"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      )}
                    </div>

                    {/* Attendance details */}
                    {attendance && attendance.status === 'present' && (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">In:</span>
                          <span className="font-medium">{formatTime(attendance.checkIn)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Out:</span>
                          <span className={`font-medium ${!attendance.checkOut ? 'text-blue-600' : ''}`}>
                            {attendance.checkOut ? formatTime(attendance.checkOut) : 'In Progress'}
                          </span>
                        </div>
                        {attendance.checkOut && (
                          <div className="pt-1 border-t border-current border-opacity-20">
                            <span className="font-semibold">
                              {formatWorkHours(calculateTimeDifference(attendance.checkIn, attendance.checkOut))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {attendance && attendance.status !== 'present' && (
                      <div className="text-xs font-medium capitalize mt-1">
                        {attendance.status}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-gray-700">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                <span className="text-gray-600">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                <span className="text-gray-600">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                <span className="text-gray-600">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                <span className="text-gray-600">Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                <span className="text-gray-600">Sick Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
                <span className="text-gray-600">Half Day</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* List View Header with Month/Year Display */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setIsMonthPickerOpen(true)}
              className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {new Date(year, month).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Break
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceResponse?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No attendance records found for this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendanceResponse?.data?.map((record) => {
                    const workMinutes = calculateWorkMinutes(record.checkIn, record.checkOut, record.breakMinutes);
                    return (
                      <tr 
                        key={record.id} 
                        onClick={() => handleDateClick(record.date)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            <span>{new Date(record.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              record.status
                            )}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.status === 'present' ? formatTime(record.checkIn) : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.status === 'present' ? (
                            record.checkOut ? (
                              formatTime(record.checkOut)
                            ) : (
                              <span className="text-blue-600 font-medium">In Progress</span>
                            )
                          ) : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.status === 'present' ? (
                            record.checkOut ? (
                              formatWorkHours(workMinutes)
                            ) : (
                              <span className="text-blue-600 font-medium">-</span>
                            )
                          ) : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.status === 'present' ? formatWorkHours(record.breakMinutes) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Month Picker Modal for Calendar View */}
      <MonthPicker
        currentYear={year}
        currentMonth={month}
        onMonthSelect={handleMonthSelect}
        onClose={() => setIsCalendarMonthPickerOpen(false)}
        isOpen={isCalendarMonthPickerOpen}
      />

      {/* Month Picker Modal for List View */}
      <MonthPicker
        currentYear={year}
        currentMonth={month}
        onMonthSelect={handleMonthSelect}
        onClose={() => setIsMonthPickerOpen(false)}
        isOpen={isMonthPickerOpen}
      />

      {/* Attendance Detail Modal */}
      <AttendanceDetailModal
        attendance={selectedAttendance}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAttendance}
      />
    </div>
  );
}
