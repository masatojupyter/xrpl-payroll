import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';

// GET /api/employees/export - Export employees to CSV
export async function GET(request: NextRequest) {
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

    // Get all employees for the organization
    const employees = await prisma.employee.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create CSV header
    const header = [
      'employeeCode',
      'email',
      'firstName',
      'lastName',
      'departmentId',
      'departmentName',
      'position',
      'hourlyRate',
      'walletAddress',
      'employmentType',
      'joinDate',
      'isActive',
      'createdAt',
    ].join(',');

    // Create CSV rows
    const rows = employees.map(emp => {
      return [
        emp.employeeCode,
        emp.email,
        emp.firstName,
        emp.lastName,
        emp.departmentId || '',
        emp.department?.name || '',
        emp.position || '',
        emp.hourlyRate.toString(),
        emp.walletAddress,
        emp.employmentType,
        emp.joinDate.toISOString().split('T')[0],
        emp.isActive.toString(),
        emp.createdAt.toISOString(),
      ]
        .map(field => {
          // Escape fields containing commas or quotes
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        })
        .join(',');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="employees_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting employees:', error);
    return NextResponse.json(
      { error: 'Failed to export employees' },
      { status: 500 }
    );
  }
}
