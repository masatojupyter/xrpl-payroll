import { z } from 'zod';

// Payroll calculation validator
export const PayrollCalculateSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee is required'),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in format YYYY-MM'),
  includeOvertime: z.boolean().default(true),
  overtimeMultiplier: z.number().min(1).max(3).default(1.5),
});

export type PayrollCalculateInput = z.infer<typeof PayrollCalculateSchema>;

// Payroll preview validator
export const PayrollPreviewSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in format YYYY-MM'),
  includeOvertime: z.boolean().default(true),
  overtimeMultiplier: z.number().min(1).max(3).default(1.5),
});

export type PayrollPreviewInput = z.infer<typeof PayrollPreviewSchema>;

// Payroll process validator
export const PayrollProcessSchema = z.object({
  payrollIds: z.array(z.string()).min(1, 'At least one payroll ID is required'),
  batchSize: z.number().min(1).max(100).default(10),
});

export type PayrollProcessInput = z.infer<typeof PayrollProcessSchema>;

// Payroll history query validator
export const PayrollHistoryQuerySchema = z.object({
  employeeId: z.string().optional(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  status: z.enum(['pending', 'processing', 'paid', 'failed']).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  sortBy: z.enum(['createdAt', 'paidAt', 'totalAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PayrollHistoryQuery = z.infer<typeof PayrollHistoryQuerySchema>;

// XRP Payroll - Batch creation validator
export const PayrollCreateBatchSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
  calculations: z
    .array(
      z.object({
        employeeId: z.string().cuid('Invalid employee ID format'),
        totalHours: z.string().min(1, 'Total hours is required'),
        totalAmountUSD: z.string().min(1, 'Total amount is required'),
      })
    )
    .min(1, 'At least one calculation is required'),
});

export type PayrollCreateBatchInput = z.infer<typeof PayrollCreateBatchSchema>;

// XRP Payroll - Process payment validator
export const PayrollProcessPaymentSchema = z.object({
  payrollIds: z
    .array(z.string().cuid('Invalid payroll ID format'))
    .min(1, 'At least one payroll ID is required')
    .max(50, 'Maximum 50 payroll records can be processed at once'),
  force: z
    .boolean()
    .optional()
    .describe('Force payment even if some validations fail'),
});

export type PayrollProcessPaymentInput = z.infer<typeof PayrollProcessPaymentSchema>;

// XRP Payroll - Retry payment validator
export const PayrollRetryPaymentSchema = z.object({
  payrollIds: z
    .array(z.string().cuid('Invalid payroll ID format'))
    .min(1, 'At least one payroll ID is required')
    .max(20, 'Maximum 20 failed payments can be retried at once'),
});

export type PayrollRetryPaymentInput = z.infer<typeof PayrollRetryPaymentSchema>;

// XRP Payroll - List query validator
export const PayrollListQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format')
    .optional(),
  status: z
    .enum(['pending', 'paid', 'failed'], {
      message: 'Status must be pending, paid, or failed',
    })
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .optional(),
});

export type PayrollListQuery = z.infer<typeof PayrollListQuerySchema>;

// XRP Wallet address validator
export const WalletAddressSchema = z.object({
  walletAddress: z
    .string()
    .regex(
      /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
      'Invalid XRP wallet address format. Must start with "r" and be 25-35 characters long'
    ),
});

export type WalletAddressInput = z.infer<typeof WalletAddressSchema>;
