import { z } from 'zod';

// Employee creation schema
export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(50),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  departmentId: z.string().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  hourlyRate: z.number().positive('Hourly rate must be positive'),
  walletAddress: z.string().optional().nullable().transform(val => val === '' ? null : val),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).default('full-time'),
  joinDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

// Employee update schema (all fields optional except constraints)
export const updateEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  departmentId: z.string().nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  hourlyRate: z.number().positive().optional(),
  walletAddress: z.string().optional().nullable().transform(val => val === '' ? null : val),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).optional(),
  joinDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// Query parameters schema for listing
export const employeeQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  search: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'joinDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;
