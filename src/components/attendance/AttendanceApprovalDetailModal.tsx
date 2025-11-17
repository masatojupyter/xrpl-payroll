'use client'

import { useState } from 'react'
import { X, CheckCircle2, XCircle, Loader2, AlertCircle, Clock, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { TimerEventTimeline } from './TimerEventTimeline'
import { OperationLogViewer } from './OperationLogViewer'
import { RejectAttendanceDialog } from './RejectAttendanceDialog'

// Types
interface TimerEvent {
  id: string
  eventType: string
  timestamp: string
  durationFromPrevious: number | null
  endTimestamp: string | null
  memo: string | null
  notes: string | null
}

interface OperationLog {
  id: string
  action: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
  reason: string | null
}

interface AttendanceDetail {
  id: string
  date: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    department: string
  }
  clockInTime: string
  clockOutTime: string | null
  totalWorkMinutes: number
  totalBreakMinutes: number
  approvalStatus: string
  timerEvents: TimerEvent[]
  operationLogs: OperationLog[]
  workStats?: {
    totalWorkMinutes: number
    totalRestMinutes: number
    totalWorkHours: string
    totalRestHours: string
    workPeriods: number
    restPeriods: number
  }
}

interface AttendanceApprovalDetailModalProps {
  attendance: AttendanceDetail | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AttendanceApprovalDetailModal({
  attendance,
  isOpen,
  onClose,
  onSuccess,
}: AttendanceApprovalDetailModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<'timeline' | 'logs'>('timeline')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen || !attendance) return null

  // Format helpers
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy年MM月dd日 (E)', { locale: ja })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--'
    try {
      return format(new Date(timeStr), 'HH:mm', { locale: ja })
    } catch {
      return '--:--'
    }
  }

  const formatWorkHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Handle approval
  const handleApprove = async () => {
    setError(null)
    setSuccessMessage(null)
    setIsApproving(true)

    try {
      const response = await fetch(
        `/api/admin/attendance-approvals/${attendance.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: approvalComment.trim() || undefined,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '承認処理に失敗しました')
      }

      const result = await response.json()
      setSuccessMessage(result.message || '勤怠記録を承認しました')

      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess?.()
        onClose()
        setApprovalComment('')
        setSuccessMessage(null)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '承認処理に失敗しました')
    } finally {
      setIsApproving(false)
    }
  }

  // Handle rejection
  const handleReject = async (reason: string) => {
    setError(null)
    setSuccessMessage(null)
    setIsRejecting(true)

    try {
      const response = await fetch(
        `/api/admin/attendance-approvals/${attendance.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '却下処理に失敗しました')
      }

      const result = await response.json()
      setSuccessMessage(result.message || '勤怠記録を却下しました')

      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess?.()
        onClose()
        setSuccessMessage(null)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '却下処理に失敗しました')
      throw err // Re-throw to let RejectDialog handle it
    } finally {
      setIsRejecting(false)
    }
  }

  const handleClose = () => {
    if (isApproving || isRejecting) return
    setApprovalComment('')
    setError(null)
    setSuccessMessage(null)
    setActiveTab('timeline')
    onClose()
  }

  const employeeName = `${attendance.employee.lastName} ${attendance.employee.firstName}`

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  勤怠承認詳細
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(attendance.date)}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isApproving || isRejecting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Success message */}
              {successMessage && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  基本情報
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">従業員</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attendance.employee.employeeCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">部門</p>
                    <p className="text-sm font-medium text-gray-900">
                      {attendance.employee.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">日付</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(attendance.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-gray-600">出勤時刻</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatTime(attendance.clockInTime)}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <p className="text-xs text-gray-600">退勤時刻</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatTime(attendance.clockOutTime)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-gray-600">労働時間</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {formatWorkHours(attendance.totalWorkMinutes)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600">休憩時間</p>
                  </div>
                  <p className="text-xl font-bold text-gray-700">
                    {formatWorkHours(attendance.totalBreakMinutes)}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'timeline'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    タイムライン
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'logs'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    操作ログ
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {activeTab === 'timeline' && (
                  <TimerEventTimeline
                    events={attendance.timerEvents}
                    workStats={attendance.workStats}
                  />
                )}
                {activeTab === 'logs' && (
                  <OperationLogViewer logs={attendance.operationLogs} />
                )}
              </div>

              {/* Approval Comment */}
              {attendance.approvalStatus === 'PENDING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    承認コメント（任意）
                  </label>
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="承認時のコメントを入力してください（任意）"
                    rows={3}
                    maxLength={500}
                    disabled={isApproving || isRejecting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-100"
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {approvalComment.length} / 500
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleClose}
                disabled={isApproving || isRejecting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>

              {attendance.approvalStatus === 'PENDING' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    却下
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        承認中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        承認する
                      </>
                    )}
                  </button>
                </div>
              )}

              {attendance.approvalStatus === 'APPROVED' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">承認済み</span>
                </div>
              )}

              {attendance.approvalStatus === 'REJECTED' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">却下済み</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <RejectAttendanceDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={handleReject}
        employeeName={employeeName}
        date={formatDate(attendance.date)}
      />
    </>
  )
}
