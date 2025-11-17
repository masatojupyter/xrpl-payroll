import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { PayrollPreviewSchema } from '@/lib/validators/payroll';

/**
 * POST /api/payroll/preview
 * Preview payroll calculation for a single employee before processing
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
    const validatedData = PayrollPreviewSchema.parse(body);

    const { employeeId, period, includeOvertime, overtimeMultiplier } = validatedData;

    // Parse period (format: YYYY-MM)
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch employee
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        organizationId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch attendance records separately
    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        userId: employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
        checkOutTime: {
          not: null,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate payroll details
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    const attendanceDetails = [];

    for (const attendance of attendances) {
      // Convert BigInt timestamps to Date objects
      const checkIn = new Date(Number(attendance.checkInTime) * 1000);
      const checkOut = new Date(Number(attendance.checkOutTime) * 1000);
      
      const workedHours = attendance.totalWorkMinutes / 60;
      totalHours += workedHours;

      // Calculate overtime (assuming 8 hours is standard workday)
      const standardHours = 8;
      let dayRegularHours = 0;
      let dayOvertimeHours = 0;

      if (includeOvertime && workedHours > standardHours) {
        dayOvertimeHours = workedHours - standardHours;
        dayRegularHours = standardHours;
        overtimeHours += dayOvertimeHours;
        regularHours += dayRegularHours;
      } else {
        dayRegularHours = workedHours;
        regularHours += workedHours;
      }

      attendanceDetails.push({
        date: attendance.date.toISOString().split('T')[0],
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        totalMinutes: attendance.totalWorkMinutes,
        totalHours: workedHours.toFixed(2),
        regularHours: dayRegularHours.toFixed(2),
        overtimeHours: dayOvertimeHours.toFixed(2),
      });
    }

    // Calculate amounts
    const hourlyRate = parseFloat(employee.hourlyRate.toString());
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
    const totalAmount = regularPay + overtimePay;

    // Check if payroll already exists
    const existingPayroll = await prisma.payroll.findUnique({
      where: {
        employeeId_period: {
          employeeId,
          period,
        },
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        department: employee.department,
        hourlyRate: hourlyRate.toFixed(2),
        walletAddress: employee.walletAddress,
      },
      period,
      calculation: {
        totalHours: totalHours.toFixed(2),
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        attendanceCount: attendanceDetails.length,
        overtimeMultiplier,
      },
      attendanceDetails,
      existingPayroll: existingPayroll
        ? {
            id: existingPayroll.id,
            status: existingPayroll.status,
            totalAmount: existingPayroll.totalAmount.toString(),
            createdAt: existingPayroll.createdAt.toISOString(),
            paidAt: existingPayroll.paidAt?.toISOString(),
            transactionHash: existingPayroll.transactionHash,
          }
        : null,
    });
  } catch (error) {
    console.error('Payroll preview error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to preview payroll' },
      { status: 500 }
    );
  }
}
