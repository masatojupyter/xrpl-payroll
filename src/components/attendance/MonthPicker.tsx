'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthPickerProps {
  currentYear: number;
  currentMonth: number;
  onMonthSelect: (year: number, month: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function MonthPicker({
  currentYear,
  currentMonth,
  onMonthSelect,
  onClose,
  isOpen,
}: MonthPickerProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const modalRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthShortNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMonthClick = (month: number) => {
    onMonthSelect(selectedYear, month);
    onClose();
  };

  const handlePreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const today = new Date();
  const isCurrentMonth = (month: number) => {
    return selectedYear === today.getFullYear() && month === today.getMonth();
  };

  const isSelectedMonth = (month: number) => {
    return selectedYear === currentYear && month === currentMonth;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handlePreviousYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous year"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedYear}
          </h3>
          
          <button
            onClick={handleNextYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next year"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Month Grid */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {monthShortNames.map((monthName, index) => (
              <button
                key={index}
                onClick={() => handleMonthClick(index)}
                className={`
                  py-3 px-4 rounded-lg text-sm font-medium transition-all
                  ${isSelectedMonth(index)
                    ? 'bg-blue-600 text-white shadow-md'
                    : isCurrentMonth(index)
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {monthName}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              const today = new Date();
              onMonthSelect(today.getFullYear(), today.getMonth());
              onClose();
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Today
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
