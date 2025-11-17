'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MonthPicker } from './MonthPicker';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes: number;
  workMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  notes: string | null;
}

interface AttendanceCalendarProps {
  year: number;
  month: number;
  attendanceData: AttendanceRecord[];
  onDateClick: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onAddAttendance?: (date: string) => void;
}

export function AttendanceCalendar({
  year,
  month,
  attendanceData,
  onDateClick,
  onPreviousMonth,
  onNextMonth,
  onAddAttendance,
}: AttendanceCalendarProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Create a map for quick lookup
  const attendanceMap = new Map<string, AttendanceRecord>();
  attendanceData.forEach((record) => {
    // Date is already in YYYY-MM-DD format
    attendanceMap.set(record.date, record);
  });

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

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'absent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'leave':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'holiday':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'P';
      case 'absent':
        return 'A';
      case 'leave':
        return 'L';
      case 'holiday':
        return 'H';
      default:
        return '';
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatWorkHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setIsMonthPickerOpen(true)}
          className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {monthNames[month]} {year}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Month Picker Modal */}
      <MonthPicker
        currentYear={year}
        currentMonth={month}
        onMonthSelect={(selectedYear, selectedMonth) => {
          const monthDiff = (selectedYear - year) * 12 + (selectedMonth - month);
          if (monthDiff < 0) {
            for (let i = 0; i < Math.abs(monthDiff); i++) {
              onPreviousMonth();
            }
          } else if (monthDiff > 0) {
            for (let i = 0; i < monthDiff; i++) {
              onNextMonth();
            }
          }
        }}
        onClose={() => setIsMonthPickerOpen(false)}
        isOpen={isMonthPickerOpen}
      />

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
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const attendance = attendanceMap.get(dateStr);
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
                onClick={() => onDateClick(dateStr)}
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
                      {getStatusBadge(attendance.status)}
                    </span>
                  )}
                  {!attendance && !isFuture && onAddAttendance && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAttendance(dateStr);
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
                    <div className="pt-1 border-t border-current border-opacity-20">
                      <span className={`font-semibold ${!attendance.checkOut ? 'text-blue-600' : ''}`}>
                        {formatWorkHours(attendance.workMinutes)}
                      </span>
                    </div>
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
        </div>
      </div>
    </div>
  );
}
