import NextAuth, { type DefaultSession, type User as NextAuthUser } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { Session } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "../../prisma/client"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      userType: 'admin' | 'employee'
      organizationId?: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    userType: 'admin' | 'employee'
    organizationId?: string
  }
}

const authConfig = {
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
        loginType: {
          label: "Login Type",
          type: "text",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const loginType = credentials.loginType as string || 'admin'

        // Authenticate based on loginType
        if (loginType === 'admin') {
          // Try to authenticate as a User (admin)
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
            },
          })

          if (!user || !user.password) {
            throw new Error("Invalid credentials")
          }

          // Check if user has admin role
          if (user.role !== 'admin') {
            throw new Error("Invalid credentials")
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.companyName || user.email,
            role: user.role,
            userType: 'admin' as const,
            organizationId: user.organizationId || undefined,
          }
        } else {
          // Try to authenticate as an Employee
          const employee = await prisma.employee.findFirst({
            where: {
              email: credentials.email as string,
              isActive: true,
              isInvitationAccepted: true,
            },
          })

          if (!employee || !employee.password) {
            throw new Error("Invalid credentials")
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            employee.password
          )

          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }

          return {
            id: employee.id,
            email: employee.email,
            name: `${employee.firstName} ${employee.lastName}`,
            userType: 'employee' as const,
            organizationId: employee.organizationId,
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: NextAuthUser | undefined }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.userType = user.userType
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.userType = token.userType as 'admin' | 'employee'
        session.user.organizationId = token.organizationId as string | undefined
      }
      return session
    },
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

export const GET = handlers.GET
export const POST = handlers.POST
