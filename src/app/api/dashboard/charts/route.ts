import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { CACHE_CONFIGS, getCacheHeaders, getOrgCacheKey, withCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const chartType = searchParams.get('type') || 'all';
    const months = parseInt(searchParams.get('months') || '6', 10);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Use cache wrapper for the entire charts calculation
    const cacheKey = getOrgCacheKey(
      organizationId,
      `dashboard:charts:${chartType}:${months}:${days}`
    );

    const response = await withCache(
      cacheKey,
      async () => {
        const now = new Date();
        const chartResponse: {
      monthlyWorkHours?: Array<{ month: string; hours: number }>;
      departmentDistribution?: Array<{ department: string; count: number; percentage: number }>;
      dailyAttendanceRate?: Array<{ date: string; rate: number; present: number; total: number }>;
    } = {};

    // Monthly work hours data
    if (chartType === 'all' || chartType === 'monthly') {
      // Calculate date range for all months at once
      const oldestMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const latestMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get all employee IDs in the organization first
      const orgEmployees = await prisma.employee.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const employeeIds = orgEmployees.map(e => e.id);

      // Fetch all attendances for the entire period in one query
      const allAttendances = await prisma.attendanceRecord.findMany({
        where: {
          userId: {
            in: employeeIds,
          },
          date: {
            gte: oldestMonth,
            lte: latestMonth,
          },
          status: 'COMPLETED',
          checkOutTime: {
            not: null,
          },
        },
        select: {
          date: true,
          checkInTime: true,
          checkOutTime: true,
          totalWorkMinutes: true,
        },
      });

      // Group attendances by month
      const monthlyHoursMap = new Map<string, number>();
      
      for (const attendance of allAttendances) {
        const monthKey = `${attendance.date.getFullYear()}-${attendance.date.getMonth()}`;
        const workHours = attendance.totalWorkMinutes / 60;
        
        monthlyHoursMap.set(
          monthKey,
          (monthlyHoursMap.get(monthKey) || 0) + workHours
        );
      }

      // Build monthly data array
      const monthlyData = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
        
        monthlyData.push({
          month: monthDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
          hours: Math.round((monthlyHoursMap.get(monthKey) || 0) * 100) / 100,
        });
      }

      chartResponse.monthlyWorkHours = monthlyData;
    }

    // Department distribution data
    if (chartType === 'all' || chartType === 'department') {
      const departments = await prisma.department.findMany({
        where: {
          organizationId,
        },
        include: {
          _count: {
            select: {
              employees: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      const totalEmployees = await prisma.employee.count({
        where: {
          organizationId,
          isActive: true,
        },
      });

      // Get employees without department
      const employeesWithoutDept = await prisma.employee.count({
        where: {
          organizationId,
          isActive: true,
          departmentId: null,
        },
      });

      const departmentData = departments.map((dept) => ({
        department: dept.name,
        count: dept._count.employees,
        percentage: totalEmployees > 0
          ? Math.round((dept._count.employees / totalEmployees) * 1000) / 10
          : 0,
      }));

      // Add unassigned if exists
      if (employeesWithoutDept > 0) {
        departmentData.push({
          department: '未配属',
          count: employeesWithoutDept,
          percentage: totalEmployees > 0
            ? Math.round((employeesWithoutDept / totalEmployees) * 1000) / 10
            : 0,
        });
      }

      chartResponse.departmentDistribution = departmentData;
    }

    // Daily attendance rate data
    if (chartType === 'all' || chartType === 'daily') {
      const activeEmployees = await prisma.employee.count({
        where: {
          organizationId,
          isActive: true,
        },
      });

      // Calculate date range
      const oldestDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      const latestDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // Get active employee IDs
      const activeEmployeeIds = (await prisma.employee.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: { id: true },
      })).map(e => e.id);

      // Fetch all daily attendances in one query
      const dailyAttendances = await prisma.attendanceRecord.findMany({
        where: {
          userId: {
            in: activeEmployeeIds,
          },
          date: {
            gte: oldestDate,
            lt: latestDate,
          },
          attendanceType: 'present',
        },
        select: {
          date: true,
        },
      });

      // Group by date
      const dailyCountMap = new Map<string, number>();
      for (const attendance of dailyAttendances) {
        const dateKey = attendance.date.toISOString().split('T')[0];
        dailyCountMap.set(dateKey, (dailyCountMap.get(dateKey) || 0) + 1);
      }

      // Build daily data array
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const present = dailyCountMap.get(dateKey) || 0;

        const rate = activeEmployees > 0
          ? Math.round((present / activeEmployees) * 1000) / 10
          : 0;

        dailyData.push({
          date: date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
          rate,
          present,
          total: activeEmployees,
        });
      }

      chartResponse.dailyAttendanceRate = dailyData;
    }

        return chartResponse;
      },
      CACHE_CONFIGS.DASHBOARD_CHARTS
    );

    // Return with cache headers
    return NextResponse.json(response, {
      headers: getCacheHeaders(CACHE_CONFIGS.DASHBOARD_CHARTS),
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard charts data' },
      { status: 500 }
    );
  }
}
