import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/../../prisma/client"
import { DashboardWrapper } from "@/components/dashboard/DashboardWrapper"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Check if user is actually an admin in the session
  if (session.user.userType !== 'admin') {
    redirect("/employee-dashboard")
  }

  // Get user with organization details
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  })

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
      
      <DashboardWrapper
        userId={session.user.id}
        userEmail={session.user.email || undefined}
        userName={session.user.name || session.user.email || undefined}
        userType="admin"
        organizationName={user?.organization?.name}
      >
        {children}
      </DashboardWrapper>
    </>
  )
}
