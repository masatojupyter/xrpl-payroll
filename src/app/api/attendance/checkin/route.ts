import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/../prisma/client";
import { checkInSchema } from "@/lib/validators/attendance";

// POST - Check-in (clock in)
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
    const validatedData = checkInSchema.parse(body);

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
    const checkInTime = validatedData.checkIn ? new Date(validatedData.checkIn) : now;
    const dateOnly = validatedData.date
      ? new Date(validatedData.date)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: validatedData.employeeId,
          date: dateOnly,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          error: "Already checked in for today",
          attendance: existingAttendance,
        },
        { status: 409 }
      );
    }

    // Create attendance record with check-in (convert to Unix timestamp in seconds)
    const checkInTimestamp = Math.floor(checkInTime.getTime() / 1000);
    
    const attendance = await prisma.attendanceRecord.create({
      data: {
        userId: validatedData.employeeId,
        date: dateOnly,
        checkInTime: BigInt(checkInTimestamp),
        attendanceType: "present",
      },
    });

    return NextResponse.json(
      {
        message: "Checked in successfully",
        attendance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during check-in:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
