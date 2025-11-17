import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/../../prisma/client"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  XCircle
} from "lucide-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import AttendanceTimerPanel from "@/components/attendance/AttendanceTimerPanel"

export const dynamic = "force-dynamic"

export default async function EmployeeDashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Get employee details
  const employee = await prisma.employee.findFirst({
    where: { 
      email: session.user.email || "",
      isInvitationAccepted: true,
      isActive: true
    },
    include: { 
      organization: true,
      department: true
    },
  })

  if (!employee) {
    redirect("/dashboard")
  }

  // Get current month attendance
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Get user ID for attendance queries
  const user = await prisma.user.findUnique({
    where: { email: employee.email },
    select: { id: true },
  })

  if (!user) {
    redirect("/dashboard")
  }

  const attendances = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: { date: "desc" },
  })

  // Calculate attendance stats
  const totalDays = attendances.length
  const presentDays = attendances.filter(a => a.status === "COMPLETED").length
  const inProgressDays = attendances.filter(a => a.status === "IN_PROGRESS").length
  const totalHours = attendances.reduce((sum, a) => {
    return sum + (a.totalWorkMinutes / 60)
  }, 0)

  // Get recent payroll
  const recentPayrolls = await prisma.payroll.findMany({
    where: {
      employeeId: employee.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  const currentMonthPayroll = recentPayrolls.find(
    p => p.period === format(now, "yyyy-MM")
  )

  // Get last month stats
  const lastMonth = subMonths(now, 1)
  const lastMonthStart = startOfMonth(lastMonth)
  const lastMonthEnd = endOfMonth(lastMonth)

  const lastMonthAttendances = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      status: "COMPLETED",
    },
  })

  const lastMonthHours = lastMonthAttendances.reduce((sum, a) => {
    return sum + (a.totalWorkMinutes / 60)
  }, 0)

  const hoursChange = lastMonthHours > 0 
    ? ((totalHours - lastMonthHours) / lastMonthHours) * 100 
    : 0

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {employee.firstName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {employee.department?.name && `${employee.department.name} • `}
          {employee.position || "Employee"} • {employee.organization.name}
        </p>
      </div>

      {/* Attendance Timer Panel */}
      <AttendanceTimerPanel />

    </div>
  )
}
