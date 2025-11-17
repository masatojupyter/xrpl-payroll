import { z } from 'zod'

// Company Settings Schema
export const companySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().regex(/^[\d-+() ]+$/, 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email address'),
  taxId: z.string().optional(),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Please enter in MM-DD format'),
})

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>

// Attendance Settings Schema
export const attendanceSettingsSchema = z.object({
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter in HH:MM format'),
  workEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter in HH:MM format'),
  breakDuration: z.number().min(0, 'Break duration must be 0 or greater').max(480, 'Break duration must be 8 hours or less'),
  overtimeEnabled: z.boolean(),
  overtimeRate: z.number().min(1, 'Overtime rate must be 1 or greater').max(5, 'Overtime rate must be 5 or less'),
  weekendRate: z.number().min(1, 'Weekend rate must be 1 or greater').max(5, 'Weekend rate must be 5 or less'),
  autoCheckout: z.boolean(),
  autoCheckoutTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter in HH:MM format').optional(),
})

export type AttendanceSettingsInput = z.infer<typeof attendanceSettingsSchema>

// Payroll Settings Schema
export const payrollSettingsSchema = z.object({
  currency: z.enum(['XRP', 'XRP']),
  paymentDay: z.number().min(1, 'Payment day must be between 1 and 28').max(28, 'Payment day must be between 1 and 28'),
  taxRate: z.number().min(0, 'Tax rate must be 0 or greater').max(100, 'Tax rate must be 100 or less'),
  socialInsuranceRate: z.number().min(0, 'Social insurance rate must be 0 or greater').max(100, 'Social insurance rate must be 100 or less'),
  xrpWalletAddress: z.string().min(1, 'Wallet address is required'),
  minimumPayment: z.number().min(0, 'Minimum payment must be 0 or greater'),
  autoPayment: z.boolean(),
})

export type PayrollSettingsInput = z.infer<typeof payrollSettingsSchema>

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  attendanceReminders: z.boolean(),
  payrollAlerts: z.boolean(),
  systemUpdates: z.boolean(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter in HH:MM format'),
  reminderDays: z.array(z.number().min(0).max(6)).min(1, 'Please select at least one day'),
})

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>

// User Settings Schema
export const userSettingsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[\d-+() ]+$/, 'Please enter a valid phone number').optional(),
  language: z.enum(['ja', 'en']),
  timezone: z.string().min(1, 'Please select a timezone'),
  dateFormat: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']),
  timeFormat: z.enum(['24h', '12h']),
})

export type UserSettingsInput = z.infer<typeof userSettingsSchema>

// Combined settings type for API responses
export interface AllSettings {
  company: CompanySettingsInput
  attendance: AttendanceSettingsInput
  payroll: PayrollSettingsInput
  notification: NotificationSettingsInput
  user: UserSettingsInput
}
