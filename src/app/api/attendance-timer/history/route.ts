import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get operation logs history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get logs for the specified number of days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get attendance records with their logs
    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
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
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRecords = records.map(record => ({
      ...record,
      checkInTime: record.checkInTime.toString(),
      checkOutTime: record.checkOutTime?.toString(),
      operationLogs: record.operationLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toString(),
      })),
      timeCorrections: record.timeCorrections.map(correction => ({
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
        approvedAt: correction.approvedAt?.toString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      records: serializedRecords,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
