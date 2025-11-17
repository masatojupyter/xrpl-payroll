import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/../../prisma/client"
import { Prisma } from "@prisma/client"

/**
 * GET /api/employee/attendance
 * Get the authenticated employee's attendance records from AttendanceRecord table
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (optional, default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is an employee
    if (session.user.userType !== 'employee') {
      return NextResponse.json(
        { error: "Forbidden - Employee access only" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")

    // For employee login, we need to find the corresponding User record by email
    // because AttendanceRecord.userId references User.id, not Employee.id
    let actualUserId = session.user.id
    
    if (session.user.userType === 'employee') {
      // Find User record by email
      const user = await prisma.user.findFirst({
        where: {
          email: session.user.email || '',
          role: 'employee',
        },
      })
      
      if (user) {
        actualUserId = user.id
      } else {
        // If no User record found, return empty data
        return NextResponse.json({
          success: true,
          data: [],
          summary: {
            totalRecords: 0,
            totalWorkingHours: 0,
            totalBreakMinutes: 0,
          },
        })
      }
    }

    // Build query filters for AttendanceRecord table
    const where: Prisma.AttendanceRecordWhereInput = {
      userId: actualUserId,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    // Get attendance records from AttendanceRecord table with timer events
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: limit,
      include: {
        timerEvents: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    })

    // Transform AttendanceRecord data to match expected format
    const attendances = attendanceRecords.map((record) => {
      // Convert Unix timestamps (seconds) to Date objects
      const checkIn = new Date(Number(record.checkInTime) * 1000)
      const checkOut = record.checkOutTime ? new Date(Number(record.checkOutTime) * 1000) : null
      
      // Calculate break time from REST events
      let breakMinutes = 0
      const restEvents = record.timerEvents.filter((event) => event.eventType === 'REST')
      restEvents.forEach((restEvent) => {
        if (restEvent.endTimestamp) {
          const restDuration = Number(restEvent.endTimestamp) - Number(restEvent.timestamp)
          breakMinutes += Math.floor(restDuration / 60)
        }
      })
      
      // Use attendanceType as the status for frontend
      const status = record.attendanceType

      // Format date as YYYY-MM-DD using UTC to avoid timezone issues
      const year = record.date.getUTCFullYear();
      const month = String(record.date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(record.date.getUTCDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      return {
        id: record.id,
        date: dateString,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut?.toISOString() || null,
        breakMinutes,
        status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    })

    // Calculate summary statistics
    const totalRecords = attendances.length
    const totalBreakMinutes = attendances.reduce((sum, record) => sum + record.breakMinutes, 0)
    
    // Calculate total working hours from totalWorkMinutes field and active work events
    let totalWorkingMinutes = 0
    attendanceRecords.forEach((record) => {
      // Add completed work minutes
      totalWorkingMinutes += record.totalWorkMinutes
      
      // Add ongoing work minutes from active WORK event
      const activeWorkEvent = record.timerEvents.find(
        (event) => event.eventType === 'WORK' && event.endTimestamp === null
      )
      
      if (activeWorkEvent) {
        const workStartTime = Number(activeWorkEvent.timestamp) * 1000
        const currentTime = Date.now()
        const ongoingWorkMinutes = Math.floor((currentTime - workStartTime) / (1000 * 60))
        
        // Subtract break time from ongoing work
        const restEvents = record.timerEvents.filter((event) => event.eventType === 'REST')
        let totalBreakSeconds = 0
        restEvents.forEach((restEvent) => {
          if (restEvent.durationFromPrevious) {
            totalBreakSeconds += restEvent.durationFromPrevious
          }
        })
        const breakMinutes = Math.floor(totalBreakSeconds / 60)
        
        totalWorkingMinutes += Math.max(0, ongoingWorkMinutes - breakMinutes)
      }
    })
    const totalWorkingHours = totalWorkingMinutes / 60

    return NextResponse.json({
      success: true,
      data: attendances,
      summary: {
        totalRecords,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalBreakMinutes,
      },
    })
  } catch (error) {
    console.error("Error fetching employee attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
