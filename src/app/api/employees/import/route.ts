import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { Prisma } from '@prisma/client';

// POST /api/employees/import - Import employees from CSV
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain header and at least one data row' },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Required fields
    const requiredFields = ['employeecode', 'email', 'firstname', 'lastname', 'hourlyrate', 'walletaddress'];
    const missingFields = requiredFields.filter(field => !header.includes(field));
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse data rows
    interface EmployeeImportData {
      data: Prisma.EmployeeCreateInput;
      row: number;
    }
    interface SuccessResult {
      row: number;
      employee: {
        id: string;
        employeeCode: string;
        firstName: string;
        lastName: string;
      };
    }
    
    const employees: EmployeeImportData[] = [];
    const errors: { row: number; error: string }[] = [];
    const successes: SuccessResult[] = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      // Map values to header fields
      header.forEach((field, index) => {
        row[field] = values[index] || '';
      });

      // Validate required fields
      const rowErrors: string[] = [];
      if (!row.employeecode) rowErrors.push('Employee code is required');
      if (!row.email) rowErrors.push('Email is required');
      if (!row.firstname) rowErrors.push('First name is required');
      if (!row.lastname) rowErrors.push('Last name is required');
      if (!row.hourlyrate) rowErrors.push('Hourly rate is required');
      if (!row.walletaddress) rowErrors.push('Wallet address is required');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (row.email && !emailRegex.test(row.email)) {
        rowErrors.push('Invalid email format');
      }

      // Validate hourly rate
      const hourlyRate = parseFloat(row.hourlyrate);
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        rowErrors.push('Hourly rate must be a positive number');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, error: rowErrors.join('; ') });
        continue;
      }

      // Prepare employee data
      const employeeData: Prisma.EmployeeCreateInput = {
        employeeCode: row.employeecode,
        email: row.email.toLowerCase(),
        firstName: row.firstname,
        lastName: row.lastname,
        position: row.position || null,
        hourlyRate: new Prisma.Decimal(hourlyRate),
        walletAddress: row.walletaddress,
        employmentType: row.employmenttype || 'full-time',
        joinDate: row.joindate ? new Date(row.joindate) : new Date(),
        isActive: row.isactive === 'false' ? false : true,
        organization: {
          connect: { id: organizationId },
        },
      };

      // Connect department if provided and exists
      if (row.departmentid) {
        employeeData.department = {
          connect: { id: row.departmentid },
        };
      }

      employees.push({ data: employeeData, row: i + 1 });
    }

    // Import employees
    for (const employee of employees) {
      try {
        // Check if employee code already exists
        const existingByCode = await prisma.employee.findUnique({
          where: {
            employeeCode_organizationId: {
              employeeCode: employee.data.employeeCode,
              organizationId,
            },
          },
        });

        if (existingByCode) {
          skipped.push({
            row: employee.row,
            reason: `Employee code ${employee.data.employeeCode} already exists`,
          });
          continue;
        }

        // Check if email already exists
        const existingByEmail = await prisma.employee.findUnique({
          where: {
            email_organizationId: {
              email: employee.data.email,
              organizationId,
            },
          },
        });

        if (existingByEmail) {
          skipped.push({
            row: employee.row,
            reason: `Email ${employee.data.email} already exists`,
          });
          continue;
        }

        // Create employee
        const created = await prisma.employee.create({
          data: employee.data,
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        successes.push({
          row: employee.row,
          employee: created,
        });
      } catch (error) {
        console.error(`Error importing employee at row ${employee.row}:`, error);
        errors.push({
          row: employee.row,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      summary: {
        total: lines.length - 1,
        success: successes.length,
        skipped: skipped.length,
        errors: errors.length,
      },
      successes: successes.map(s => ({
        row: s.row,
        employeeCode: s.employee.employeeCode,
        name: `${s.employee.firstName} ${s.employee.lastName}`,
      })),
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Error importing employees:', error);
    return NextResponse.json(
      { error: 'Failed to import employees' },
      { status: 500 }
    );
  }
}
