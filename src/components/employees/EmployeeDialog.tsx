'use client';

import { X } from 'lucide-react';
import { EmployeeForm } from './EmployeeForm';

type Employee = {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  position: string | null;
  hourlyRate: string;
  walletAddress: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  joinDate: string | null;
  isActive: boolean;
};

type EmployeeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
};

export function EmployeeDialog({ isOpen, onClose, employee, onSuccess }: EmployeeDialogProps) {
  if (!isOpen) return null;

  const handleSubmit = async (data: {
    employeeCode: string;
    email: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
    position?: string;
    hourlyRate: string;
    walletAddress?: string;
    employmentType: 'full-time' | 'part-time' | 'contract';
    joinDate?: string;
    isActive: boolean;
  }) => {
    try {
      // Convert hourlyRate to number for API
      const payload = {
        ...data,
        hourlyRate: parseFloat(data.hourlyRate),
        departmentId: data.departmentId || null,
        position: data.position || null,
        joinDate: data.joinDate ? new Date(data.joinDate).toISOString() : null,
      };

      const url = employee ? `/api/employees/${employee.id}` : '/api/employees';
      const method = employee ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save employee');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to save employee');
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <EmployeeForm employee={employee} onSubmit={handleSubmit} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
