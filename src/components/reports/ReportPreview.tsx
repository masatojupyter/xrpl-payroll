'use client';

import { format } from 'date-fns';

// Type definitions for report data structures
interface EmployeeInfo {
  employeeId: string;
  name: string;
  department: string;
}

interface AttendanceRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | string | null;
  overtimeHours: number | string | null;
}

interface MonthlyAttendanceData {
  employee: EmployeeInfo;
  startDate: string;
  endDate: string;
  summary: {
    totalDays: number;
    totalHours: number | string;
    overtimeHours: number | string;
    absentDays: number;
  };
  records: AttendanceRecord[];
}

interface Allowance {
  name: string;
  amount: number;
}

interface Deduction {
  name: string;
  amount: number;
}

interface PayslipData {
  employee: EmployeeInfo;
  paymentDate: string;
  breakdown: {
    baseSalary: number;
    allowances: Allowance[];
    grossPay: number;
    deductions: Deduction[];
    totalDeductions: number;
  };
  netPay: number;
  cryptoPayment?: {
    walletAddress: string;
    amount: string;
    txHash: string;
  };
}

interface MonthlyBreakdown {
  month: string;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface AnnualSummaryData {
  employee: EmployeeInfo;
  startDate: string;
  endDate: string;
  summary: {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    paymentCount: number;
  };
  monthlyBreakdown: MonthlyBreakdown[];
  deductionBreakdown: Deduction[];
}

type ReportData = MonthlyAttendanceData | PayslipData | AnnualSummaryData | null;

interface ReportPreviewProps {
  data: ReportData;
  reportType: 'monthly_attendance' | 'payslip' | 'annual_payment_summary';
}

// Helper function to convert number or string to number
const toNumber = (value: number | string): number => {
  return typeof value === 'string' ? parseFloat(value) : value;
};

export function ReportPreview({ data, reportType }: ReportPreviewProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Please generate a report to display preview</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Report Preview</h2>
      
      {reportType === 'monthly_attendance' && <MonthlyAttendancePreview data={data as MonthlyAttendanceData} />}
      {reportType === 'payslip' && <PayslipPreview data={data as PayslipData} />}
      {reportType === 'annual_payment_summary' && <AnnualSummaryPreview data={data as AnnualSummaryData} />}
    </div>
  );
}

