import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get time corrections with filtering
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
    const approvalStatus = searchParams.get('approvalStatus') || 'PENDING';
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build where clause
    interface WhereClause {
      approvalStatus?: string;
      userId?: string;
    }

    const where: WhereClause = {
      approvalStatus,
    };

    if (userId) {
      where.userId = userId;
    }

    // Get corrections
    const corrections = await prisma.timeCorrection.findMany({
      where,
      include: {
        attendanceRecord: {
          select: {
            id: true,
            date: true,
            userId: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get user information for each correction
    const userIds = [...new Set(corrections.map(c => c.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
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
      },
    });

    const employeeMap = new Map(employees.map(e => [e.email, e]));

    // Serialize and enrich corrections
    const enrichedCorrections = corrections.map(correction => {
      const user = userMap.get(correction.userId);
      const employee = user ? employeeMap.get(user.email) : null;

      return {
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
        approvedAt: correction.approvedAt?.toString() || null,
        user,
        employee,
      };
    });

    return NextResponse.json({
      success: true,
      corrections: enrichedCorrections,
      total: corrections.length,
    });
  } catch (error) {
    console.error('Error fetching time corrections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time corrections' },
      { status: 500 }
    );
  }
}
