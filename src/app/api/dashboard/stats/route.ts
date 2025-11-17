import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { CACHE_CONFIGS, getCacheHeaders, getOrgCacheKey, withCache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userType = session.user.userType;
    let organizationId: string | undefined;
    let employeeId: string | undefined;

    // Get organization based on user type
    if (userType === 'admin') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { organizationId: true },
      });
      organizationId = user?.organizationId || undefined;
    } else if (userType === 'employee') {
      const employee = await prisma.employee.findFirst({
        where: { email: session.user.email },
        select: { organizationId: true, id: true },
      });
      organizationId = employee?.organizationId || undefined;
      employeeId = employee?.id;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    // Use cache wrapper for the entire stats calculation
    const cacheKey = getOrgCacheKey(organizationId, 'dashboard:stats');
    
    const stats = await withCache(
      cacheKey,
      async () => {
        // Get current date and time boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Build where clauses based on user type
    const employeeWhere = userType === 'employee' && employeeId 
      ? { organizationId, id: employeeId }
      : { organizationId };

    // Get user IDs for attendance queries
    let userIds: string[] = [];
    if (userType === 'employee' && employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { email: true },
      });
      if (employee) {
        const user = await prisma.user.findUnique({
          where: { email: employee.email },
          select: { id: true },
        });
        if (user) userIds = [user.id];
      }
    } else {
      // Get all user IDs in organization
      const employees = await prisma.employee.findMany({
        where: { organizationId },
        select: { email: true },
      });
      const users = await prisma.user.findMany({
        where: { email: { in: employees.map(e => e.email) } },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    }

    const attendanceWhere = userIds.length > 0
      ? { userId: { in: userIds } }
      : { userId: 'none' }; // No matches if no users

    // Parallel query execution for better performance
    const [
      totalEmployees,
      activeEmployees,
      monthlyAttendances,
      todayAttendances,
    ] = await Promise.all([
      // Total employees count (for admin: all, for employee: just themselves)
      prisma.employee.count({
        where: employeeWhere,
      }),

      // Active employees count
      prisma.employee.count({
        where: {
          ...employeeWhere,
          isActive: true,
        },
      }),

      // Monthly attendances with work minutes
      prisma.attendanceRecord.findMany({
        where: {
          ...attendanceWhere,
          date: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
          status: { in: ['COMPLETED', 'CORRECTED'] },
        },
        select: {
          userId: true,
          totalWorkMinutes: true,
        },
      }),

      // Today's attendance
      prisma.attendanceRecord.findMany({
        where: {
          ...attendanceWhere,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        select: {
          userId: true,
          status: true,
        },
      }),
    ]);

    // Get user-to-employee mapping for rate calculation
    const userEmails = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    
    const employees = await prisma.employee.findMany({
      where: { 
        email: { in: userEmails.map(u => u.email) },
        organizationId,
      },
      select: {
        email: true,
        hourlyRate: true,
      },
    });

    const userIdToRateMap = new Map();
    for (const userEmail of userEmails) {
      const employee = employees.find(e => e.email === userEmail.email);
      if (employee) {
        userIdToRateMap.set(userEmail.id, employee.hourlyRate);
      }
    }

    // Calculate total work hours and expected payment
    let totalMonthlyHours = 0;
    let totalExpectedPayment = 0;

    for (const attendance of monthlyAttendances) {
      const workHours = attendance.totalWorkMinutes / 60;
      totalMonthlyHours += workHours;

      const hourlyRate = userIdToRateMap.get(attendance.userId);
      if (hourlyRate) {
        totalExpectedPayment += workHours * parseFloat(hourlyRate.toString());
      }
    }

    // Calculate today's attendance statistics
    const todayPresentCount = todayAttendances.filter(
      (a) => a.status !== 'IN_PROGRESS' && a.status !== 'ABSENT'
    ).length;
    const todayAttendanceRate =
      activeEmployees > 0
        ? (todayPresentCount / activeEmployees) * 100
        : 0;

        // Prepare response data
        return {
          totalEmployees,
          activeEmployees,
          monthlyWorkHours: Math.round(totalMonthlyHours * 100) / 100,
          expectedPayment: Math.round(totalExpectedPayment * 100) / 100,
          todayPresent: todayPresentCount,
          todayAttendanceRate: Math.round(todayAttendanceRate * 10) / 10,
          period: {
            start: firstDayOfMonth.toISOString(),
            end: lastDayOfMonth.toISOString(),
          },
        };
      },
      CACHE_CONFIGS.DASHBOARD_STATS
    );

    // Return with cache headers
    return NextResponse.json(stats, {
      headers: getCacheHeaders(CACHE_CONFIGS.DASHBOARD_STATS),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
