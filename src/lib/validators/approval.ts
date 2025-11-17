import { z } from 'zod'

/**
 * Bulk approval schema
 * Used when approving multiple attendance records at once
 */
export const approveAttendanceSchema = z.object({
  attendanceRecordIds: z
    .array(z.string())
    .min(1, 'Please select at least one attendance record to approve'),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional(),
})

export type ApproveAttendanceInput = z.infer<typeof approveAttendanceSchema>

/**
 * Rejection schema
 * Used when rejecting an attendance record
 */
export const rejectAttendanceSchema = z.object({
  attendanceRecordId: z
    .string()
    .min(1, 'Attendance record ID is required'),
  reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must be 500 characters or less'),
})

export type RejectAttendanceInput = z.infer<typeof rejectAttendanceSchema>

/**
 * Pending approvals query parameter schema
 * Used for filtering, pagination, and sorting pending attendance records
 */
export const pendingApprovalsQuerySchema = z.object({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z
    .number()
    .int()
    .min(1, 'Page number must be 1 or greater')
    .default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be 1 or greater')
    .max(100, 'Limit must be 100 or less')
    .default(20),
  sortBy: z
    .enum(['date', 'employeeName', 'totalWorkMinutes'])
    .default('date'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
})

export type PendingApprovalsQuery = z.infer<typeof pendingApprovalsQuerySchema>
