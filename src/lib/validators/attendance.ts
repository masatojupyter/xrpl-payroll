import { z } from "zod";

// Attendance status enum
export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "leave",
  "holiday",
]);

// Check-in validation
export const checkInSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  checkIn: z.string().datetime().optional(), // ISO 8601 format, defaults to now
  date: z.string().date().optional(), // YYYY-MM-DD format, defaults to today
});

// Check-out validation
export const checkOutSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  checkOut: z.string().datetime().optional(), // ISO 8601 format, defaults to now
  breakMinutes: z.number().int().min(0).max(480).default(0), // Max 8 hours break
  date: z.string().date().optional(), // YYYY-MM-DD format, defaults to today
});

// Create attendance validation
export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  date: z.string().date(), // YYYY-MM-DD format
  checkIn: z.string().datetime(), // ISO 8601 format
  checkOut: z.string().datetime().optional(),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  status: attendanceStatusSchema.default("present"),
});

// Update attendance validation
export const updateAttendanceSchema = z.object({
  date: z.string().date().optional(), // YYYY-MM-DD format
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  breakMinutes: z.number().int().min(0).max(480).optional(),
  status: attendanceStatusSchema.optional(),
  notes: z.string().optional(),
});

// Query parameters for listing/filtering
export const attendanceQuerySchema = z.object({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().date().optional(), // YYYY-MM-DD format
  endDate: z.string().date().optional(), // YYYY-MM-DD format
  status: attendanceStatusSchema.optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(5000)).default(10),
});

// Report parameters
export const attendanceReportSchema = z.object({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().date(), // YYYY-MM-DD format - required
  endDate: z.string().date(), // YYYY-MM-DD format - required
  format: z.enum(["json", "csv"]).default("json"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type AttendanceReportQuery = z.infer<typeof attendanceReportSchema>;
