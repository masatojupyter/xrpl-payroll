import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { PayrollCalculateSchema } from '@/lib/validators/payroll';
import { logPayrollCalculation } from '@/lib/xrp/payment-logger';

/**
 * POST /api/payroll/calculate
 * Calculate payroll for employees for a specific period
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId;

    const body = await request.json();
    const validatedData = PayrollCalculateSchema.parse(body);

    const { employeeIds, period, includeOvertime, overtimeMultiplier } = validatedData;

    // Parse period (format: YYYY-MM)
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
        isActive: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No active employees found' },
        { status: 404 }
      );
    }

    const calculations = [];
    const employeeApprovalStatus = [];

    for (const employee of employees) {
      // Get approved attendance records for this employee
      const approvedAttendances = await prisma.attendanceRecord.findMany({
        where: {
          userId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          attendanceType: 'present',
          approvalStatus: 'APPROVED', // Only include approved attendance
        },
      });

      // Get total attendance counts for this employee
      const totalAttendanceCount = await prisma.attendanceRecord.count({
        where: {
          userId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          attendanceType: 'present',
        },
      });

      const approvedAttendanceCount = approvedAttendances.length;
      const pendingAttendanceCount = await prisma.attendanceRecord.count({
        where: {
          userId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          attendanceType: 'present',
          approvalStatus: { in: ['PENDING', 'REJECTED'] },
        },
      });

      // Add approval status information
      employeeApprovalStatus.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        totalRecords: totalAttendanceCount,
        approvedRecords: approvedAttendanceCount,
        pendingRecords: pendingAttendanceCount,
        hasUnapproved: pendingAttendanceCount > 0,
      });

      // Calculate total hours worked
      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;

      for (const attendance of approvedAttendances) {
        if (!attendance.checkOutTime) continue;

        // Convert Unix timestamps to milliseconds
        const checkInMs = Number(attendance.checkInTime) * 1000;
        const checkOutMs = Number(attendance.checkOutTime) * 1000;
        
        const workedMinutes = attendance.totalWorkMinutes;
        const workedHours = workedMinutes / 60;
        totalHours += workedHours;

        // Calculate overtime (assuming 8 hours is standard workday)
        const standardHours = 8;
        if (includeOvertime && workedHours > standardHours) {
          overtimeHours += workedHours - standardHours;
          regularHours += standardHours;
        } else {
          regularHours += workedHours;
        }
      }

      // Calculate total amount
      const hourlyRate = parseFloat(employee.hourlyRate.toString());
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const totalAmount = regularPay + overtimePay;

      calculations.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        period,
        totalHours: totalHours.toFixed(2),
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        hourlyRate: hourlyRate.toFixed(2),
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        attendanceCount: approvedAttendances.length,
      });
    }

    // Check if any employee has unapproved attendance
    const hasUnapprovedAttendance = employeeApprovalStatus.some(
      (status) => status.hasUnapproved
    );

    const summary = {
      totalEmployees: calculations.length,
      totalAmount: calculations
        .reduce((sum, calc) => sum + parseFloat(calc.totalAmount), 0)
        .toFixed(2),
      totalHours: calculations
        .reduce((sum, calc) => sum + parseFloat(calc.totalHours), 0)
        .toFixed(2),
    };

    // Log successful calculation
    await logPayrollCalculation({
      userId: session.user.id,
      organizationId,
      period,
      employeeCount: summary.totalEmployees,
      totalAmountUSD: summary.totalAmount,
      totalHours: summary.totalHours,
      metadata: {
        hasUnapprovedAttendance,
        employeeApprovalStatus,
      },
    });

    return NextResponse.json({
      success: true,
      period,
      calculations,
      summary,
      employeeApprovalStatus,
      warnings: hasUnapprovedAttendance
        ? [
            'Some employees have unapproved attendance records that are not included in the calculation.',
          ]
        : [],
    });
  } catch (error) {
    console.error('Payroll calculation error:', error);

    // Log calculation failure
    const session = await auth();
    if (session?.user?.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email || '' },
          select: { organizationId: true },
        });

        await logPayrollCalculation({
          userId: session.user.id,
          organizationId: user?.organizationId || undefined,
          period: '',
          employeeCount: 0,
          totalAmountUSD: '0',
          totalHours: '0',
          level: 'error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (logError) {
        console.error('Failed to log calculation error:', logError);
      }
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}
