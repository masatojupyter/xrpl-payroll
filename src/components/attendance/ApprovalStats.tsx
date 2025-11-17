'use client'

import { AlertCircle, CheckCircle, Clock, TrendingUp, Users, XCircle } from 'lucide-react'
import useSWR from 'swr'
import { format } from 'date-fns'

interface ApprovalStatsData {
  success: boolean
  stats: {
    totalPending: number
    totalApproved: number
    totalRejected: number
    approvalRate: number
    employeesWithPending: Array<{
      employeeId: string
      employeeName: string
      pendingCount: number
    }>
    oldestPending: string | null
  }
  period: {
    startDate: string
    endDate: string
  }
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  bgColor?: string
  textColor?: string
  iconColor?: string
}

function StatCard({ title, value, icon, trend, trendUp, bgColor = 'bg-white', textColor = 'text-gray-900', iconColor = 'text-blue-600' }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl shadow-lg p-3 border border-gray-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 ease-out relative overflow-hidden group`}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-3xl font-extrabold ${textColor} mb-1 transition-all duration-300 group-hover:scale-105`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1">
              <TrendingUp className={`h-2 w-2 ${trendUp ? 'text-green-600' : 'text-red-600'} ${!trendUp && 'rotate-180'}`} />
              <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</span>
            </div>
          )}
        </div>
        <div className={`${iconColor} rounded-2xl p-3 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface ProgressBarProps {
  percentage: number
  color?: string
}

function ProgressBar({ percentage, color = 'bg-blue-600' }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div 
        className={`${color} h-full rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  )
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
})

export function ApprovalStats() {
  const { data, error, isLoading } = useSWR<ApprovalStatsData>(
    '/api/admin/attendance-approvals/stats',
    fetcher,
    {
      refreshInterval: 30000, // 30秒ごとに更新
      revalidateOnFocus: true,
    }
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Failed to fetch statistics</h3>
            <p className="text-sm text-red-700 mt-1">An error occurred while loading data. Please refresh the page.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.stats) {
    return null
  }

  const { stats } = data
  const totalProcessed = stats.totalApproved + stats.totalRejected
  const approvalRateColor = stats.approvalRate >= 90 ? 'bg-green-600' : stats.approvalRate >= 70 ? 'bg-yellow-600' : 'bg-red-600'

  return (
    <div className="space-y-6">
      {/* メイン統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 承認待ち件数 - 大きく表示、アラート */}
        <div className="relative">
          {stats.totalPending > 0 && (
            <div className="absolute -top-2 -right-2 z-10">
              <span className="flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center">
                  <span className="text-white text-xs font-bold">{stats.totalPending}</span>
                </span>
              </span>
            </div>
          )}
          <StatCard
            title="Pending"
            value={stats.totalPending}
            icon={<Clock className="h-6 w-6" />}
            bgColor={stats.totalPending > 0 ? 'bg-gradient-to-br from-red-50 via-red-50 to-red-100' : 'bg-gradient-to-br from-white to-gray-50'}
            textColor={stats.totalPending > 0 ? 'text-red-600' : 'text-gray-900'}
            iconColor={stats.totalPending > 0 ? 'text-red-500' : 'text-gray-400'}
          />
        </div>

        {/* Approved this month */}
        <StatCard
          title="Approved This Month"
          value={stats.totalApproved}
          icon={<CheckCircle className="h-6 w-6" />}
          bgColor="bg-gradient-to-br from-green-50 via-emerald-50 to-green-100"
          textColor="text-green-700"
          iconColor="text-green-600"
        />

        {/* Rejected this month */}
        <StatCard
          title="Rejected This Month"
          value={stats.totalRejected}
          icon={<XCircle className="h-6 w-6" />}
          bgColor="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100"
          textColor="text-orange-700"
          iconColor="text-orange-600"
        />

        {/* Approval rate */}
        <StatCard
          title="Approval Rate"
          value={`${stats.approvalRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          bgColor={
            stats.approvalRate >= 90 
              ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100' 
              : stats.approvalRate >= 70 
              ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100' 
              : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100'
          }
          textColor={
            stats.approvalRate >= 90 
              ? 'text-blue-700' 
              : stats.approvalRate >= 70 
              ? 'text-yellow-700' 
              : 'text-red-700'
          }
          iconColor={
            stats.approvalRate >= 90 
              ? 'text-blue-600' 
              : stats.approvalRate >= 70 
              ? 'text-yellow-600' 
              : 'text-red-600'
          }
        />
      </div>

      {/* 承認率プログレスバー
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">今月の承認率</h3>
            <span className="text-2xl font-bold text-gray-900">{stats.approvalRate.toFixed(1)}%</span>
          </div>
          <ProgressBar percentage={stats.approvalRate} color={approvalRateColor} />
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>承認済み: {stats.totalApproved}件</span>
          <span>却下: {stats.totalRejected}件</span>
          <span>合計: {totalProcessed}件</span>
        </div>
      </div> */}

      {/* 最も古い承認待ち勤怠 */}
      {stats.oldestPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Oldest Pending Attendance</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Attendance from {format(new Date(stats.oldestPending), 'MMM d, yyyy (EEE)')} is pending approval
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Please process approval as soon as possible
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 未承認勤怠がある従業員リスト */}
      {stats.employeesWithPending.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Employees with Pending Attendance</h3>
          </div>
          <div className="space-y-2">
            {stats.employeesWithPending.map((employee) => (
              <div
                key={employee.employeeId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {employee.employeeName.split(' ').map(n => n.charAt(0)).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {employee.employeeName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                    {employee.pendingCount} {employee.pendingCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* すべて承認済みの場合のメッセージ */}
      {stats.totalPending === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-green-900">All attendance records have been approved</h3>
              <p className="text-sm text-green-700">There are currently no pending attendance records.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
