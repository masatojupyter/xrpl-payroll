// Type definitions for PDF report data

export interface EmployeeInfo {
  employeeId: string;
  name: string;
  department: string;
}

export interface AttendanceRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  overtimeHours: number | null;
}

export interface AttendanceSummary {
  totalDays: number;
  totalHours: number;
  overtimeHours: number;
  absentDays: number;
}

export interface MonthlyAttendanceData {
  startDate: string;
  endDate: string;
  employee: EmployeeInfo;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
}

export interface PaymentAllowance {
  name: string;
  amount: number;
}

export interface PaymentDeduction {
  name: string;
  amount: number;
}

export interface PaymentBreakdown {
  baseSalary: number;
  allowances: PaymentAllowance[];
  grossPay: number;
  deductions: PaymentDeduction[];
  totalDeductions: number;
}

export interface CryptoPayment {
  walletAddress: string;
  amount: string;
  txHash: string;
}

export interface PayslipData {
  paymentDate: string;
  employee: EmployeeInfo;
  breakdown: PaymentBreakdown;
  netPay: number;
  cryptoPayment?: CryptoPayment;
}

export interface MonthlyPayment {
  month: string;
  grossPay: number;
  deductions: number;
  netPay: number;
}

export interface DeductionBreakdown {
  name: string;
  amount: number;
}

export interface AnnualSummary {
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  paymentCount: number;
}

export interface AnnualPaymentData {
  startDate: string;
  endDate: string;
  employee: EmployeeInfo;
  summary: AnnualSummary;
  monthlyBreakdown: MonthlyPayment[];
  deductionBreakdown: DeductionBreakdown[];
}
