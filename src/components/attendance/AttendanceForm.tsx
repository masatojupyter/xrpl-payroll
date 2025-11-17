'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TimeInput } from './TimeInput';

interface AttendanceFormData {
  date: string;
  checkIn: string;
  checkOut: string;
  breakMinutes: number;
  notes: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
}

interface AttendanceFormProps {
  employeeId: string;
  initialData?: Partial<AttendanceFormData> & { id?: string };
  onSubmit: (data: AttendanceFormData & { id?: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AttendanceForm({
  employeeId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AttendanceFormProps) {
  const [formData, setFormData] = useState<AttendanceFormData>({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    checkIn: initialData?.checkIn || '',
    checkOut: initialData?.checkOut || '',
    breakMinutes: initialData?.breakMinutes || 60,
    notes: initialData?.notes || '',
    status: initialData?.status || 'present',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AttendanceFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AttendanceFormData, string>> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (formData.status === 'present') {
      if (!formData.checkIn) {
        newErrors.checkIn = 'Check-in time is required for present status';
      }
      if (!formData.checkOut) {
        newErrors.checkOut = 'Check-out time is required for present status';
      }
      if (formData.checkIn && formData.checkOut && formData.checkIn >= formData.checkOut) {
        newErrors.checkOut = 'Check-out time must be after check-in time';
      }
    }

    if (formData.breakMinutes < 0) {
      newErrors.breakMinutes = 'Break minutes cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        ...formData,
        id: initialData?.id,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleStatusChange = (status: AttendanceFormData['status']) => {
    setFormData((prev) => ({
      ...prev,
      status,
      // Clear times if not present
      checkIn: status === 'present' ? prev.checkIn : '',
      checkOut: status === 'present' ? prev.checkOut : '',
      breakMinutes: status === 'present' ? prev.breakMinutes : 0,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData?.id ? 'Edit Attendance' : 'Add Attendance Record'}
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
            {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['present', 'absent', 'leave', 'holiday'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Time inputs - only for present status */}
          {formData.status === 'present' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TimeInput
                  label="Check-in Time"
                  value={formData.checkIn}
                  onChange={(value) => setFormData({ ...formData, checkIn: value })}
                  error={errors.checkIn}
                  required
                  disabled={isLoading}
                />
                <TimeInput
                  label="Check-out Time"
                  value={formData.checkOut}
                  onChange={(value) => setFormData({ ...formData, checkOut: value })}
                  error={errors.checkOut}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Break Minutes */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.breakMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  step="15"
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                {errors.breakMinutes && (
                  <p className="text-sm text-red-600">{errors.breakMinutes}</p>
                )}
              </div>

              {/* Working Hours Display */}
              {formData.checkIn && formData.checkOut && formData.checkIn < formData.checkOut && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Calculated Working Hours: </span>
                    {(() => {
                      const [checkInHours, checkInMinutes] = formData.checkIn.split(':').map(Number);
                      const [checkOutHours, checkOutMinutes] = formData.checkOut.split(':').map(Number);
                      const totalMinutes =
                        (checkOutHours * 60 + checkOutMinutes) -
                        (checkInHours * 60 + checkInMinutes) -
                        formData.breakMinutes;
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      return `${hours}h ${minutes}m`;
                    })()}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={isLoading}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isLoading ? 'Saving...' : initialData?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