function MonthlyAttendancePreview({ data }: { data: MonthlyAttendanceData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Employee ID:</span>
            <span className="ml-2 font-medium">{data.employee.employeeId}</span>
          </div>
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{data.employee.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Department:</span>
            <span className="ml-2 font-medium">{data.employee.department}</span>
          </div>
          <div>
            <span className="text-gray-600">Period:</span>
            <span className="ml-2 font-medium">
              {format(new Date(data.startDate), 'yyyy/MM/dd')} - {format(new Date(data.endDate), 'yyyy/MM/dd')}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Work Days</p>
            <p className="text-2xl font-bold text-blue-600">{data.summary.totalDays} days</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Work Hours</p>
            <p className="text-2xl font-bold text-green-600">{toNumber(data.summary.totalHours).toFixed(1)}h</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Overtime Hours</p>
            <p className="text-2xl font-bold text-orange-600">{toNumber(data.summary.overtimeHours).toFixed(1)}h</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Absent Days</p>
            <p className="text-2xl font-bold text-red-600">{data.summary.absentDays} days</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Attendance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Check In</th>
                <th className="px-4 py-2 text-left">Check Out</th>
                <th className="px-4 py-2 text-right">Work Hours</th>
                <th className="px-4 py-2 text-right">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {data.records.slice(0, 10).map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{format(new Date(record.date), 'MM/dd')}</td>
                  <td className="px-4 py-2">{record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</td>
                  <td className="px-4 py-2">{record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</td>
                  <td className="px-4 py-2 text-right">{record.workHours ? `${toNumber(record.workHours).toFixed(1)}h` : '-'}</td>
                  <td className="px-4 py-2 text-right">{record.overtimeHours ? `${toNumber(record.overtimeHours).toFixed(1)}h` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.records.length > 10 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              ... {data.records.length - 10} more records
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PayslipPreview({ data }: { data: PayslipData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Employee ID:</span>
            <span className="ml-2 font-medium">{data.employee.employeeId}</span>
          </div>
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{data.employee.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Department:</span>
            <span className="ml-2 font-medium">{data.employee.department}</span>
          </div>
          <div>
            <span className="text-gray-600">Payment Date:</span>
            <span className="ml-2 font-medium">{format(new Date(data.paymentDate), 'yyyy/MM/dd')}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Earnings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span>Base Salary</span>
            <span className="font-medium">¥{data.breakdown.baseSalary.toLocaleString()}</span>
          </div>
          {data.breakdown.allowances.map((allowance, index) => (
            <div key={index} className="flex justify-between py-2 border-b">
              <span>{allowance.name}</span>
              <span className="font-medium">¥{allowance.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold bg-gray-50">
            <span>Total Earnings</span>
            <span>¥{data.breakdown.grossPay.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Deductions</h3>
        <div className="space-y-2 text-sm">
          {data.breakdown.deductions.map((deduction, index) => (
            <div key={index} className="flex justify-between py-2 border-b">
              <span>{deduction.name}</span>
              <span className="font-medium">¥{deduction.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold bg-gray-50">
            <span>Total Deductions</span>
            <span>¥{data.breakdown.totalDeductions.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Net Pay</span>
          <span className="text-2xl font-bold text-blue-600">¥{data.netPay.toLocaleString()}</span>
        </div>
      </div>

      {data.cryptoPayment && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Cryptocurrency Payment Information</h3>
          <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <span className="text-gray-600">Wallet Address:</span>
              <p className="font-mono text-xs mt-1 break-all">{data.cryptoPayment.walletAddress}</p>
            </div>
            <div>
              <span className="text-gray-600">Amount (XRP):</span>
              <span className="ml-2 font-medium">{data.cryptoPayment.amount}</span>
            </div>
            <div>
              <span className="text-gray-600">Transaction Hash:</span>
              <p className="font-mono text-xs mt-1 break-all">{data.cryptoPayment.txHash}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnualSummaryPreview({ data }: { data: AnnualSummaryData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Employee ID:</span>
            <span className="ml-2 font-medium">{data.employee.employeeId}</span>
          </div>
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{data.employee.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Department:</span>
            <span className="ml-2 font-medium">{data.employee.department}</span>
          </div>
          <div>
            <span className="text-gray-600">Period:</span>
            <span className="ml-2 font-medium">
              {format(new Date(data.startDate), 'yyyy/MM')} - {format(new Date(data.endDate), 'yyyy/MM')}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Annual Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Gross Pay</p>
            <p className="text-xl font-bold text-blue-600">¥{data.summary.totalGrossPay.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Deductions</p>
            <p className="text-xl font-bold text-orange-600">¥{data.summary.totalDeductions.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Net Pay</p>
            <p className="text-xl font-bold text-green-600">¥{data.summary.totalNetPay.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Payment Count</p>
            <p className="text-xl font-bold text-purple-600">{data.summary.paymentCount} times</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Monthly Payment Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Gross Pay</th>
                <th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyBreakdown.map((month, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{format(new Date(month.month), 'yyyy/MM')}</td>
                  <td className="px-4 py-2 text-right">¥{month.grossPay.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">¥{month.deductions.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">¥{month.netPay.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Deduction Breakdown (Annual Total)</h3>
        <div className="space-y-2 text-sm">
          {data.deductionBreakdown.map((deduction, index) => (
            <div key={index} className="flex justify-between py-2 border-b">
              <span>{deduction.name}</span>
              <span className="font-medium">¥{deduction.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
