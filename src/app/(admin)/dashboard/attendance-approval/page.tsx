'use client'

import { useState, useEffect } from 'react'
import { ApprovalStats } from '@/components/attendance/ApprovalStats'
import { AttendanceApprovalList } from '@/components/attendance/AttendanceApprovalList'
import { AttendanceApprovalDetailModal } from '@/components/attendance/AttendanceApprovalDetailModal'
import { AlertCircle, Loader2 } from 'lucide-react'

type AttendanceApproval = {
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
  status: string
}

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

export default function AttendanceApprovalPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch full attendance details when a record is selected
  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedAttendance(null)
      return
    }

    const fetchAttendanceDetail = async () => {
      setIsLoadingDetail(true)
      try {
        const response = await fetch(`/api/admin/attendance-approvals/${selectedRecordId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch attendance details')
        }
        const data = await response.json()
        setSelectedAttendance(data.data)
      } catch (error) {
        console.error('Error fetching attendance details:', error)
        setSelectedRecordId(null)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    fetchAttendanceDetail()
  }, [selectedRecordId])

  const handleDetailClick = (record: AttendanceApproval) => {
    setSelectedRecordId(record.id)
  }

  const handleCloseModal = () => {
    setSelectedRecordId(null)
    setSelectedAttendance(null)
  }

  const handleApprovalSuccess = () => {
    // Trigger a refresh by incrementing the key
    setRefreshKey(prev => prev + 1)
    setSelectedRecordId(null)
    setSelectedAttendance(null)
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Approval Management</h1>
        <p className="text-sm text-gray-600">
          Review and approve employee attendance records
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-blue-900 mb-0.5">
              About Approval Process
            </h3>
            <ul className="text-xs text-blue-700 space-y-0.5">
              <li>• After reviewing attendance records, select approve or reject</li>
              <li>• You can select multiple records for batch approval</li>
              <li>• When rejecting, you must provide a reason</li>
              <li>• After approval, records will be reflected in payroll calculations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Approval Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Approval Statistics</h2>
        <ApprovalStats key={`stats-${refreshKey}`} />
      </div>

      {/* Attendance Approval List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Pending Attendance Records
        </h2>
        <AttendanceApprovalList
          key={`list-${refreshKey}`}
          onDetailClick={handleDetailClick}
          onApprovalSuccess={handleApprovalSuccess}
        />
      </div>

      {/* Detail Modal */}
      {selectedRecordId && (
        <>
          {isLoadingDetail ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-700">Loading details...</span>
              </div>
            </div>
          ) : (
            <AttendanceApprovalDetailModal
              attendance={selectedAttendance}
              isOpen={!!selectedAttendance}
              onClose={handleCloseModal}
              onSuccess={handleApprovalSuccess}
            />
          )}
        </>
      )}
    </div>
  )
}
