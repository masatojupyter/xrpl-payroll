import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get paginated list of attendance records with filtering
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
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const skip = (page - 1) * limit;

    // Filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = searchParams.get('search'); // Search by user name or email

    // Build where clause
    interface WhereClause {
      date?: { gte?: Date; lte?: Date };
      userId?: string | { in: string[] };
      status?: string;
    }

    const where: WhereClause = {};

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.date.lte = endDateTime;
      }
    }

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // If searching by name, we need to get matching user IDs first
    let userIds: string[] | undefined;
    if (search) {
      const users = await prisma.user.findMany({
        where: {
          organizationId: session.user.organizationId || undefined,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
      
      // If no users found, return empty result
      if (userIds.length === 0) {
        return NextResponse.json({
          success: true,
          records: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Add user ID filter if search was performed
    if (userIds) {
      where.userId = { in: userIds };
    }

    // Get total count
    const total = await prisma.attendanceRecord.count({ where });

    // Get paginated records
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        timerEvents: {
          orderBy: { timestamp: 'asc' },
        },
        timeCorrections: {
          where: { approvalStatus: 'PENDING' },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take: limit,
    });

    // Get user information for each record
    const userIds2 = [...new Set(records.map(r => r.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds2 },
        organizationId: session.user.organizationId || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Get employee information
    const employees = await prisma.employee.findMany({
      where: {
        email: { in: users.map(u => u.email) },
        organizationId: session.user.organizationId || undefined,
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

    // Serialize and enrich records
    const enrichedRecords = records.map(record => {
      const user = userMap.get(record.userId);
      const employee = user ? employeeMap.get(user.email) : null;

      return {
        ...record,
        checkInTime: record.checkInTime.toString(),
        checkOutTime: record.checkOutTime?.toString() || null,
        user,
        employee,
        timerEvents: record.timerEvents.map(event => ({
          ...event,
          timestamp: event.timestamp.toString(),
          endTimestamp: event.endTimestamp?.toString() || null,
        })),
        timeCorrections: record.timeCorrections.map(correction => ({
          ...correction,
          beforeValue: correction.beforeValue.toString(),
          afterValue: correction.afterValue.toString(),
          approvedAt: correction.approvedAt?.toString() || null,
        })),
        hasPendingCorrections: record.timeCorrections.length > 0,
      };
    });

    return NextResponse.json({
      success: true,
      records: enrichedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}
