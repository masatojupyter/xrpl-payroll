'use client'

import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { NotificationSettingsInput } from '@/lib/validators/settings'

interface NotificationSettingsProps {
  initialData?: NotificationSettingsInput
  onSave: (data: NotificationSettingsInput) => Promise<void>
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function NotificationSettings({ initialData, onSave }: NotificationSettingsProps) {
  const [formData, setFormData] = useState<NotificationSettingsInput>(
    initialData || {
      emailNotifications: true,
      attendanceReminders: true,
      payrollAlerts: true,
      systemUpdates: false,
      reminderTime: '08:00',
      reminderDays: [1, 2, 3, 4, 5], // Monday to Friday
    }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof NotificationSettingsInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (field: keyof NotificationSettingsInput, value: string | number[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSuccessMessage('')
  }

  const toggleDay = (day: number) => {
    const newDays = formData.reminderDays.includes(day)
      ? formData.reminderDays.filter((d) => d !== day)
      : [...formData.reminderDays, day].sort((a, b) => a - b)
    handleChange('reminderDays', newDays)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await onSave(formData)
      setSuccessMessage('Notification settings saved')
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors(error.errors as Partial<Record<keyof NotificationSettingsInput, string>>)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-900">Notification Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Notification Types</h3>

          <div className="space-y-3">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="emailNotifications"
                checked={formData.emailNotifications}
                onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="emailNotifications" className="block text-sm font-medium text-gray-700">
                  Enable email notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Receive important events and alerts via email
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="attendanceReminders"
                checked={formData.attendanceReminders}
                onChange={(e) => handleChange('attendanceReminders', e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="attendanceReminders" className="block text-sm font-medium text-gray-700">
                  Attendance reminders
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Receive notifications for missed clock-in/clock-out
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="payrollAlerts"
                checked={formData.payrollAlerts}
                onChange={(e) => handleChange('payrollAlerts', e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="payrollAlerts" className="block text-sm font-medium text-gray-700">
                  Payroll alerts
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Receive notifications about payroll processing and payments
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="systemUpdates"
                checked={formData.systemUpdates}
                onChange={(e) => handleChange('systemUpdates', e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="systemUpdates" className="block text-sm font-medium text-gray-700">
                  System update notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Receive information about new features and maintenance
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Settings */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reminder Settings</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="reminderTime" className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="reminderTime"
                value={formData.reminderTime}
                onChange={(e) => handleChange('reminderTime', e.target.value)}
                className={`w-full md:w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reminderTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.reminderTime && (
                <p className="mt-1 text-sm text-red-600">{errors.reminderTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Days <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      formData.reminderDays.includes(index)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.reminderDays && (
                <p className="mt-1 text-sm text-red-600">{errors.reminderDays}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Reminders will be sent on selected days
              </p>
            </div>
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
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
