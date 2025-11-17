'use client'

import { useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { AttendanceApprovalList } from '@/components/attendance/AttendanceApprovalList'
import { AttendanceApprovalDetailModal } from '@/components/attendance/AttendanceApprovalDetailModal'
import { ApprovalStats } from '@/components/attendance/ApprovalStats'

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

type AttendanceDetail = {
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
  timerEvents: Array<{
    id: string
    eventType: string
    timestamp: string
    durationFromPrevious: number | null
    endTimestamp: string | null
    memo: string | null
    notes: string | null
  }>
  operationLogs: Array<{
    id: string
    action: string
    oldValue: Record<string, unknown> | null
    newValue: Record<string, unknown> | null
    ipAddress: string | null
    userAgent: string | null
    timestamp: string
    reason: string | null
  }>
  workStats?: {
    totalWorkMinutes: number
    totalRestMinutes: number
    totalWorkHours: string
    totalRestHours: string
    workPeriods: number
    restPeriods: number
  }
}

export default function AttendanceApprovalsPage() {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceApproval | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailData, setDetailData] = useState<AttendanceDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleDetailClick = async (record: AttendanceApproval) => {
    setSelectedRecord(record)
    setIsDetailModalOpen(true)
    setIsLoadingDetail(true)

    try {
      const response = await fetch(`/api/admin/attendance-approvals/${record.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch attendance detail')
      }

      const result = await response.json()
      setDetailData(result.data)
    } catch (error) {
      console.error('Error fetching attendance detail:', error)
      alert('Failed to fetch attendance details')
      setIsDetailModalOpen(false)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleModalClose = () => {
    setIsDetailModalOpen(false)
    setSelectedRecord(null)
    setDetailData(null)
  }

  const handleApprovalSuccess = () => {
    // Refresh the list
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-blue-600" />
            Attendance Approval
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Pending approval count updates automatically</span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              About Approval
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review attendance records submitted by employees and approve or reject them</li>
              <li>• Click details to view timer events and operation logs</li>
              <li>• Use the batch approval function to approve multiple records at once</li>
              <li>• When rejecting, you must provide a reason (minimum 10 characters)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Approval Statistics */}
      <ApprovalStats />

      {/* Approval List */}
      <AttendanceApprovalList
        key={refreshTrigger}
        onDetailClick={handleDetailClick}
        onApprovalSuccess={handleApprovalSuccess}
      />

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <>
          {isLoadingDetail ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-700">Loading...</p>
              </div>
            </div>
          ) : detailData ? (
            <AttendanceApprovalDetailModal
              attendance={detailData}
              isOpen={isDetailModalOpen}
              onClose={handleModalClose}
              onSuccess={handleApprovalSuccess}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
