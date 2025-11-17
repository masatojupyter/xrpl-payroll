import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const userType = req.auth?.user?.userType
  const { pathname } = req.nextUrl

  // Define public routes
  const publicRoutes = ["/", "/login", "/register", "/verify", "/set-password", "/forgot-password", "/reset-password", "/verification-complete", "/error"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Define auth routes
  const authRoutes = ["/login", "/register", "/verify"]
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Define admin-only routes (pages and APIs)
  const adminRoutes = ["/dashboard"]
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  // Define admin-only API routes
  const adminApiRoutes = ["/api/employees", "/api/payroll/process", "/api/reports", "/api/settings", "/api/dashboard"]
  const isAdminApiRoute = adminApiRoutes.some((route) => pathname.startsWith(route))

  // Define employee-only routes (pages)
  const employeeRoutes = ["/employee-dashboard"]
  const isEmployeeRoute = employeeRoutes.some((route) => pathname.startsWith(route))

  // Define employee-only API routes
  const employeeApiRoutes = ["/api/employee"]
  const isEmployeeApiRoute = employeeApiRoutes.some((route) => pathname.startsWith(route))

  // Redirect authenticated users away from auth routes based on their userType
  if (isLoggedIn && isAuthRoute) {
    if (userType === 'employee') {
      return NextResponse.redirect(new URL("/employee-dashboard", req.nextUrl))
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }
  
  // Redirect to appropriate dashboard if authenticated user visits home page
  if (isLoggedIn && pathname === "/") {
    if (userType === 'employee') {
      return NextResponse.redirect(new URL("/employee-dashboard", req.nextUrl))
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Protect employee routes - only employees can access
  if (isEmployeeRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?callbackUrl=/employee-dashboard", req.nextUrl))
    }
    // Strictly check if userType is 'employee', if not redirect to admin dashboard
    if (userType !== 'employee') {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
  }

  // Protect employee API routes - only employees can access
  if (isEmployeeApiRoute) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    if (userType !== 'employee') {
      return NextResponse.json(
        { error: "Forbidden - Employee access only" },
        { status: 403 }
      )
    }
  }

  // Protect admin routes - only admins can access
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?callbackUrl=/dashboard", req.nextUrl))
    }
    // Strictly check if userType is NOT 'admin', then redirect to employee dashboard
    if (userType !== 'admin') {
      return NextResponse.redirect(new URL("/employee-dashboard", req.nextUrl))
    }
  }

  // Protect admin API routes - only admins can access
  if (isAdminApiRoute) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    if (userType === 'employee') {
      return NextResponse.json(
        { error: "Forbidden - Admin access only" },
        { status: 403 }
      )
    }
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isLoggedIn && !isPublicRoute) {
    const callbackUrl = pathname
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl)
    )
  }

  return NextResponse.next()
})

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
}
