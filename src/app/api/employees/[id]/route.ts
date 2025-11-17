import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { updateEmployeeSchema } from '@/lib/validators/employee';

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const employee = await prisma.employee.findFirst({
      where: {
        id,
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

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if employee exists and belongs to organization
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateEmployeeSchema.parse(body);

    // Check if employee code is being updated and already exists
    if (validatedData.employeeCode && validatedData.employeeCode !== existingEmployee.employeeCode) {
      const existingByCode = await prisma.employee.findFirst({
        where: {
          employeeCode: validatedData.employeeCode,
          organizationId,
          id: { not: id },
        },
      });

      if (existingByCode) {
        return NextResponse.json(
          { error: 'Employee code already exists' },
          { status: 409 }
        );
      }
    }

    // Check if email is being updated and already exists
    if (validatedData.email && validatedData.email !== existingEmployee.email) {
      const existingByEmail = await prisma.employee.findFirst({
        where: {
          email: validatedData.email,
          organizationId,
          id: { not: id },
        },
      });

      if (existingByEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    // Verify department exists if provided
    if (validatedData.departmentId !== undefined && validatedData.departmentId !== null) {
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

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...validatedData,
        joinDate: validatedData.joinDate ? new Date(validatedData.joinDate) : undefined,
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

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid employee data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if employee exists and belongs to organization
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Delete employee (cascades to related records)
    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Employee deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
