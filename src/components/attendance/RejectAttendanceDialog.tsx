'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, XCircle, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'

// Validation schema (inline version of rejectAttendanceSchema)
const rejectReasonSchema = z.object({
  reason: z
    .string()
    .min(10, '却下理由は最低10文字入力してください')
    .max(500, '却下理由は500文字以内で入力してください'),
})

type RejectReasonInput = z.infer<typeof rejectReasonSchema>

interface RejectAttendanceDialogProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string) => Promise<void>
  employeeName: string
  date: string
}

export function RejectAttendanceDialog({
  isOpen,
  onClose,
  onReject,
  employeeName,
  date,
}: RejectAttendanceDialogProps) {
  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RejectReasonInput>({
    resolver: zodResolver(rejectReasonSchema),
    defaultValues: {
      reason: '',
    },
  })

  const reason = watch('reason')
  const charCount = reason?.length || 0

  // Handle form submission
  const onSubmit = async (data: RejectReasonInput) => {
    setError(null)
    setIsSubmitting(true)

    try {
      await onReject(data.reason)
      // Success - parent component will handle closing and success message
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '却下処理に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close
  const handleClose = () => {
    if (isSubmitting) return
    reset()
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  勤怠記録の却下
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  却下理由を入力してください
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-4">
              {/* Warning message */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    この操作は取り消せません
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    却下された勤怠記録は、従業員による再申請が必要になります。
                  </p>
                </div>
              </div>

              {/* Employee info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">従業員名</p>
                    <p className="font-medium text-gray-900">{employeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">日付</p>
                    <p className="font-medium text-gray-900">{date}</p>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      エラーが発生しました
                    </p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Reason textarea */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  却下理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('reason')}
                  id="reason"
                  placeholder="勤怠記録を却下する理由を詳しく入力してください（最低10文字）"
                  rows={5}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-100 transition-colors ${
                    errors.reason
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                
                {/* Character count and validation error */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex-1">
                    {errors.reason && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.reason.message}
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      charCount > 500
                        ? 'text-red-600 font-medium'
                        : charCount >= 10
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {charCount} / 500
                  </p>
                </div>

                {/* Helper text */}
                {!errors.reason && charCount === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    例: 出勤時刻が就業規則に反しているため、再申請をお願いします。
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    却下する
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
