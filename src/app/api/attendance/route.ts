import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/../prisma/client";
import { Prisma } from "@prisma/client";
import {
  createAttendanceSchema,
  attendanceQuerySchema,
} from "@/lib/validators/attendance";

// Helper function to calculate work hours from totalWorkMinutes
function getWorkHours(totalWorkMinutes: number): number {
  return totalWorkMinutes / 60;
}

// GET - List attendance records with filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [ATTENDANCE API] GET request received');
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('👤 [ATTENDANCE API] User:', {
      email: session.user.email,
      userType: session.user.userType
    });

    const userType = session.user.userType;
    let organizationId: string | undefined;
    let currentUserId: string | undefined;

    // Get organization and user ID based on user type
    if (userType === 'admin') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, organizationId: true },
      });
      organizationId = user?.organizationId || undefined;
      currentUserId = user?.id;
    } else if (userType === 'employee') {
      const employee = await prisma.employee.findFirst({
        where: { email: session.user.email },
        select: { organizationId: true },
      });
      organizationId = employee?.organizationId || undefined;
      
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    if (!organizationId || !currentUserId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    console.log('🏢 [ATTENDANCE API] Organization ID:', organizationId);

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    console.log('📋 [ATTENDANCE API] Query parameters:', searchParams);
    
    const validatedParams = attendanceQuerySchema.parse(searchParams);
    console.log('✅ [ATTENDANCE API] Validated parameters:', validatedParams);

    const {
      employeeId,
      departmentId,
      startDate,
      endDate,
      status,
      page,
      limit,
    } = validatedParams;

    // Build where clause for AttendanceRecord
    const where: Prisma.AttendanceRecordWhereInput = {};

    // Get user IDs based on filters and permissions
    let userIds: string[] = [];

    if (userType === 'employee') {
      // Employees can only see their own records
      userIds = [currentUserId];
    } else {
      // For admins, get user IDs based on employee filters
      const employeeFilter: Prisma.EmployeeWhereInput = {
        organizationId,
      };

      if (employeeId) {
        employeeFilter.id = employeeId;
      }

      if (departmentId) {
        employeeFilter.departmentId = departmentId;
      }

      const employees = await prisma.employee.findMany({
        where: employeeFilter,
        select: { email: true },
      });

      const users = await prisma.user.findMany({
        where: { email: { in: employees.map(e => e.email) } },
        select: { id: true },
      });

      userIds = users.map(u => u.id);
    }

    if (userIds.length > 0) {
      where.userId = { in: userIds };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    console.log('🔎 [ATTENDANCE API] Where clause:', JSON.stringify(where, null, 2));

    // Get total count for pagination
    const total = await prisma.attendanceRecord.count({ where });
    console.log('📊 [ATTENDANCE API] Total records found:', total);

    // Get paginated results
    const attendances = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log('📦 [ATTENDANCE API] Raw attendances from DB:', attendances.length, 'records');

    // Get user and employee details for the records
    const userEmails = await prisma.user.findMany({
      where: { id: { in: attendances.map(a => a.userId) } },
      select: { id: true, email: true },
    });

    const employees = await prisma.employee.findMany({
      where: { 
        email: { in: userEmails.map(u => u.email) },
        organizationId,
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

    // Create user to employee mapping
    const userToEmployeeMap = new Map();
    for (const userEmail of userEmails) {
      const employee = employees.find(e => e.email === userEmail.email);
      if (employee) {
        userToEmployeeMap.set(userEmail.id, employee);
      }
    }

    // Transform attendance records to match expected format
    const attendancesWithDetails = attendances.map((attendance) => {
      const employee = userToEmployeeMap.get(attendance.userId);
      const workHours = getWorkHours(attendance.totalWorkMinutes);
      const checkInTime = new Date(Number(attendance.checkInTime) * 1000);
      const checkOutTime = attendance.checkOutTime ? new Date(Number(attendance.checkOutTime) * 1000) : null;

      return {
        id: attendance.id,
        date: attendance.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: attendance.status,
        workMinutes: attendance.totalWorkMinutes,
        workHours: Number(workHours.toFixed(2)),
        employee: employee || {
          id: '',
          employeeCode: 'N/A',
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
          department: null,
        },
      };
    });

    console.log('✨ [ATTENDANCE API] Final response data:', {
      recordCount: attendancesWithDetails.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

    console.log('📤 [ATTENDANCE API] Sending response with', attendancesWithDetails.length, 'records');

    return NextResponse.json({
      data: attendancesWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create attendance record
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userType = session.user.userType;
    let organizationId: string | undefined;
    let currentUserId: string | undefined;

    // Get organization and user ID based on user type
    if (userType === 'admin') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, organizationId: true },
      });
      organizationId = user?.organizationId || undefined;
      currentUserId = user?.id;
    } else if (userType === 'employee') {
      const employee = await prisma.employee.findFirst({
        where: { email: session.user.email },
        select: { organizationId: true },
      });
      organizationId = employee?.organizationId || undefined;
      
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    if (!organizationId || !currentUserId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createAttendanceSchema.parse(body);

    // For employees, they can only create records for themselves
    let targetUserId = currentUserId;
    
    if (userType === 'admin' && validatedData.employeeId) {
      // Admin can create records for specific employees
      const employee = await prisma.employee.findFirst({
        where: {
          id: validatedData.employeeId,
          organizationId,
        },
        select: { email: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found in your organization" },
          { status: 404 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { email: employee.email },
        select: { id: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found for employee" },
          { status: 404 }
        );
      }

      targetUserId = targetUser.id;
    }

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendanceRecord.findFirst({
      where: {
        userId: targetUserId,
        date: new Date(validatedData.date),
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance record already exists for this date" },
        { status: 409 }
      );
    }

    // Validate checkOut is after checkIn if provided
    if (validatedData.checkOut) {
      const checkInTime = new Date(validatedData.checkIn).getTime();
      const checkOutTime = new Date(validatedData.checkOut).getTime();
      
      if (checkOutTime <= checkInTime) {
        return NextResponse.json(
          { error: "Check-out time must be after check-in time" },
          { status: 400 }
        );
      }
    }

    // Convert times to timestamps
    const checkInTimestamp = BigInt(Math.floor(new Date(validatedData.checkIn).getTime() / 1000));
    const checkOutTimestamp = validatedData.checkOut 
      ? BigInt(Math.floor(new Date(validatedData.checkOut).getTime() / 1000))
      : null;

    // Calculate total work minutes
    let totalWorkMinutes = 0;
    if (checkOutTimestamp) {
      const workSeconds = Number(checkOutTimestamp - checkInTimestamp);
      totalWorkMinutes = Math.max(0, Math.floor(workSeconds / 60));
    }

    // Create attendance record
    const attendance = await prisma.attendanceRecord.create({
      data: {
        userId: targetUserId,
        date: new Date(validatedData.date),
        checkInTime: checkInTimestamp,
        checkOutTime: checkOutTimestamp,
        totalWorkMinutes,
        status: validatedData.status || 'IN_PROGRESS',
      },
    });

    // Get employee details for response
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true },
    });

    const employee = await prisma.employee.findFirst({
      where: { 
        email: user?.email,
        organizationId,
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

    const workHours = getWorkHours(attendance.totalWorkMinutes);
    const checkInTime = new Date(Number(attendance.checkInTime) * 1000);
    const checkOutTime = attendance.checkOutTime ? new Date(Number(attendance.checkOutTime) * 1000) : null;

    return NextResponse.json(
      {
        id: attendance.id,
        date: attendance.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: attendance.status,
        workMinutes: attendance.totalWorkMinutes,
        workHours: Number(workHours.toFixed(2)),
        employee: employee || {
          id: '',
          employeeCode: 'N/A',
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
          department: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating attendance record:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
