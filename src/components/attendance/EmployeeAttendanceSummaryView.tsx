'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  ChevronDown,
  Download,
  Calendar
} from 'lucide-react';

interface EmployeeSummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  position: string;
  department: string;
  stats: {
    attendanceRate: number;
    completedDays: number;
    workingDays: number;
    totalWorkMinutes: number;
    totalWorkHours: string;
    pendingCorrections: number;
  };
}

interface EmployeeAttendanceSummaryViewProps {
  onEmployeeClick?: (userId: string) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EmployeeAttendanceSummaryView({ 
  onEmployeeClick 
}: EmployeeAttendanceSummaryViewProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'attendanceRate' | 'workHours' | 'pendingCorrections'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Build query string
  const queryParams = new URLSearchParams({
    sortBy,
    sortOrder,
    month: selectedMonth,
  });
  if (search) {
    queryParams.set('search', search);
  }

  const { data, error, isLoading } = useSWR(
    `/api/admin/employee-attendance-summary?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getAttendanceRateIcon = (rate: number) => {
    if (rate >= 95) return <TrendingUp className="w-4 h-4" />;
    if (rate >= 70) return <CheckCircle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('CSV export functionality will be implemented');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
        <p>Failed to load employee attendance summary</p>
      </div>
    );
  }

  const summaries: EmployeeSummary[] = data?.summaries || [];
  const period = data?.period;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="社員名・メールで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Month selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy as typeof sortBy);
                setSortOrder(newSortOrder as 'asc' | 'desc');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="name-asc">名前順（昇順）</option>
              <option value="name-desc">名前順（降順）</option>
              <option value="attendanceRate-desc">出勤率が高い順</option>
              <option value="attendanceRate-asc">出勤率が低い順</option>
              <option value="workHours-desc">労働時間が長い順</option>
              <option value="workHours-asc">労働時間が短い順</option>
              <option value="pendingCorrections-desc">承認待ちが多い順</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {/* Period and export */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            期間: {period?.startDate} ～ {period?.endDate} 
            <span className="ml-2">({period?.workingDays}営業日)</span>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総社員数</p>
              <p className="text-2xl font-bold text-gray-900">{summaries.length}</p>
            </div>
            <User className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均出勤率</p>
              <p className="text-2xl font-bold text-green-600">
                {summaries.length > 0
                  ? (summaries.reduce((sum, s) => sum + s.stats.attendanceRate, 0) / summaries.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総労働時間</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaries.reduce((sum, s) => sum + s.stats.totalWorkMinutes, 0) / 60}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">承認待ち</p>
              <p className="text-2xl font-bold text-orange-600">
                {summaries.reduce((sum, s) => sum + s.stats.pendingCorrections, 0)}件
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Employee cards */}
      {summaries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>該当する社員が見つかりません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((summary) => (
            <div
              key={summary.userId}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onEmployeeClick?.(summary.userId)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {summary.lastName} {summary.firstName}
                  </h3>
                  <p className="text-xs text-gray-500">{summary.employeeCode}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getAttendanceRateColor(summary.stats.attendanceRate)}`}>
                  {getAttendanceRateIcon(summary.stats.attendanceRate)}
                  {summary.stats.attendanceRate}%
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">部署</span>
                  <span className="font-medium">{summary.department}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">役職</span>
                  <span className="font-medium">{summary.position}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">出勤日数</span>
                  <span className="font-medium">
                    {summary.stats.completedDays} / {summary.stats.workingDays}日
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">総労働時間</span>
                  <span className="font-medium">{summary.stats.totalWorkHours}h</span>
                </div>
                {summary.stats.pendingCorrections > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-600">承認待ち</span>
                    <span className="font-medium text-orange-600">
                      {summary.stats.pendingCorrections}件
                    </span>
                  </div>
                )}
              </div>

              {/* Action hint */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  クリックして詳細を表示
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
