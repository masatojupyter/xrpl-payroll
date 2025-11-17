import { z } from 'zod';

export const reportTypeSchema = z.enum([
  'monthly_attendance',
  'payslip',
  'annual_payment_summary'
]);

export const reportGenerateSchema = z.object({
  type: reportTypeSchema,
  employeeId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  format: z.enum(['pdf', 'preview']).default('preview')
});

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportGenerateInput = z.infer<typeof reportGenerateSchema>;
