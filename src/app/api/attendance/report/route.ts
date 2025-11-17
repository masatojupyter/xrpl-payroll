import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/../prisma/client";
import { Prisma } from "@prisma/client";
import { attendanceReportSchema } from "@/lib/validators/attendance";

// Helper function to calculate work hours from timestamps
function calculateWorkHours(checkInTime: bigint, checkOutTime: bigint | null): number {
  if (!checkOutTime) return 0;
  const checkInMs = Number(checkInTime) * 1000;
  const checkOutMs = Number(checkOutTime) * 1000;
  const totalMinutes = (checkOutMs - checkInMs) / (1000 * 60);
  return Math.max(0, totalMinutes / 60); // Return hours, minimum 0
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to format time as HH:MM
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

// Helper function to convert report data to CSV
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // CSV headers
  const headers = [
    'Employee Code',
    'Employee Name',
    'Email',
    'Department',
    'Date',
    'Check In',
    'Check Out',
    'Break Minutes',
    'Work Hours',
    'Status'
  ];

  // CSV rows
  const rows = data.map(item => [
    item.employee.employeeCode,
    `${item.employee.firstName} ${item.employee.lastName}`,
    item.employee.email,
    item.employee.department?.name || 'N/A',
    formatDate(new Date(item.date)),
    formatTime(new Date(item.checkIn)),
    item.checkOut ? formatTime(new Date(item.checkOut)) : 'Not checked out',
    item.breakMinutes.toString(),
    item.workHours.toFixed(2),
    item.status
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

// GET - Generate attendance report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization and role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        email: true,
        organizationId: true,
        role: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedParams = attendanceReportSchema.parse(searchParams);

    const {
      employeeId,
      departmentId,
      startDate,
      endDate,
      format,
    } = validatedParams;

    // Build where clause for AttendanceRecord
    const where: Prisma.AttendanceRecordWhereInput = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    // Get user IDs for the organization
    let userIds: string[] = [];

    if (user.role !== 'admin') {
      // For employees, only show their own attendance records
      userIds = [user.id];
    } else {
      // For admins, get all user IDs in the organization
      const employees = await prisma.employee.findMany({
        where: { 
          organizationId: user.organizationId,
          ...(employeeId ? { id: employeeId } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        select: { email: true },
      });

      const users = await prisma.user.findMany({
        where: { email: { in: employees.map(e => e.email) } },
        select: { id: true },
      });

      userIds = users.map(u => u.id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({
        data: [],
        summary: {
          totalDays: 0,
          totalWorkHours: 0,
          averageHoursPerDay: 0,
          statusBreakdown: {
            COMPLETED: 0,
            IN_PROGRESS: 0,
            CORRECTED: 0,
          },
          dateRange: {
            startDate,
            endDate,
          },
        },
        filters: {
          employeeId: employeeId || null,
          departmentId: departmentId || null,
          startDate,
          endDate,
        },
      });
    }

    where.userId = { in: userIds };

    // Fetch attendance records
    const attendances = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: "asc" }, { checkInTime: "asc" }],
    });

    // Get user details for the attendance records
    const users = await prisma.user.findMany({
      where: { id: { in: attendances.map(a => a.userId) } },
      select: { id: true, email: true },
    });

    const employees = await prisma.employee.findMany({
      where: { 
        email: { in: users.map(u => u.email) },
        organizationId: user.organizationId,
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

    // Create user to employee mapping
    const userToEmployeeMap = new Map();
    for (const user of users) {
      const employee = employees.find(e => e.email === user.email);
      if (employee) {
        userToEmployeeMap.set(user.id, employee);
      }
    }

    // Calculate work hours for each record and prepare summary
    let totalWorkHours = 0;
    let totalDays = 0;
    const statusCounts: Record<string, number> = {
      COMPLETED: 0,
      IN_PROGRESS: 0,
      CORRECTED: 0,
    };

    const attendancesWithHours = attendances.map((attendance) => {
      const workHours = attendance.totalWorkMinutes / 60;
      totalWorkHours += workHours;
      totalDays++;
      statusCounts[attendance.status] = (statusCounts[attendance.status] || 0) + 1;

      const employee = userToEmployeeMap.get(attendance.userId);
      const checkInTime = new Date(Number(attendance.checkInTime) * 1000);
      const checkOutTime = attendance.checkOutTime ? new Date(Number(attendance.checkOutTime) * 1000) : null;

      return {
        id: attendance.id,
        date: attendance.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        breakMinutes: 0, // Not available in current schema
        status: attendance.status,
        workHours: Number(workHours.toFixed(2)),
        employee: employee || {
          id: '',
          employeeCode: 'N/A',
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
          department: null,
        },
      };
    });

    // Prepare summary data
    const summary = {
      totalDays,
      totalWorkHours: Number(totalWorkHours.toFixed(2)),
      averageHoursPerDay: totalDays > 0 ? Number((totalWorkHours / totalDays).toFixed(2)) : 0,
      statusBreakdown: statusCounts,
      dateRange: {
        startDate,
        endDate,
      },
    };

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(attendancesWithHours);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json({
      data: attendancesWithHours,
      summary,
      filters: {
        employeeId: employeeId || null,
        departmentId: departmentId || null,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Error generating attendance report:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
