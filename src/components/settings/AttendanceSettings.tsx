'use client'

import { useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'
import { AttendanceSettingsInput } from '@/lib/validators/settings'

interface AttendanceSettingsProps {
  initialData?: AttendanceSettingsInput
  onSave: (data: AttendanceSettingsInput) => Promise<void>
}

export function AttendanceSettings({ initialData, onSave }: AttendanceSettingsProps) {
  const [formData, setFormData] = useState<AttendanceSettingsInput>(
    initialData || {
      workStartTime: '09:00',
      workEndTime: '18:00',
      breakDuration: 60,
      overtimeEnabled: true,
      overtimeRate: 1.25,
      weekendRate: 1.5,
      autoCheckout: false,
      autoCheckoutTime: '22:00',
    }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof AttendanceSettingsInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (field: keyof AttendanceSettingsInput, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await onSave(formData)
      setSuccessMessage('勤怠設定を保存しました')
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors(error.errors as Partial<Record<keyof AttendanceSettingsInput, string>>)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-900">勤怠設定</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Work Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="workStartTime" className="block text-sm font-medium text-gray-700 mb-2">
              勤務開始時刻 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="workStartTime"
              value={formData.workStartTime}
              onChange={(e) => handleChange('workStartTime', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.workStartTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.workStartTime && (
              <p className="mt-1 text-sm text-red-600">{errors.workStartTime}</p>
            )}
          </div>

          <div>
            <label htmlFor="workEndTime" className="block text-sm font-medium text-gray-700 mb-2">
              勤務終了時刻 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="workEndTime"
              value={formData.workEndTime}
              onChange={(e) => handleChange('workEndTime', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.workEndTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.workEndTime && <p className="mt-1 text-sm text-red-600">{errors.workEndTime}</p>}
          </div>
        </div>

        {/* Break Duration */}
        <div>
          <label htmlFor="breakDuration" className="block text-sm font-medium text-gray-700 mb-2">
            休憩時間（分） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="breakDuration"
            value={formData.breakDuration}
            onChange={(e) => handleChange('breakDuration', Number(e.target.value))}
            min="0"
            max="480"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.breakDuration ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.breakDuration && (
            <p className="mt-1 text-sm text-red-600">{errors.breakDuration}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">標準の休憩時間を分単位で設定してください</p>
        </div>

        {/* Overtime Settings */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">残業設定</h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overtimeEnabled"
                checked={formData.overtimeEnabled}
                onChange={(e) => handleChange('overtimeEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="overtimeEnabled" className="ml-2 block text-sm text-gray-700">
                残業を有効にする
              </label>
            </div>

            {formData.overtimeEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div>
                  <label htmlFor="overtimeRate" className="block text-sm font-medium text-gray-700 mb-2">
                    残業割増率 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="overtimeRate"
                    value={formData.overtimeRate}
                    onChange={(e) => handleChange('overtimeRate', Number(e.target.value))}
                    min="1"
                    max="5"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.overtimeRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.overtimeRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.overtimeRate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">例: 1.25 = 125%</p>
                </div>

                <div>
                  <label htmlFor="weekendRate" className="block text-sm font-medium text-gray-700 mb-2">
                    休日出勤割増率 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="weekendRate"
                    value={formData.weekendRate}
                    onChange={(e) => handleChange('weekendRate', Number(e.target.value))}
                    min="1"
                    max="5"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.weekendRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.weekendRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.weekendRate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">例: 1.5 = 150%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto Checkout */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">自動退勤設定</h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoCheckout"
                checked={formData.autoCheckout}
                onChange={(e) => handleChange('autoCheckout', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoCheckout" className="ml-2 block text-sm text-gray-700">
                自動退勤を有効にする
              </label>
            </div>

            {formData.autoCheckout && (
              <div className="ml-6">
                <label
                  htmlFor="autoCheckoutTime"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  自動退勤時刻
                </label>
                <input
                  type="time"
                  id="autoCheckoutTime"
                  value={formData.autoCheckoutTime || ''}
                  onChange={(e) => handleChange('autoCheckoutTime', e.target.value)}
                  className={`w-full md:w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.autoCheckoutTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.autoCheckoutTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.autoCheckoutTime}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  この時刻になると自動的に退勤処理が行われます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
