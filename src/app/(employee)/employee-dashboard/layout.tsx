import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/../../prisma/client"
import { EmployeeDashboardWrapper } from "@/components/dashboard/EmployeeDashboardWrapper"

export default async function EmployeeDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Check if user is actually an employee in the session
  if (session.user.userType !== 'employee') {
    redirect("/dashboard")
  }

  // Get employee with organization details
  const employee = await prisma.employee.findFirst({
    where: { 
      email: session.user.email || "",
      isInvitationAccepted: true,
      isActive: true
    },
    include: { organization: true },
  })

  if (!employee) {
    // If user is not an employee, redirect to admin dashboard
    redirect("/dashboard")
  }

  return (
    <>
      <form 
        id="signout-form"
        action={async () => {
          "use server"
          const { signOut } = await import("@/lib/auth")
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button type="submit" className="hidden">Sign Out</button>
      </form>
      
      <EmployeeDashboardWrapper
        userId={session.user.id}
        userEmail={employee.email || session.user.email || undefined}
        userName={`${employee.firstName} ${employee.lastName}`}
        organizationName={employee.organization?.name}
      >
        {children}
      </EmployeeDashboardWrapper>
    </>
  )
}
