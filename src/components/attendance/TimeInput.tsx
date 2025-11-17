'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function TimeInput({
  value,
  onChange,
  label,
  error,
  required = false,
  disabled = false,
}: TimeInputProps) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h || '');
      setMinutes(m || '');
    }
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
      setHours(val);
      if (val && minutes) {
        onChange(`${val.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
      }
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
      setMinutes(val);
      if (hours && val) {
        onChange(`${hours.padStart(2, '0')}:${val.padStart(2, '0')}`);
      }
    }
  };

  const handleHoursBlur = () => {
    if (hours && minutes) {
      onChange(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
    }
  };

  const handleMinutesBlur = () => {
    if (hours && minutes) {
      onChange(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <input
            type="text"
            value={hours}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            placeholder="HH"
            maxLength={2}
            disabled={disabled}
            className="w-8 text-center focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
          <span className="text-gray-500">:</span>
          <input
            type="text"
            value={minutes}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            placeholder="MM"
            maxLength={2}
            disabled={disabled}
            className="w-8 text-center focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
