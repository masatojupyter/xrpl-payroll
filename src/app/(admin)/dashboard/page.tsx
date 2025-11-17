'use client'

import useSWR from 'swr'
import { Users, DollarSign, Clock, TrendingUp } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart'
import { DepartmentPieChart } from '@/components/dashboard/DepartmentPieChart'
import { AttendanceAreaChart } from '@/components/dashboard/AttendanceAreaChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  monthlyWorkHours: number
  expectedPayment: number
  todayPresent: number
  todayAttendanceRate: number
  period: {
    start: string
    end: string
  }
}

interface ChartData {
  monthlyWorkHours: Array<{
    month: string
    hours: number
  }>
  departmentDistribution: Array<{
    department: string
    count: number
    percentage: number
  }>
  dailyAttendanceRate: Array<{
    date: string
    rate: number
    present: number
    total: number
  }>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  // Fetch dashboard stats
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR<DashboardStats>(
    '/api/dashboard/stats',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  )

  // Fetch chart data
  const { data: chartData, error: chartError, isLoading: chartLoading } = useSWR<ChartData>(
    '/api/dashboard/charts?type=all&months=6&days=30',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  )

  // Error states
  if (statsError || chartError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Failed to load data
          </div>
          <p className="text-gray-600 mb-4">
            {statsError?.message || chartError?.message || 'An unknown error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  // Transform chart data for components
  const monthlyTrendData = chartData?.monthlyWorkHours?.map((item) => ({
    month: item.month,
    amount: Math.round(item.hours * (stats?.expectedPayment || 0) / (stats?.monthlyWorkHours || 1)),
    employees: stats?.activeEmployees || 0,
  })) || []

  const departmentPieData = chartData?.departmentDistribution?.map((item) => ({
    name: item.department,
    value: item.count,
  })) || []

  const attendanceAreaData = chartData?.dailyAttendanceRate?.map((item) => ({
    month: item.date,
    rate: item.rate,
  })) || []

  // Mock recent activities (would come from an API in production)
  const recentActivities = [
    {
      id: '1',
      type: 'employee' as const,
      description: 'New employee was added',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: 'Administrator',
    },
    {
      id: '2',
      type: 'payment' as const,
      description: 'Payroll payment completed',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      user: 'Accounting Department',
    },
    {
      id: '3',
      type: 'attendance' as const,
      description: 'Attendance record updated',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Overview and latest statistics of the payroll system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          icon={Users}
          description={`Active: ${stats?.activeEmployees || 0} employees`}
          loading={statsLoading}
        />
        
        <StatsCard
          title="Expected Payment This Month"
          value={`${stats?.expectedPayment?.toLocaleString() || 0} XRP`}
          icon={DollarSign}
          description={`Work hours: ${stats?.monthlyWorkHours?.toFixed(1) || 0}h`}
          loading={statsLoading}
        />
        
        <StatsCard
          title="Today's Attendance"
          value={`${stats?.todayPresent || 0} employees`}
          icon={Clock}
          description={`Attendance rate: ${stats?.todayAttendanceRate?.toFixed(1) || 0}%`}
          loading={statsLoading}
          trend={
            stats?.todayAttendanceRate
              ? {
                  value: stats.todayAttendanceRate - 85,
                  isPositive: stats.todayAttendanceRate >= 85,
                }
              : undefined
          }
        />
        
        <StatsCard
          title="Monthly Work Hours"
          value={`${stats?.monthlyWorkHours?.toFixed(1) || 0}h`}
          icon={TrendingUp}
          description="Total this month"
          loading={statsLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart 
          data={monthlyTrendData}
          loading={chartLoading}
        />
        
        <DepartmentPieChart 
          data={departmentPieData}
          loading={chartLoading}
        />
      </div>

      {/* Attendance and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceAreaChart 
            data={attendanceAreaData}
            loading={chartLoading}
          />
        </div>
        
        <div>
          <RecentActivity 
            activities={recentActivities}
            loading={false}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/employees"
            className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Employee Management</span>
          </a>
          
          <a
            href="/dashboard/attendance"
            className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Clock className="h-5 w-5" />
            <span className="font-medium">Attendance Management</span>
          </a>
          
          <a
            href="/dashboard/payments"
            className="flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <DollarSign className="h-5 w-5" />
            <span className="font-medium">Payroll Payments</span>
          </a>
        </div>
      </div>
    </div>
  )
}
