import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get detailed employee attendance history (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Verify employee exists and belongs to the same organization
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        organizationId: user.organizationId || '',
      },
      include: {
        department: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      dateFilter = {
        gte: start,
      };
    }

    // Fetch AttendanceRecord data (timer-based system)
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId: employee.id,
        date: dateFilter,
      },
      include: {
        operationLogs: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        timeCorrections: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        timerEvents: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Fetch simple Attendance data
    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        userId: employee.id,
        date: dateFilter,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRecords = attendanceRecords.map(record => ({
      ...record,
      checkInTime: record.checkInTime.toString(),
      checkOutTime: record.checkOutTime?.toString() || null,
      operationLogs: record.operationLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toString(),
      })),
      timeCorrections: record.timeCorrections.map(correction => ({
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
        approvedAt: correction.approvedAt?.toString() || null,
      })),
      timerEvents: record.timerEvents.map(event => ({
        ...event,
        timestamp: event.timestamp.toString(),
        endTimestamp: event.endTimestamp?.toString() || null,
      })),
    }));

    // Calculate summary statistics
    const summary = {
      totalDays: attendanceRecords.length,
      totalWorkMinutes: attendanceRecords.reduce(
        (sum, r) => sum + r.totalWorkMinutes,
        0
      ),
      totalCorrections: attendanceRecords.reduce(
        (sum, r) => sum + r.timeCorrections.length,
        0
      ),
      totalOperations: attendanceRecords.reduce(
        (sum, r) => sum + r.operationLogs.length,
        0
      ),
      attendanceStatus: attendances.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department?.name,
        position: employee.position,
      },
      summary,
      attendanceRecords: serializedRecords,
      attendances,
    });
  } catch (error) {
    console.error('Error fetching employee history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee history' },
      { status: 500 }
    );
  }
}
