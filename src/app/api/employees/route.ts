import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { createEmployeeSchema, employeeQuerySchema } from '@/lib/validators/employee';
import { Prisma } from '@prisma/client';
import { notifyEmployeeRegistered } from '@/lib/notifications';
import { sendEmployeeInvitationEmail } from '@/lib/mail';
import crypto from 'crypto';

// GET /api/employees - List employees with pagination, search, filtering, and sorting
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedQuery = employeeQuerySchema.parse(queryParams);
    const {
      page,
      limit,
      search,
      department,
      employmentType,
      isActive,
      sortBy,
      sortOrder,
    } = validatedQuery;

    // Build where clause for filtering
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
    };

    // Search by name or email
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by department
    if (department) {
      where.departmentId = department;
    }

    // Filter by employment type
    if (employmentType) {
      where.employmentType = employmentType;
    }

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Build orderBy clause
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      data: employees,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    const body = await request.json();
    const validatedData = createEmployeeSchema.parse(body);

    // Check if employee code already exists
    const existingByCode = await prisma.employee.findUnique({
      where: {
        employeeCode_organizationId: {
          employeeCode: validatedData.employeeCode,
          organizationId,
        },
      },
    });

    if (existingByCode) {
      return NextResponse.json(
        { error: 'Employee code already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingByEmail = await prisma.employee.findUnique({
      where: {
        email_organizationId: {
          email: validatedData.email,
          organizationId,
        },
      },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Verify department exists if provided
    if (validatedData.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: validatedData.departmentId,
          organizationId,
        },
      });

      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // Token expiry (24 hours)
    const invitationExpiry = new Date();
    invitationExpiry.setHours(invitationExpiry.getHours() + 24);

    // Create employee with invitation token
    const employee = await prisma.employee.create({
      data: {
        ...validatedData,
        organizationId,
        joinDate: validatedData.joinDate ? new Date(validatedData.joinDate) : new Date(),
        invitationToken,
        invitationExpiry,
        isInvitationAccepted: false,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send invitation email
    try {
      await sendEmployeeInvitationEmail({
        to: employee.email,
        token: invitationToken,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        organizationName: employee.organization.name,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Note: We don't delete the employee if email fails, admin can resend
    }

    // Create notification for employee registration
    try {
      if (session.user.id) {
        await notifyEmployeeRegistered(session.user.id, {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
        });
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('Error creating notification:', notificationError);
    }

    // Remove sensitive fields from response
    const { organization: _org, invitationToken: _token, ...employeeResponse } = employee;

    return NextResponse.json(
      {
        ...employeeResponse,
        invitationSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating employee:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid employee data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
