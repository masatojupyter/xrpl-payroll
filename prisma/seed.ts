import { PrismaClient, AttendanceType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...')
  await prisma.timerEvent.deleteMany()
  await prisma.timeCorrection.deleteMany()
  await prisma.operationLog.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.payroll.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.department.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create Organizations
  console.log('📦 Creating organizations...')
  const org1 = await prisma.organization.create({
    data: {
      name: 'Tech Innovations Inc.',
      address: '123 Silicon Valley Blvd, San Francisco, CA 94105',
      phone: '+1-415-555-0100',
      email: 'contact@techinnovations.com',
      taxId: 'TI-123456789',
      fiscalYearStart: '04-01',
    },
  })

  const org2 = await prisma.organization.create({
    data: {
      name: 'Global Solutions Ltd.',
      address: '456 Business Park, New York, NY 10001',
      phone: '+1-212-555-0200',
      email: 'info@globalsolutions.com',
      taxId: 'GS-987654321',
      fiscalYearStart: '01-01',
    },
  })

  // Create Admin Users
  console.log('👤 Creating admin users...')
  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'admin',
      companyName: 'Tech Innovations Inc.',
      firstName: 'Alice',
      lastName: 'Anderson',
      phoneNumber: '+1-415-555-0101',
      address: '789 Admin Street, San Francisco, CA',
      organizationId: org1.id,
    },
  })

  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@globalsolutions.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'admin',
      companyName: 'Global Solutions Ltd.',
      firstName: 'Bob',
      lastName: 'Brown',
      phoneNumber: '+1-212-555-0201',
      address: '321 Manager Ave, New York, NY',
      organizationId: org2.id,
    },
  })

  // Create Regular Users
  console.log('👥 Creating regular users...')
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'user',
      firstName: 'Charlie',
      lastName: 'Chen',
      phoneNumber: '+1-415-555-0102',
      organizationId: org1.id,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'user',
      firstName: 'Diana',
      lastName: 'Davis',
      phoneNumber: '+1-415-555-0103',
      organizationId: org1.id,
    },
  })

  // Create Departments
  console.log('🏢 Creating departments...')
  const engDept = await prisma.department.create({
    data: {
      name: 'Engineering',
      organizationId: org1.id,
    },
  })

  const salesDept = await prisma.department.create({
    data: {
      name: 'Sales',
      organizationId: org1.id,
    },
  })

  const hrDept = await prisma.department.create({
    data: {
      name: 'Human Resources',
      organizationId: org1.id,
    },
  })

  const marketingDept = await prisma.department.create({
    data: {
      name: 'Marketing',
      organizationId: org2.id,
    },
  })

  // Create Employees
  console.log('💼 Creating employees...')
  
  // Create User records for employees (for attendance tracking)
  const employeeUser1 = await prisma.user.create({
    data: {
      email: 'john.doe@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      organizationId: org1.id,
    },
  })

  const employee1 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP001',
      email: 'john.doe@techinnovations.com',
      firstName: 'John',
      lastName: 'Doe',
      departmentId: engDept.id,
      position: 'Senior Software Engineer',
      hourlyRate: 2.00, // Low rate for XRP Testnet (100 XRP limit)
      walletAddress: null, // Will be set by employee
      employmentType: 'full-time',
      isActive: true,
      password: hashedPassword,
      isInvitationAccepted: true,
    },
  })

  const employeeUser2 = await prisma.user.create({
    data: {
      email: 'jane.smith@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'employee',
      firstName: 'Jane',
      lastName: 'Smith',
      organizationId: org1.id,
    },
  })

  const employee2 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP002',
      email: 'jane.smith@techinnovations.com',
      firstName: 'Jane',
      lastName: 'Smith',
      departmentId: salesDept.id,
      position: 'Sales Manager',
      hourlyRate: 1.50, // Low rate for XRP Testnet (100 XRP limit)
      walletAddress: null, // Will be set by employee
      employmentType: 'full-time',
      isActive: true,
      password: hashedPassword,
      isInvitationAccepted: true,
    },
  })

  const employeeUser3 = await prisma.user.create({
    data: {
      email: 'mike.johnson@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'employee',
      firstName: 'Mike',
      lastName: 'Johnson',
      organizationId: org1.id,
    },
  })

  const employee3 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP003',
      email: 'mike.johnson@techinnovations.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      departmentId: engDept.id,
      position: 'Junior Developer',
      hourlyRate: 1.00, // Low rate for XRP Testnet (100 XRP limit)
      walletAddress: null, // Will be set by employee
      employmentType: 'full-time',
      isActive: true,
      password: hashedPassword,
      isInvitationAccepted: true,
    },
  })

  const employeeUser4 = await prisma.user.create({
    data: {
      email: 'sarah.wilson@techinnovations.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'employee',
      firstName: 'Sarah',
      lastName: 'Wilson',
      organizationId: org1.id,
    },
  })

  const employee4 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP004',
      email: 'sarah.wilson@techinnovations.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      departmentId: hrDept.id,
      position: 'HR Specialist',
      hourlyRate: 1.20, // Low rate for XRP Testnet (100 XRP limit)
      employmentType: 'part-time',
      isActive: true,
      password: hashedPassword,
      isInvitationAccepted: true,
    },
  })

  const employee5 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP005',
      email: 'inactive.employee@techinnovations.com',
      firstName: 'Former',
      lastName: 'Employee',
      departmentId: salesDept.id,
      position: 'Sales Representative',
      hourlyRate: 40.00,
      employmentType: 'full-time',
      isActive: false,
    },
  })

  // Create invited employee (not yet accepted)
  const employee6 = await prisma.employee.create({
    data: {
      organizationId: org1.id,
      employeeCode: 'EMP006',
      email: 'new.employee@techinnovations.com',
      firstName: 'New',
      lastName: 'Employee',
      departmentId: engDept.id,
      position: 'DevOps Engineer',
      hourlyRate: 70.00,
      employmentType: 'full-time',
      isActive: true,
      invitationToken: 'invite-token-123',
      invitationExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isInvitationAccepted: false,
    },
  })

  // Create employees for org2
  const employeeUser7 = await prisma.user.create({
    data: {
      email: 'emma.brown@globalsolutions.com',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'employee',
      firstName: 'Emma',
      lastName: 'Brown',
      organizationId: org2.id,
    },
  })

  const employee7 = await prisma.employee.create({
    data: {
      organizationId: org2.id,
      employeeCode: 'GS001',
      email: 'emma.brown@globalsolutions.com',
      firstName: 'Emma',
      lastName: 'Brown',
      departmentId: marketingDept.id,
      position: 'Marketing Director',
      hourlyRate: 90.00,
      walletAddress: 'rHV3sxw3g29w2boy2v9RDdTLQNGgujazby',
      employmentType: 'full-time',
      isActive: true,
      password: hashedPassword,
      isInvitationAccepted: true,
    },
  })

  // Helper function to check if a date is a weekday
  const isWeekday = (date: Date): boolean => {
    const day = date.getDay()
    return day !== 0 && day !== 6 // Not Sunday (0) or Saturday (6)
  }

  // Helper function to generate random work hours with some variation
  const generateWorkHours = (employeeType: 'full-time' | 'part-time') => {
    if (employeeType === 'part-time') {
      // Part-time: 4-6 hours
      const baseHours = 5
      const variation = (Math.random() - 0.5) * 2 // -1 to +1 hour
      return Math.max(4, Math.min(6, baseHours + variation))
    } else {
      // Full-time: 8-9 hours
      const baseHours = 8.5
      const variation = (Math.random() - 0.5) * 1.5 // -0.75 to +0.75 hour
      return Math.max(7.5, Math.min(9.5, baseHours + variation))
    }
  }

  // Create Attendance Records
  console.log('📅 Creating historical attendance records (Jan-Oct 2025)...')
  
  // Define employee data for attendance generation
  const employeeUsers = [
    { user: employeeUser1, employee: employee1, type: 'full-time' as const },
    { user: employeeUser2, employee: employee2, type: 'full-time' as const },
    { user: employeeUser3, employee: employee3, type: 'full-time' as const },
    { user: employeeUser4, employee: employee4, type: 'part-time' as const },
    { user: employeeUser7, employee: employee7, type: 'full-time' as const },
  ]

  let totalAttendanceCount = 0
  let totalTimerEventCount = 0

  // Generate attendance for January to November 2025 (up to yesterday)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  
  // Generate data up to current month
  const endMonth = currentYear === 2025 ? currentMonthIndex + 1 : 12
  
  for (let month = 0; month < endMonth; month++) {
    console.log(`  Generating data for ${new Date(2025, month).toLocaleString('en-US', { month: 'long' })} 2025...`)
    
    for (const empData of employeeUsers) {
      const daysInMonth = new Date(2025, month + 1, 0).getDate()
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(2025, month, day)
        
        // Skip future dates and recent 5 days (only generate data up to 5 days ago)
        // Recent data (today, yesterday, 2-4 days ago) will be created separately
        if (date >= new Date(currentYear, currentMonthIndex, now.getDate() - 4)) {
          continue
        }
        
        // Skip weekends
        if (!isWeekday(date)) continue
        
        // 5% chance of absence (sick day, etc.)
        if (Math.random() < 0.05) continue
        
        // Generate check-in time (8:00 - 10:00)
        const checkInHour = 8 + Math.floor(Math.random() * 2)
        const checkInMinute = Math.floor(Math.random() * 60)
        const checkInTime = Math.floor(new Date(2025, month, day, checkInHour, checkInMinute, 0).getTime() / 1000)
        
        // Generate work duration
        const workHours = generateWorkHours(empData.type)
        const workSeconds = Math.floor(workHours * 3600)
        
        // Generate break time (30-60 minutes)
        const breakMinutes = 30 + Math.floor(Math.random() * 31)
        const breakSeconds = breakMinutes * 60
        
        // Calculate check-out time
        const checkOutTime = checkInTime + workSeconds + breakSeconds
        const totalWorkMinutes = Math.floor(workSeconds / 60)
        
        // Create attendance record
        const attendance = await prisma.attendanceRecord.create({
          data: {
            userId: empData.user.id,
            date: new Date(2025, month, day, 0, 0, 0, 0),
            checkInTime,
            checkOutTime,
            totalWorkMinutes,
            status: 'COMPLETED',
            attendanceType: 'present',
          },
        })
        totalAttendanceCount++
        
        // Create timer events for this attendance
        const morningWorkEnd = checkInTime + Math.floor(workSeconds * 0.45) // 45% of work in morning
        const breakStart = morningWorkEnd
        const breakEnd = breakStart + breakSeconds
        const afternoonWorkEnd = checkOutTime
        
        // Morning work
        await prisma.timerEvent.create({
          data: {
            userId: empData.user.id,
            attendanceRecordId: attendance.id,
            eventType: 'WORK',
            timestamp: checkInTime,
            durationFromPrevious: 0,
            endTimestamp: breakStart,
          },
        })
        totalTimerEventCount++
        
        // Break
        await prisma.timerEvent.create({
          data: {
            userId: empData.user.id,
            attendanceRecordId: attendance.id,
            eventType: 'REST',
            timestamp: breakStart,
            durationFromPrevious: breakStart - checkInTime,
            endTimestamp: breakEnd,
          },
        })
        totalTimerEventCount++
        
        // Afternoon work
        await prisma.timerEvent.create({
          data: {
            userId: empData.user.id,
            attendanceRecordId: attendance.id,
            eventType: 'WORK',
            timestamp: breakEnd,
            durationFromPrevious: breakSeconds,
            endTimestamp: afternoonWorkEnd,
          },
        })
        totalTimerEventCount++
        
        // End event
        await prisma.timerEvent.create({
          data: {
            userId: empData.user.id,
            attendanceRecordId: attendance.id,
            eventType: 'END',
            timestamp: afternoonWorkEnd,
            durationFromPrevious: afternoonWorkEnd - breakEnd,
          },
        })
        totalTimerEventCount++
      }
    }
  }

  console.log(`  ✅ Created ${totalAttendanceCount} attendance records`)
  console.log(`  ✅ Created ${totalTimerEventCount} timer events`)

  // Create recent attendance for current month (November 2025)
  console.log('📅 Creating current month attendance records...')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  // Today's attendance (in progress) - for employee John Doe
  const todayCheckIn = Math.floor(new Date(today.setHours(9, 0, 0, 0)).getTime() / 1000)
  const attendanceToday = await prisma.attendanceRecord.create({
    data: {
      userId: employeeUser1.id,
      date: new Date(today.setHours(0, 0, 0, 0)),
      checkInTime: todayCheckIn,
      status: 'IN_PROGRESS',
      attendanceType: 'present',
    },
  })

  // Yesterday's attendance (completed, PENDING approval) - for employee John Doe
  const yesterdayCheckIn = Math.floor(new Date(yesterday.setHours(9, 15, 0, 0)).getTime() / 1000)
  const yesterdayCheckOut = Math.floor(new Date(yesterday.setHours(18, 30, 0, 0)).getTime() / 1000)
  const yesterdayWorkMinutes = Math.floor((yesterdayCheckOut - yesterdayCheckIn) / 60)
  const attendanceYesterday = await prisma.attendanceRecord.create({
    data: {
      userId: employeeUser1.id,
      date: new Date(yesterday.setHours(0, 0, 0, 0)),
      checkInTime: yesterdayCheckIn,
      checkOutTime: yesterdayCheckOut,
      totalWorkMinutes: yesterdayWorkMinutes,
      status: 'COMPLETED',
      attendanceType: 'present',
      approvalStatus: 'PENDING', // For approval testing
    },
  })

  // Two days ago (with correction, APPROVED) - for employee John Doe
  const twoDaysAgoCheckIn = Math.floor(new Date(twoDaysAgo.setHours(8, 45, 0, 0)).getTime() / 1000)
  const twoDaysAgoCheckOut = Math.floor(new Date(twoDaysAgo.setHours(17, 15, 0, 0)).getTime() / 1000)
  const twoDaysAgoWorkMinutes = Math.floor((twoDaysAgoCheckOut - twoDaysAgoCheckIn) / 60)
  const attendanceTwoDaysAgo = await prisma.attendanceRecord.create({
    data: {
      userId: employeeUser1.id,
      date: new Date(twoDaysAgo.setHours(0, 0, 0, 0)),
      checkInTime: twoDaysAgoCheckIn,
      checkOutTime: twoDaysAgoCheckOut,
      totalWorkMinutes: twoDaysAgoWorkMinutes,
      status: 'COMPLETED',
      attendanceType: 'present',
      notes: 'Time corrected by admin',
      approvalStatus: 'APPROVED', // For XRP payment testing
      approvedBy: admin1.id,
      approvedAt: Math.floor(Date.now() / 1000),
    },
  })

  // Admin user attendance for testing
  const user2Yesterday = new Date()
  user2Yesterday.setDate(user2Yesterday.getDate() - 1)
  const user2CheckIn = Math.floor(new Date(user2Yesterday.setHours(10, 0, 0, 0)).getTime() / 1000)
  const user2CheckOut = Math.floor(new Date(user2Yesterday.setHours(19, 0, 0, 0)).getTime() / 1000)
  const user2WorkMinutes = Math.floor((user2CheckOut - user2CheckIn) / 60)
  const attendanceUser2 = await prisma.attendanceRecord.create({
    data: {
      userId: user2.id,
      date: new Date(user2Yesterday.setHours(0, 0, 0, 0)),
      checkInTime: user2CheckIn,
      checkOutTime: user2CheckOut,
      totalWorkMinutes: user2WorkMinutes,
      status: 'COMPLETED',
      attendanceType: 'present',
      approvalStatus: 'PENDING',
    },
  })

  // Create additional pending attendance records for other employees
  // Employee 2 (Jane Smith) - 3 days ago, PENDING
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const emp2CheckIn = Math.floor(new Date(threeDaysAgo.setHours(9, 0, 0, 0)).getTime() / 1000)
  const emp2CheckOut = Math.floor(new Date(threeDaysAgo.setHours(17, 0, 0, 0)).getTime() / 1000)
  const emp2WorkMinutes = Math.floor((emp2CheckOut - emp2CheckIn) / 60)
  const attendanceEmp2 = await prisma.attendanceRecord.create({
    data: {
      userId: employeeUser2.id,
      date: new Date(threeDaysAgo.setHours(0, 0, 0, 0)),
      checkInTime: emp2CheckIn,
      checkOutTime: emp2CheckOut,
      totalWorkMinutes: emp2WorkMinutes,
      status: 'COMPLETED',
      attendanceType: 'present',
      approvalStatus: 'PENDING',
    },
  })

  // Employee 3 (Mike Johnson) - 4 days ago, APPROVED (for payment test)
  const fourDaysAgo = new Date()
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
  const emp3CheckIn = Math.floor(new Date(fourDaysAgo.setHours(8, 30, 0, 0)).getTime() / 1000)
  const emp3CheckOut = Math.floor(new Date(fourDaysAgo.setHours(17, 30, 0, 0)).getTime() / 1000)
  const emp3WorkMinutes = Math.floor((emp3CheckOut - emp3CheckIn) / 60)
  const attendanceEmp3 = await prisma.attendanceRecord.create({
    data: {
      userId: employeeUser3.id,
      date: new Date(fourDaysAgo.setHours(0, 0, 0, 0)),
      checkInTime: emp3CheckIn,
      checkOutTime: emp3CheckOut,
      totalWorkMinutes: emp3WorkMinutes,
      status: 'COMPLETED',
      attendanceType: 'present',
      approvalStatus: 'APPROVED',
      approvedBy: admin1.id,
      approvedAt: Math.floor(Date.now() / 1000),
    },
  })

  // Create Timer Events
  console.log('⏱️  Creating timer events...')
  // Work event for today - for employee John Doe
  await prisma.timerEvent.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceToday.id,
      eventType: 'WORK',
      timestamp: todayCheckIn,
      memo: 'Started morning work',
    },
  })

  // Yesterday's timer events with breaks - for employee John Doe
  const yesterdayWorkStart = yesterdayCheckIn
  const yesterdayBreakStart = yesterdayWorkStart + (3 * 3600) // 3 hours later
  const yesterdayBreakEnd = yesterdayBreakStart + (3600) // 1 hour break
  const yesterdayWorkEnd = yesterdayCheckOut

  await prisma.timerEvent.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      eventType: 'WORK',
      timestamp: yesterdayWorkStart,
      durationFromPrevious: 0,
      endTimestamp: yesterdayBreakStart,
      memo: 'Morning work session',
    },
  })

  await prisma.timerEvent.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      eventType: 'REST',
      timestamp: yesterdayBreakStart,
      durationFromPrevious: 3 * 3600,
      endTimestamp: yesterdayBreakEnd,
      memo: 'Lunch break',
    },
  })

  await prisma.timerEvent.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      eventType: 'WORK',
      timestamp: yesterdayBreakEnd,
      durationFromPrevious: 3600,
      endTimestamp: yesterdayWorkEnd,
      memo: 'Afternoon work session',
    },
  })

  await prisma.timerEvent.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      eventType: 'END',
      timestamp: yesterdayWorkEnd,
      durationFromPrevious: yesterdayWorkEnd - yesterdayBreakEnd,
      memo: 'End of day',
    },
  })

  // Create Operation Logs
  console.log('📝 Creating operation logs...')
  await prisma.operationLog.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceToday.id,
      action: 'CHECK_IN',
      newValue: { timestamp: todayCheckIn, type: 'auto' },
      timestamp: todayCheckIn,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  })

  await prisma.operationLog.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      action: 'CHECK_IN',
      newValue: { timestamp: yesterdayCheckIn },
      timestamp: yesterdayCheckIn,
      ipAddress: '192.168.1.100',
    },
  })

  await prisma.operationLog.create({
    data: {
      userId: employeeUser1.id,
      attendanceRecordId: attendanceYesterday.id,
      action: 'CHECK_OUT',
      newValue: { timestamp: yesterdayCheckOut },
      timestamp: yesterdayCheckOut,
      ipAddress: '192.168.1.100',
    },
  })

  await prisma.operationLog.create({
    data: {
      userId: admin1.id,
      attendanceRecordId: attendanceTwoDaysAgo.id,
      action: 'EDIT_TIME',
      oldValue: { checkOutTime: twoDaysAgoCheckOut - 1800 }, // 30 min earlier
      newValue: { checkOutTime: twoDaysAgoCheckOut },
      timestamp: Math.floor(Date.now() / 1000),
      reason: 'Corrected checkout time per employee request',
      ipAddress: '192.168.1.50',
    },
  })

  // Create Time Corrections
  console.log('✏️  Creating time corrections...')
  const correctionTimestamp = Math.floor(Date.now() / 1000)
  await prisma.timeCorrection.create({
    data: {
      attendanceRecordId: attendanceTwoDaysAgo.id,
      userId: employeeUser1.id,
      fieldName: 'checkOutTime',
      beforeValue: twoDaysAgoCheckOut - 1800, // 30 min earlier
      afterValue: twoDaysAgoCheckOut,
      reason: 'Forgot to check out on time, was working until 17:15',
      approvalStatus: 'APPROVED',
      approvedBy: admin1.id,
      approvedAt: correctionTimestamp,
    },
  })

  await prisma.timeCorrection.create({
    data: {
      attendanceRecordId: attendanceUser2.id,
      userId: user2.id,
      fieldName: 'checkInTime',
      beforeValue: user2CheckIn + 900, // 15 min later
      afterValue: user2CheckIn,
      reason: 'System glitch, actually arrived on time',
      approvalStatus: 'PENDING',
    },
  })

  // Create Payroll Records
  console.log('💰 Creating payroll records...')
  const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const lastMonthStr = lastMonth.toISOString().substring(0, 7)

  await prisma.payroll.create({
    data: {
      employeeId: employee1.id,
      organizationId: org1.id,
      period: lastMonthStr,
      totalHours: 168.5,
      totalAmountUSD: 14406.75, // 168.5 * 85.50
      totalAmount: 14406.75, // Legacy field
      transactionHash: '0xABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890EFG',
      status: 'paid',
      paidAt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 5), // 5th of next month
    },
  })

  await prisma.payroll.create({
    data: {
      employeeId: employee2.id,
      organizationId: org1.id,
      period: lastMonthStr,
      totalHours: 172.0,
      totalAmountUSD: 12900.00, // 172 * 75.00
      totalAmount: 12900.00, // Legacy field
      transactionHash: '0xDEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890EFG123ABC',
      status: 'paid',
      paidAt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 5),
    },
  })

  await prisma.payroll.create({
    data: {
      employeeId: employee3.id,
      organizationId: org1.id,
      period: lastMonthStr,
      totalHours: 165.0,
      totalAmountUSD: 7425.00, // 165 * 45.00
      totalAmount: 7425.00, // Legacy field
      status: 'processing',
    },
  })

  await prisma.payroll.create({
    data: {
      employeeId: employee1.id,
      organizationId: org1.id,
      period: currentMonth,
      totalHours: 85.0,
      totalAmountUSD: 7267.50, // 85 * 85.50
      totalAmount: 7267.50, // Legacy field
      status: 'pending',
    },
  })

  await prisma.payroll.create({
    data: {
      employeeId: employee4.id,
      organizationId: org1.id,
      period: lastMonthStr,
      totalHours: 80.0, // Part-time
      totalAmountUSD: 4400.00, // 80 * 55.00
      totalAmount: 4400.00, // Legacy field
      status: 'paid',
      transactionHash: '0xGHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890EFG123ABC456DEF',
      paidAt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 5),
    },
  })

  // Create Notifications
  console.log('🔔 Creating notifications...')
  await prisma.notification.create({
    data: {
      userId: admin1.id,
      type: 'employee_registered',
      title: 'New Employee Registered',
      message: 'John Doe has completed registration and is ready to start.',
      metadata: { employeeId: employee1.id, employeeCode: 'EMP001' },
      isRead: true,
    },
  })

  await prisma.notification.create({
    data: {
      userId: admin1.id,
      type: 'payroll_completed',
      title: 'Payroll Processed Successfully',
      message: `Payroll for period ${lastMonthStr} has been processed for 3 employees.`,
      metadata: { period: lastMonthStr, employeeCount: 3 },
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      userId: user1.id,
      type: 'system',
      title: 'Time Correction Approved',
      message: 'Your time correction request for check-out time has been approved.',
      metadata: { attendanceRecordId: attendanceTwoDaysAgo.id },
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      userId: user2.id,
      type: 'system',
      title: 'Time Correction Pending',
      message: 'Your time correction request is pending admin approval.',
      metadata: { attendanceRecordId: attendanceUser2.id },
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      userId: admin1.id,
      type: 'error',
      title: 'Payment Processing Failed',
      message: 'Failed to process payment for employee EMP003. Please retry.',
      metadata: { employeeId: employee3.id, error: 'Network timeout' },
      isRead: false,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`- Organizations: 2`)
  console.log(`- Admin Users: 2`)
  console.log(`- Regular Users: 2`)
  console.log(`- Departments: 4`)
  console.log(`- Employees: 7`)
  console.log(`- Attendance Records: 4`)
  console.log(`- Timer Events: 4`)
  console.log(`- Operation Logs: 4`)
  console.log(`- Time Corrections: 2`)
  console.log(`- Payroll Records: 5`)
  console.log(`- Notifications: 5`)
  console.log('\n🔐 Test Credentials:')
  console.log('Admin: admin@techinnovations.com / password123')
  console.log('Admin: admin@globalsolutions.com / password123')
  console.log('User: user1@techinnovations.com / password123')
  console.log('User: user2@techinnovations.com / password123')
  console.log('Employee: john.doe@techinnovations.com / password123')
  console.log('Employee: jane.smith@techinnovations.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
