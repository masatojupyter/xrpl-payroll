'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

// Validation schema
const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(50),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  departmentId: z.string().optional(),
  position: z.string().max(100).optional(),
  hourlyRate: z.string().min(1, 'Hourly rate is required'),
  walletAddress: z.string()
    .optional()
    .refine((val) => !val || /^(r[a-zA-Z0-9]{24,34}|0x[a-fA-F0-9]{40})$/.test(val), {
      message: 'Invalid wallet address format (XRP or Ethereum)',
    }),
  employmentType: z.enum(['full-time', 'part-time', 'contract']),
  joinDate: z.string().optional(),
  isActive: z.boolean(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

type Department = {
  id: string;
  name: string;
};

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

type EmployeeFormProps = {
  employee?: Employee | null;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch departments for dropdown
  const { data: departments } = useSWR<Department[]>('/api/departments', fetcher);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeCode: employee?.employeeCode || '',
      email: employee?.email || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      departmentId: employee?.departmentId || '',
      position: employee?.position || '',
      hourlyRate: employee?.hourlyRate || '',
      walletAddress: employee?.walletAddress || '',
      employmentType: employee?.employmentType || 'full-time',
      joinDate: employee?.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
      isActive: employee?.isActive ?? true,
    },
  });

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      reset({
        employeeCode: employee.employeeCode,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        departmentId: employee.departmentId || '',
        position: employee.position || '',
        hourlyRate: employee.hourlyRate,
        walletAddress: employee.walletAddress,
        employmentType: employee.employmentType,
        joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
        isActive: employee.isActive,
      });
    }
  }, [employee, reset]);

  const handleFormSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employee Code */}
        <div>
          <label htmlFor="employeeCode" className="block text-sm font-medium text-gray-700 mb-1">
            Employee Code <span className="text-red-500">*</span>
          </label>
          <input
            {...register('employeeCode')}
            id="employeeCode"
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.employeeCode ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="EMP001"
          />
          {errors.employeeCode && (
            <p className="mt-1 text-sm text-red-600">{errors.employeeCode.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('firstName')}
            id="firstName"
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('lastName')}
            id="lastName"
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>

        {/* Department */}
        <div>
          <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            {...register('departmentId')}
            id="departmentId"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No Department</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
            Position
          </label>
          <input
            {...register('position')}
            id="position"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Software Engineer"
          />
        </div>

        {/* Hourly Rate */}
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate ($) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('hourlyRate')}
            id="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.hourlyRate ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="50.00"
          />
          {errors.hourlyRate && (
            <p className="mt-1 text-sm text-red-600">{errors.hourlyRate.message}</p>
          )}
        </div>

        {/* Employment Type */}
        <div>
          <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-1">
            Employment Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('employmentType')}
            id="employmentType"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        {/* Join Date */}
        <div>
          <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 mb-1">
            Join Date
          </label>
          <input
            {...register('joinDate')}
            id="joinDate"
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <div className="flex items-center">
          <label htmlFor="isActive" className="flex items-center cursor-pointer">
            <input
              {...register('isActive')}
              id="isActive"
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Active Employee</span>
          </label>
        </div>
      </div>

      {/* Wallet Address (Full Width) */}
      <div>
        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Wallet Address (Optional)
        </label>
        <input
          {...register('walletAddress')}
          id="walletAddress"
          type="text"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
            errors.walletAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH or 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        />
        {errors.walletAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.walletAddress.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          XRP Ledger address (r...) or Ethereum address (0x...)
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
