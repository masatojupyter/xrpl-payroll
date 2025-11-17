'use client'

import { useState } from 'react'
import { DollarSign, Loader2 } from 'lucide-react'
import { PayrollSettingsInput } from '@/lib/validators/settings'

interface PayrollSettingsProps {
  initialData?: PayrollSettingsInput
  onSave: (data: PayrollSettingsInput) => Promise<void>
}

export function PayrollSettings({ initialData, onSave }: PayrollSettingsProps) {
  const [formData, setFormData] = useState<PayrollSettingsInput>(
    initialData || {
      currency: 'XRP',
      paymentDay: 25,
      taxRate: 10,
      socialInsuranceRate: 15,
      xrpWalletAddress: '',
      minimumPayment: 100,
      autoPayment: false,
    }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof PayrollSettingsInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (field: keyof PayrollSettingsInput, value: string | number | boolean) => {
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
      setSuccessMessage('Payroll settings saved')
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors(error.errors as Partial<Record<keyof PayrollSettingsInput, string>>)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-900">Payroll Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency & Payment Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Currency <span className="text-red-500">*</span>
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.currency ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="XRP">XRP</option>
              <option value="XRP">XRP</option>
            </select>
            {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency}</p>}
          </div>

          <div>
            <label htmlFor="paymentDay" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Day (Monthly) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="paymentDay"
              value={formData.paymentDay}
              onChange={(e) => handleChange('paymentDay', Number(e.target.value))}
              min="1"
              max="28"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.paymentDay ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.paymentDay && <p className="mt-1 text-sm text-red-600">{errors.paymentDay}</p>}
            <p className="mt-1 text-xs text-gray-500">Set within the range of 1-28</p>
          </div>
        </div>

        {/* Tax Rate & Social Insurance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
              Income Tax Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="taxRate"
              value={formData.taxRate}
              onChange={(e) => handleChange('taxRate', Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.taxRate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.taxRate && <p className="mt-1 text-sm text-red-600">{errors.taxRate}</p>}
          </div>

          <div>
            <label
              htmlFor="socialInsuranceRate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Social Insurance Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="socialInsuranceRate"
              value={formData.socialInsuranceRate}
              onChange={(e) => handleChange('socialInsuranceRate', Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.socialInsuranceRate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.socialInsuranceRate && (
              <p className="mt-1 text-sm text-red-600">{errors.socialInsuranceRate}</p>
            )}
          </div>
        </div>

        {/* XRP Wallet Address */}
        <div>
          <label
            htmlFor="xrpWalletAddress"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Company XRP Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="xrpWalletAddress"
            value={formData.xrpWalletAddress}
            onChange={(e) => handleChange('xrpWalletAddress', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
              errors.xrpWalletAddress ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          />
          {errors.xrpWalletAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.xrpWalletAddress}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Wallet address used for payroll payments</p>
        </div>

        {/* Minimum Payment */}
        <div>
          <label htmlFor="minimumPayment" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Payment <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="minimumPayment"
            value={formData.minimumPayment}
            onChange={(e) => handleChange('minimumPayment', Number(e.target.value))}
            min="0"
            step="0.01"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.minimumPayment ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.minimumPayment && (
            <p className="mt-1 text-sm text-red-600">{errors.minimumPayment}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Payments below this amount will be carried over to the next period
          </p>
        </div>

        {/* Auto Payment */}
        <div className="border-t pt-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoPayment"
              checked={formData.autoPayment}
              onChange={(e) => handleChange('autoPayment', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
              <label htmlFor="autoPayment" className="ml-2 block text-sm text-gray-700">
                Enable automatic payment
              </label>
          </div>
          <p className="mt-2 text-xs text-gray-500 ml-6">
            When enabled, payroll will be automatically paid on the payment day
          </p>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="text-sm">
            <strong>Note:</strong>{' '}
            Changes to payroll settings will be applied from the next payroll calculation. They will not affect payrolls that have already been calculated.
          </p>
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
