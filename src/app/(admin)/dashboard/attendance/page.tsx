'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Calendar, List, Download, Plus, Edit, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceForm } from '@/components/attendance/AttendanceForm';
import { TimerEventModal } from '@/components/attendance/TimerEventModal';
import { MonthPicker } from '@/components/attendance/MonthPicker';

// Types
type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes: number;
  workMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  notes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
};

type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
};

const fetcher = (url: string) => {
  console.log('🌐 [ATTENDANCE PAGE] Fetcher called with URL:', url);
  return fetch(url)
    .then((res) => {
      console.log('📡 [ATTENDANCE PAGE] Response status:', res.status, res.statusText);
      return res.json();
    })
    .then((data) => {
      console.log('📥 [ATTENDANCE PAGE] Fetcher received data:', {
        hasData: !!data.data,
        recordCount: data.data?.length || 0,
        hasPagination: !!data.pagination
      });
      return data;
    });
};

export default function AttendancePage() {
  console.log('🚀 [ATTENDANCE PAGE] Component rendering');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceRecord | null>(null);
  
  // Timer Event Modal states
  const [isTimerEventModalOpen, setIsTimerEventModalOpen] = useState(false);
  const [selectedAttendanceForTimer, setSelectedAttendanceForTimer] = useState<AttendanceRecord | null>(null);
  
  // Month picker state for calendar view
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Date range filter states
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build query string
  const queryString = useMemo(() => {
    console.log('🔧 [ATTENDANCE PAGE] Building query string');
    let startDate: string;
    let endDate: string;
    
    if (useCustomDateRange && startDateFilter && endDateFilter) {
      startDate = startDateFilter;
      endDate = endDateFilter;
      console.log('📅 [ATTENDANCE PAGE] Using custom date range:', { startDate, endDate });
    } else {
      startDate = new Date(year, month, 1).toISOString().split('T')[0];
      endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      console.log('📅 [ATTENDANCE PAGE] Using month range:', { year, month, startDate, endDate });
    }
    
    const params = new URLSearchParams({
      startDate,
      endDate,
      limit: '1000',
    });
    
    if (selectedEmployeeId) {
      params.set('employeeId', selectedEmployeeId);
      console.log('👤 [ATTENDANCE PAGE] Filtering by employee:', selectedEmployeeId);
    }
    
    const queryStr = params.toString();
    console.log('🔗 [ATTENDANCE PAGE] Final query string:', queryStr);
    return queryStr;
  }, [year, month, selectedEmployeeId, useCustomDateRange, startDateFilter, endDateFilter]);

  // Fetch attendance data
  const { data: attendanceData, error: attendanceError, isLoading: attendanceLoading, mutate } = useSWR<{
    data: AttendanceRecord[];
  }>(`/api/attendance?${queryString}`, fetcher, {
    onSuccess: (data) => {
      console.log('✅ [ATTENDANCE PAGE] SWR onSuccess - Data received:', {
        recordCount: data?.data?.length || 0,
        firstRecord: data?.data?.[0] || null
      });
    },
    onError: (error) => {
      console.error('❌ [ATTENDANCE PAGE] SWR onError:', error);
    }
  });

  console.log('🎯 [ATTENDANCE PAGE] Current state:', {
    queryString,
    isLoading: attendanceLoading,
    hasError: !!attendanceError,
    dataExists: !!attendanceData,
    recordCount: attendanceData?.data?.length || 0
  });

  // Fetch employees for filter
  const { data: employeesData } = useSWR<{ data: Employee[] }>(
    '/api/employees?limit=1000&isActive=true',
    fetcher
  );

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (date: string) => {
    const attendance = attendanceData?.data?.find(
      (record) => record.date.split('T')[0] === date && 
      (!selectedEmployeeId || record.employeeId === selectedEmployeeId)
    );

    if (attendance) {
      setSelectedAttendance(attendance);
      setSelectedDate(date);
      setIsFormOpen(true);
    } else {
      setSelectedDate(date);
      setSelectedAttendance(null);
      setIsFormOpen(true);
    }
  };

  const handleAddAttendance = (date: string) => {
    setSelectedDate(date);
    setSelectedAttendance(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: {
    id?: string;
    date: string;
    checkIn: string;
    checkOut: string;
    breakMinutes: number;
    notes: string;
    status: 'present' | 'absent' | 'leave' | 'holiday';
  }) => {
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `/api/attendance/${formData.id}` : '/api/attendance';
      
      // Prepare the request body
      const employeeId = selectedEmployeeId || selectedAttendance?.employeeId;
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      const body: {
        employeeId: string;
        date: string;
        status: string;
        notes: string | null;
        checkIn?: string;
        checkOut?: string;
        breakMinutes?: number;
      } = {
        employeeId,
        date: formData.date,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (formData.status === 'present') {
        body.checkIn = formData.checkIn;
        body.checkOut = formData.checkOut;
        body.breakMinutes = formData.breakMinutes;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save attendance');
      }

      await mutate();
      setIsFormOpen(false);
      setSelectedAttendance(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(error instanceof Error ? error.message : 'Failed to save attendance');
      throw error;
    }
  };

  const handleDeleteClick = (attendance: AttendanceRecord) => {
    setAttendanceToDelete(attendance);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!attendanceToDelete) return;

    try {
      const response = await fetch(`/api/attendance/${attendanceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete attendance');

      await mutate();
      setIsDeleteDialogOpen(false);
      setAttendanceToDelete(null);
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Failed to delete attendance');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0],
      });
      
      if (selectedEmployeeId) {
        params.set('employeeId', selectedEmployeeId);
      }

      const response = await fetch(`/api/attendance/report?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${year}_${String(month + 1).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export attendance report');
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const formatWorkHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      leave: 'bg-yellow-100 text-yellow-800',
      holiday: 'bg-blue-100 text-blue-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    console.log('📊 [ATTENDANCE PAGE] Calculating summary statistics');
    if (!attendanceData?.data) {
      console.log('⚠️ [ATTENDANCE PAGE] No attendance data for summary');
      return { present: 0, absent: 0, leave: 0, holiday: 0, totalHours: 0 };
    }
    
    const result = attendanceData.data.reduce(
      (acc, record) => {
        acc[record.status]++;
        if (record.status === 'present') {
          acc.totalHours += record.workMinutes;
        }
        return acc;
      },
      { present: 0, absent: 0, leave: 0, holiday: 0, totalHours: 0 }
    );
    
    console.log('📊 [ATTENDANCE PAGE] Summary calculated:', result);
    return result;
  }, [attendanceData]);

  // Paginated data for list view
  const paginatedData = useMemo(() => {
    console.log('📄 [ATTENDANCE PAGE] Calculating paginated data');
    if (!attendanceData?.data) {
      console.log('⚠️ [ATTENDANCE PAGE] No data to paginate');
      return [];
    }
    
    const data = [...attendanceData.data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const result = data.slice(startIndex, endIndex);
    
    console.log('📄 [ATTENDANCE PAGE] Paginated data:', {
      totalRecords: attendanceData.data.length,
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      paginatedCount: result.length,
      firstRecord: result[0] || null
    });
    
    return result;
  }, [attendanceData, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!attendanceData?.data) return 0;
    return Math.ceil(attendanceData.data.length / itemsPerPage);
  }, [attendanceData, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Handle date range filter
  const handleApplyDateRange = () => {
    if (startDateFilter && endDateFilter) {
      if (new Date(startDateFilter) > new Date(endDateFilter)) {
        alert('Start date must be before end date');
        return;
      }
      setUseCustomDateRange(true);
      setCurrentPage(1);
    }
  };

  const handleClearDateRange = () => {
    setStartDateFilter('');
    setEndDateFilter('');
    setUseCustomDateRange(false);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
          {selectedEmployeeId && (
            <button
              onClick={() => handleAddAttendance(new Date().toISOString().split('T')[0])}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Employees</option>
              {employeesData?.data.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quick Stats
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded">
                <span className="text-gray-600">Present:</span>
                <span className="font-bold ml-1">{summary.present}</span>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <span className="text-gray-600">Absent:</span>
                <span className="font-bold ml-1">{summary.absent}</span>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <span className="text-gray-600">Leave:</span>
                <span className="font-bold ml-1">{summary.leave}</span>
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <span className="text-gray-600">Hours:</span>
                <span className="font-bold ml-1">{formatWorkHours(summary.totalHours)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        {viewMode === 'list' && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range Filter
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleApplyDateRange}
                disabled={!startDateFilter || !endDateFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
              {useCustomDateRange && (
                <button
                  onClick={handleClearDateRange}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
              {!useCustomDateRange && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handlePreviousMonth();
                      handleFilterChange();
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ← Prev Month
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(year, month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </span>
                  <button
                    onClick={() => {
                      handleNextMonth();
                      handleFilterChange();
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Next Month →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
        (() => {
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
          (attendanceData?.data || []).forEach((record) => {
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

          const getStatusBadgeText = (status: AttendanceRecord['status']) => {
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

          const formatTimeShort = (time: string | null) => {
            if (!time) return '--:--';
            const date = new Date(time);
            return date.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
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

              {/* Month Picker Modal */}
              <MonthPicker
                currentYear={year}
                currentMonth={month}
                onMonthSelect={(selectedYear, selectedMonth) => {
                  const monthDiff = (selectedYear - year) * 12 + (selectedMonth - month);
                  if (monthDiff < 0) {
                    for (let i = 0; i < Math.abs(monthDiff); i++) {
                      handlePreviousMonth();
                    }
                  } else if (monthDiff > 0) {
                    for (let i = 0; i < monthDiff; i++) {
                      handleNextMonth();
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
                              {getStatusBadgeText(attendance.status)}
                            </span>
                          )}
                          {!attendance && !isFuture && selectedEmployeeId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddAttendance(dateStr);
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
                              <span className="font-medium">{formatTimeShort(attendance.checkIn)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Out:</span>
                              <span className={`font-medium ${!attendance.checkOut ? 'text-blue-600' : ''}`}>
                                {attendance.checkOut ? formatTimeShort(attendance.checkOut) : 'In Progress'}
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
        })()
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {!selectedEmployeeId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={selectedEmployeeId ? 7 : 8} className="px-6 py-12 text-center">
                      <p className="text-gray-500">No attendance records found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      {!selectedEmployeeId && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.employee.employeeCode} - {record.employee.firstName}{' '}
                          {record.employee.lastName}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.checkIn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.checkOut)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.status === 'present' ? formatWorkHours(record.workMinutes) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {record.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedAttendanceForTimer(record);
                              setIsTimerEventModalOpen(true);
                            }}
                            className="p-1 hover:bg-blue-50 rounded"
                            title="View Timer Events"
                          >
                            <Clock className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAttendance(record);
                              setIsFormOpen(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record)}
                            className="p-1 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {viewMode === 'list' && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, attendanceData?.data.length || 0)}
                </span>{' '}
                of <span className="font-medium">{attendanceData?.data.length || 0}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Form Dialog */}
      {isFormOpen && (
        <AttendanceForm
          employeeId={selectedEmployeeId || selectedAttendance?.employeeId || ''}
          initialData={
            selectedAttendance
              ? {
                  id: selectedAttendance.id,
                  date: selectedAttendance.date.split('T')[0],
                  checkIn: selectedAttendance.checkIn || '',
                  checkOut: selectedAttendance.checkOut || '',
                  breakMinutes: selectedAttendance.breakMinutes,
                  notes: selectedAttendance.notes || '',
                  status: selectedAttendance.status,
                }
              : selectedDate
              ? { date: selectedDate }
              : undefined
          }
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedAttendance(null);
            setSelectedDate(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && attendanceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Attendance Record
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the attendance record for{' '}
              <span className="font-medium">
                {attendanceToDelete.employee.firstName} {attendanceToDelete.employee.lastName}
              </span>{' '}
              on{' '}
              <span className="font-medium">
                {new Date(attendanceToDelete.date).toLocaleDateString()}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setAttendanceToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Event Modal */}
      {isTimerEventModalOpen && selectedAttendanceForTimer && (
        <TimerEventModal
          attendanceId={selectedAttendanceForTimer.id}
          employeeName={`${selectedAttendanceForTimer.employee.firstName} ${selectedAttendanceForTimer.employee.lastName}`}
          date={selectedAttendanceForTimer.date}
          onClose={() => {
            setIsTimerEventModalOpen(false);
            setSelectedAttendanceForTimer(null);
          }}
        />
      )}
    </div>
  );
}
