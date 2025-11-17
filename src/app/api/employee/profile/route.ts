import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/../../prisma/client"

/**
 * GET /api/employee/profile
 * Get the authenticated employee's profile information
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

    // Get employee data
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user.email || '',
      },
      select: {
        id: true,
        employeeCode: true,
        email: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        position: true,
        joinDate: true,
        hourlyRate: true,
        employmentType: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("Error fetching employee profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/employee/profile
 * Update the authenticated employee's profile information (limited fields)
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()

    // Only allow employees to update specific fields (walletAddress only for now)
    const allowedFields = {
      walletAddress: body.walletAddress,
    }

    // Remove undefined fields
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const updatedEmployee = await prisma.employee.update({
      where: {
        id: session.user.id,
      },
      data: updateData,
      select: {
        id: true,
        employeeCode: true,
        email: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        position: true,
        joinDate: true,
        hourlyRate: true,
        employmentType: true,
        walletAddress: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedEmployee,
    })
  } catch (error) {
    console.error("Error updating employee profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
