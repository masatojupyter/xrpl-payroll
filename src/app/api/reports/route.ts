import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import {
  MonthlyAttendanceReport,
  PayslipReport,
  AnnualPaymentSummary,
} from '@/lib/pdf/templates';
import { reportGenerateSchema } from '@/lib/validators/report';
import { differenceInHours } from 'date-fns';
import type {
  MonthlyAttendanceData,
  PayslipData,
  AnnualPaymentData,
} from '@/lib/pdf/types';
import type { Employee, Organization, Department } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = reportGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { type, employeeId, startDate, endDate, format } = validation.data;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Get employee data
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { 
        organization: true,
        department: true
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    let reportData: MonthlyAttendanceData | PayslipData | AnnualPaymentData;
    let reportDocument: React.ReactElement;

    switch (type) {
      case 'monthly_attendance':
        reportData = await generateMonthlyAttendanceData(
          employee,
          new Date(startDate),
          new Date(endDate)
        );
        reportDocument = React.createElement(MonthlyAttendanceReport, { data: reportData });
        break;

      case 'payslip':
        reportData = await generatePayslipData(
          employee,
          new Date(startDate)
        );
        reportDocument = React.createElement(PayslipReport, { data: reportData as PayslipData });
        break;

      case 'annual_payment_summary':
        reportData = await generateAnnualPaymentData(
          employee,
          new Date(startDate),
          new Date(endDate)
        );
        reportDocument = React.createElement(AnnualPaymentSummary, { data: reportData as AnnualPaymentData });
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Return preview data or PDF
    if (format === 'preview') {
      return NextResponse.json({ data: reportData });
    } else {
      // Generate PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await renderToStream(reportDocument as any);
      
      return new NextResponse(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}_${new Date().toISOString()}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate monthly attendance data
async function generateMonthlyAttendanceData(
  employee: Employee & { organization: Organization | null; department: Department | null },
  startDate: Date,
  endDate: Date
): Promise<MonthlyAttendanceData> {
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      userId: employee.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate summary
  let totalDays = 0;
  let totalHours = 0;
  let overtimeHours = 0;
  let absentDays = 0;

  const records = attendanceRecords.map((record) => {
    // Convert BigInt timestamps to milliseconds for Date objects
    const checkInDate = record.checkInTime ? new Date(Number(record.checkInTime) * 1000) : null;
    const checkOutDate = record.checkOutTime ? new Date(Number(record.checkOutTime) * 1000) : null;
    
    // Calculate work hours from totalWorkMinutes
    const workHours = record.totalWorkMinutes > 0 ? record.totalWorkMinutes / 60 : null;
    
    const overtime = workHours && workHours > 8 ? workHours - 8 : 0;

    if (workHours && workHours > 0) {
      totalDays++;
      totalHours += workHours;
      overtimeHours += overtime;
    } else if (record.attendanceType === 'absent') {
      absentDays++;
    }

    return {
      date: record.date.toISOString(),
      checkIn: checkInDate?.toISOString() || null,
      checkOut: checkOutDate?.toISOString() || null,
      workHours,
      overtimeHours: overtime,
    };
  });

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    employee: {
      employeeId: employee.employeeCode,
      name: `${employee.lastName} ${employee.firstName}`,
      department: employee.department?.name || 'N/A',
    },
    summary: {
      totalDays,
      totalHours,
      overtimeHours,
      absentDays,
    },
    records,
  };
}

// Helper function to generate payslip data
async function generatePayslipData(
  employee: Employee & { organization: Organization | null; department: Department | null },
  paymentDate: Date
): Promise<PayslipData> {
  const periodString = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

  const payrollRecord = await prisma.payroll.findFirst({
    where: {
      employeeId: employee.id,
      period: periodString,
    },
  });

  if (!payrollRecord) {
    throw new Error('Payroll record not found for this period');
  }

  // Calculate breakdown (simplified since schema doesn't have detailed breakdown)
  const totalAmount = Number(payrollRecord.totalAmount);
  const baseSalary = totalAmount * 0.85; // 85% base
  const allowances = [
    { name: '通勤手当', amount: totalAmount * 0.1 },
    { name: '住宅手当', amount: totalAmount * 0.05 },
  ];
  
  const deductions = [
    { name: '社会保険料', amount: totalAmount * 0.15 },
    { name: '所得税', amount: totalAmount * 0.05 },
  ];
  
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const grossPay = totalAmount + totalDeductions;
  const netPay = totalAmount;

  const cryptoPayment = payrollRecord.transactionHash
    ? {
        walletAddress: employee.walletAddress || '',
        amount: totalAmount.toString(),
        txHash: payrollRecord.transactionHash,
      }
    : undefined;

  return {
    paymentDate: payrollRecord.paidAt?.toISOString() || paymentDate.toISOString(),
    employee: {
      employeeId: employee.employeeCode,
      name: `${employee.lastName} ${employee.firstName}`,
      department: employee.department?.name || 'N/A',
    },
    breakdown: {
      baseSalary,
      allowances,
      grossPay,
      deductions,
      totalDeductions,
    },
    netPay,
    cryptoPayment,
  };
}

// Helper function to generate annual payment data
async function generateAnnualPaymentData(
  employee: Employee & { organization: Organization | null; department: Department | null },
  startDate: Date,
  endDate: Date
): Promise<AnnualPaymentData> {
  const payrollRecords = await prisma.payroll.findMany({
    where: {
      employeeId: employee.id,
      period: {
        gte: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        lte: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`,
      },
    },
    orderBy: { period: 'asc' },
  });

  // Calculate summary
  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;
  const paymentCount = payrollRecords.length;

  // Group by month
  const monthlyMap = new Map<string, { grossPay: number; deductions: number; netPay: number }>();
  const deductionMap = new Map<string, number>();

  payrollRecords.forEach((record) => {
    const amount = Number(record.totalAmount);
    const deductionAmount = amount * 0.2; // Simplified 20% deduction
    const grossAmount = amount + deductionAmount;
    
    totalGrossPay += grossAmount;
    totalDeductions += deductionAmount;
    totalNetPay += amount;

    // Parse period (YYYY-MM format)
    const monthKey = `${record.period}-01`;
    const existing = monthlyMap.get(monthKey) || { grossPay: 0, deductions: 0, netPay: 0 };
    monthlyMap.set(monthKey, {
      grossPay: existing.grossPay + grossAmount,
      deductions: existing.deductions + deductionAmount,
      netPay: existing.netPay + amount,
    });

    // Simplified deductions
    const socialInsurance = deductionAmount * 0.75;
    const incomeTax = deductionAmount * 0.25;
    
    deductionMap.set('社会保険料', (deductionMap.get('社会保険料') || 0) + socialInsurance);
    deductionMap.set('所得税', (deductionMap.get('所得税') || 0) + incomeTax);
  });

  const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  const deductionBreakdown = Array.from(deductionMap.entries()).map(([name, amount]) => ({
    name,
    amount,
  }));

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    employee: {
      employeeId: employee.employeeCode,
      name: `${employee.lastName} ${employee.firstName}`,
      department: employee.department?.name || 'N/A',
    },
    summary: {
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      paymentCount,
    },
    monthlyBreakdown,
    deductionBreakdown,
  };
}
