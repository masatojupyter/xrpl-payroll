'use client'

import { useState } from 'react'
import { User, Loader2 } from 'lucide-react'
import { UserSettingsInput } from '@/lib/validators/settings'

interface UserSettingsProps {
  initialData?: UserSettingsInput
  onSave: (data: UserSettingsInput) => Promise<void>
}

export function UserSettings({ initialData, onSave }: UserSettingsProps) {
  const [formData, setFormData] = useState<UserSettingsInput>(
    initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof UserSettingsInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (field: keyof UserSettingsInput, value: string) => {
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
      setSuccessMessage('User settings saved successfully')
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors(error.errors as Partial<Record<keyof UserSettingsInput, string>>)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-900">User Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Yamada"
            />
            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Taro"
            />
            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="090-1234-5678"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>
        </div>

        {/* Language & Timezone */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                Language <span className="text-red-500">*</span>
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.language ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
              {errors.language && <p className="mt-1 text-sm text-red-600">{errors.language}</p>}
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone <span className="text-red-500">*</span>
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.timezone ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
                <option value="America/New_York">New York (America/New_York)</option>
                <option value="America/Los_Angeles">Los Angeles (America/Los_Angeles)</option>
                <option value="Europe/London">London (Europe/London)</option>
                <option value="Europe/Paris">Paris (Europe/Paris)</option>
                <option value="Asia/Shanghai">Shanghai (Asia/Shanghai)</option>
                <option value="Asia/Singapore">Singapore (Asia/Singapore)</option>
              </select>
              {errors.timezone && <p className="mt-1 text-sm text-red-600">{errors.timezone}</p>}
            </div>
          </div>
        </div>

        {/* Display Format */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Format</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-2">
                Date Format <span className="text-red-500">*</span>
              </label>
              <select
                id="dateFormat"
                value={formData.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.dateFormat ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</option>
              </select>
              {errors.dateFormat && (
                <p className="mt-1 text-sm text-red-600">{errors.dateFormat}</p>
              )}
            </div>

            <div>
              <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700 mb-2">
                Time Format <span className="text-red-500">*</span>
              </label>
              <select
                id="timeFormat"
                value={formData.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.timeFormat ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="24h">24-hour format (13:00)</option>
                <option value="12h">12-hour format (1:00 PM)</option>
              </select>
              {errors.timeFormat && (
                <p className="mt-1 text-sm text-red-600">{errors.timeFormat}</p>
              )}
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
