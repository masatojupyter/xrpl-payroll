import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/../prisma/client";
import { checkOutSchema } from "@/lib/validators/attendance";

// Helper function to calculate work minutes
function calculateWorkMinutes(checkInMs: number, checkOutMs: number): number {
  const totalMinutes = (checkOutMs - checkInMs) / (1000 * 60);
  return Math.max(0, Math.floor(totalMinutes));
}

// POST - Check-out (clock out)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
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

    const body = await request.json();
    const validatedData = checkOutSchema.parse(body);

    // Verify employee belongs to organization
    const employee = await prisma.employee.findFirst({
      where: {
        id: validatedData.employeeId,
        organizationId: user.organizationId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found in your organization" },
        { status: 404 }
      );
    }

    // Determine date (use provided date or today)
    const now = new Date();
    const checkOutTime = validatedData.checkOut ? new Date(validatedData.checkOut) : now;
    const dateOnly = validatedData.date
      ? new Date(validatedData.date)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find existing attendance record
    const existingAttendance = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: validatedData.employeeId,
          date: dateOnly,
        },
      },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "No check-in record found for today. Please check in first." },
        { status: 404 }
      );
    }

    if (existingAttendance.checkOutTime) {
      return NextResponse.json(
        {
          error: "Already checked out for today",
          attendance: existingAttendance,
        },
        { status: 409 }
      );
    }

    // Convert BigInt timestamps to milliseconds for comparison
    const checkInMs = Number(existingAttendance.checkInTime) * 1000;
    
    // Validate checkout is after checkin
    if (checkOutTime.getTime() <= checkInMs) {
      return NextResponse.json(
        { error: "Check-out time must be after check-in time" },
        { status: 400 }
      );
    }

    // Calculate total work minutes
    const checkOutTimestamp = Math.floor(checkOutTime.getTime() / 1000);
    const totalWorkMinutes = calculateWorkMinutes(checkInMs, checkOutTime.getTime());

    // Update attendance record with check-out
    const attendance = await prisma.attendanceRecord.update({
      where: {
        userId_date: {
          userId: validatedData.employeeId,
          date: dateOnly,
        },
      },
      data: {
        checkOutTime: BigInt(checkOutTimestamp),
        totalWorkMinutes,
        status: 'COMPLETED',
      },
    });

    // Calculate work hours for response
    const workHours = totalWorkMinutes / 60;

    return NextResponse.json({
      message: "Checked out successfully",
      attendance: {
        ...attendance,
        checkInTime: attendance.checkInTime.toString(),
        checkOutTime: attendance.checkOutTime?.toString(),
        workHours: Number(workHours.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
