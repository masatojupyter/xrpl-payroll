import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'
import {
  companySettingsSchema,
  attendanceSettingsSchema,
  payrollSettingsSchema,
  notificationSettingsSchema,
  userSettingsSchema,
  CompanySettingsInput,
} from '@/lib/validators/settings'
import { ZodError } from 'zod'

// Mock storage for non-company settings (in production, use a database)
const settingsStore = new Map<string, unknown>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { section } = await params

    // Handle company settings from database
    if (section === 'company') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { organization: true },
      })

      if (!user?.organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      const organization = user.organization
      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        name: organization.name || '',
        address: organization.address || '',
        phone: organization.phone || '',
        email: organization.email || '',
        taxId: organization.taxId || '',
        fiscalYearStart: organization.fiscalYearStart || '04-01',
      })
    }

    // Handle other settings from mock storage
    const key = `${session.user.email}:${section}`
    const settings = settingsStore.get(key)

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { section } = await params
    const body = await request.json()

    // Validate based on section
    let validatedData
    try {
      switch (section) {
        case 'company':
          validatedData = companySettingsSchema.parse(body)
          break
        case 'attendance':
          validatedData = attendanceSettingsSchema.parse(body)
          break
        case 'payroll':
          validatedData = payrollSettingsSchema.parse(body)
          break
        case 'notifications':
          validatedData = notificationSettingsSchema.parse(body)
          break
        case 'user':
          validatedData = userSettingsSchema.parse(body)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid settings section' },
            { status: 400 }
          )
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message
          }
        })
        return NextResponse.json({ errors }, { status: 400 })
      }
      throw error
    }

    // Handle company settings - save to database
    if (section === 'company') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })

      if (!user?.organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      const companyData = validatedData as CompanySettingsInput
      
      const updatedOrganization = await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          name: companyData.name,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          taxId: companyData.taxId || null,
          fiscalYearStart: companyData.fiscalYearStart,
        },
      })

      console.log(`Organization settings updated for ${session.user.email}`)

      return NextResponse.json({
        message: 'Settings saved successfully',
        data: updatedOrganization,
      })
    }

    // Store other settings (in production, save to database)
    const key = `${session.user.email}:${section}`
    settingsStore.set(key, validatedData)

    // Log the action
    console.log(`Settings updated for ${session.user.email}: ${section}`)

    return NextResponse.json({
      message: 'Settings saved successfully',
      data: validatedData,
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { section } = await params
    const key = `${session.user.email}:${section}`
    
    settingsStore.delete(key)

    return NextResponse.json({
      message: 'Settings deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
