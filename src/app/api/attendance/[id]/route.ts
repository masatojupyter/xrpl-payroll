import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/../prisma/client";
import { updateAttendanceSchema } from "@/lib/validators/attendance";

// Helper function to calculate work hours from totalWorkMinutes
function getWorkHours(totalWorkMinutes: number): number {
  return totalWorkMinutes / 60;
}

// GET - Get single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        id,
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Get user and employee info
    const userInfo = await prisma.user.findUnique({
      where: { id: attendance.userId },
      select: { email: true },
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { 
        email: userInfo.email,
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
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const workHours = getWorkHours(attendance.totalWorkMinutes);
    const checkInTime = new Date(Number(attendance.checkInTime) * 1000);
    const checkOutTime = attendance.checkOutTime ? new Date(Number(attendance.checkOutTime) * 1000) : null;

    return NextResponse.json({
      id: attendance.id,
      date: attendance.date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: attendance.status,
      workHours: Number(workHours.toFixed(2)),
      totalWorkMinutes: attendance.totalWorkMinutes,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update attendance record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if attendance record exists
    const existingAttendance = await prisma.attendanceRecord.findFirst({
      where: { id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this record
    const userInfo = await prisma.user.findUnique({
      where: { id: existingAttendance.userId },
      select: { email: true },
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { 
        email: userInfo.email,
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
        { error: "Employee not found in organization" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateAttendanceSchema.parse(body);

    // Convert dates to timestamps if provided
    const updateData: {
      date?: Date;
      checkInTime?: bigint;
      checkOutTime?: bigint;
      status?: string;
      totalWorkMinutes?: number;
    } = {};
    
    if (validatedData.date) {
      updateData.date = new Date(validatedData.date);
    }
    
    if (validatedData.checkIn) {
      updateData.checkInTime = BigInt(Math.floor(new Date(validatedData.checkIn).getTime() / 1000));
    }
    
    if (validatedData.checkOut) {
      updateData.checkOutTime = BigInt(Math.floor(new Date(validatedData.checkOut).getTime() / 1000));
    }
    
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    // Recalculate totalWorkMinutes if times are updated
    if (updateData.checkInTime || updateData.checkOutTime) {
      const checkInTime = updateData.checkInTime || existingAttendance.checkInTime;
      const checkOutTime = updateData.checkOutTime || existingAttendance.checkOutTime;
      
      if (checkOutTime && checkInTime) {
        const workMinutes = Number(checkOutTime - checkInTime) / 60;
        updateData.totalWorkMinutes = Math.max(0, workMinutes);
      }
    }

    // Update attendance record
    const attendance = await prisma.attendanceRecord.update({
      where: { id },
      data: updateData,
    });

    const workHours = getWorkHours(attendance.totalWorkMinutes);
    const checkInTime = new Date(Number(attendance.checkInTime) * 1000);
    const checkOutTime = attendance.checkOutTime ? new Date(Number(attendance.checkOutTime) * 1000) : null;

    return NextResponse.json({
      id: attendance.id,
      date: attendance.date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: attendance.status,
      workHours: Number(workHours.toFixed(2)),
      totalWorkMinutes: attendance.totalWorkMinutes,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
      },
    });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if attendance record exists
    const existingAttendance = await prisma.attendanceRecord.findFirst({
      where: { id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this record
    const userInfo = await prisma.user.findUnique({
      where: { id: existingAttendance.userId },
      select: { email: true },
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { 
        email: userInfo.email,
        organizationId: user.organizationId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found in organization" },
        { status: 404 }
      );
    }

    // Delete the attendance record
    await prisma.attendanceRecord.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
