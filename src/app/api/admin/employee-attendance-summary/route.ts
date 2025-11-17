import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get employee attendance summary
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Filter parameters
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name'; // name, attendanceRate, workHours
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const month = searchParams.get('month'); // YYYY-MM format

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get all active users in the organization
    const users = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId || undefined,
        role: { not: 'admin' }, // Exclude admins
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Get employee information
    const employees = await prisma.employee.findMany({
      where: {
        email: { in: users.map(u => u.email) },
        organizationId: session.user.organizationId || undefined,
        isActive: true,
      },
      select: {
        email: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        position: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const employeeMap = new Map(employees.map(e => [e.email, e]));

    // Get attendance records for the period
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
        date: true,
        totalWorkMinutes: true,
        status: true,
      },
    });

    // Get pending time corrections
    const timeCorrections = await prisma.timeCorrection.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        approvalStatus: 'PENDING',
      },
      select: {
        userId: true,
        id: true,
      },
    });

    const correctionsByUser = timeCorrections.reduce((acc, tc) => {
      acc[tc.userId] = (acc[tc.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate working days in the period
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workingDays = totalDays - Math.floor(totalDays / 7) * 2; // Rough estimate excluding weekends

    // Build summary for each user
    const summaries = users.map(user => {
      const employee = employeeMap.get(user.email);
      const userRecords = attendanceRecords.filter(r => r.userId === user.id);
      
      const completedDays = userRecords.filter(r => r.status === 'COMPLETED' || r.status === 'CORRECTED').length;
      const totalWorkMinutes = userRecords.reduce((sum, r) => sum + r.totalWorkMinutes, 0);
      const attendanceRate = workingDays > 0 ? (completedDays / workingDays) * 100 : 0;
      const pendingCorrections = correctionsByUser[user.id] || 0;

      return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName || employee?.firstName || '',
        lastName: user.lastName || employee?.lastName || '',
        employeeCode: employee?.employeeCode || '-',
        position: employee?.position || '-',
        department: employee?.department?.name || '-',
        stats: {
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          completedDays,
          workingDays,
          totalWorkMinutes,
          totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
          pendingCorrections,
        },
      };
    });

    // Sort summaries
    summaries.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'attendanceRate':
          compareValue = a.stats.attendanceRate - b.stats.attendanceRate;
          break;
        case 'workHours':
          compareValue = a.stats.totalWorkMinutes - b.stats.totalWorkMinutes;
          break;
        case 'pendingCorrections':
          compareValue = a.stats.pendingCorrections - b.stats.pendingCorrections;
          break;
        case 'name':
        default:
          compareValue = `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          );
          break;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return NextResponse.json({
      success: true,
      summaries,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        workingDays,
      },
    });
  } catch (error) {
    console.error('Error fetching employee attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee attendance summary' },
      { status: 500 }
    );
  }
}
