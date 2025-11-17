import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'

/**
 * GET /api/employee/approved-attendance
 * 
 * 従業員の承認済み勤怠記録を取得
 * - 承認済み（approvalStatus: APPROVED）
 * - Payroll情報も含める（既に受領済みかどうか判定用）
 * - リアルタイムXRP/USDレートで推定XRP額を計算
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    // 従業員情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    })

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 従業員レコードを取得（時給情報が必要）
    console.log('[DEBUG] Looking for employee with:', {
      email: user.email,
      organizationId: user.organizationId,
    })
    
    const employee = await prisma.employee.findFirst({
      where: {
        email: user.email,
        organizationId: user.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        walletAddress: true,
      },
    })

    console.log('[DEBUG] Employee found:', employee ? 'Yes' : 'No')
    
    if (!employee) {
      // すべての従業員を取得してデバッグ
      const allEmployees = await prisma.employee.findMany({
        where: { organizationId: user.organizationId },
        select: { email: true, isActive: true },
      })
      
      console.error('[DEBUG] Employee not found. Available employees in organization:', allEmployees)
      console.error('[DEBUG] Looking for email:', user.email)
      
      return NextResponse.json(
        { 
          error: 'Employee record not found',
          details: `No employee record found for email: ${user.email}`,
          debug: {
            searchedEmail: user.email,
            organizationId: user.organizationId,
            availableEmployees: allEmployees,
          }
        },
        { status: 404 }
      )
    }
    
    console.log('[DEBUG] Employee record:', employee)
    console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    console.log('[DEBUG] User ID:', user.id)
    console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')

    // 承認済み勤怠記録を取得（Payroll情報も含める）
    const approvedAttendance = await prisma.attendanceRecord.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        approvalStatus: 'APPROVED',
      },
      include: {
        payroll: {
          include: {
            paymentTransaction: {
              select: {
                transactionHash: true,
                status: true,
                completedAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // XRP/USDレートを取得
    let exchangeRate = 2.0 // デフォルトレート
    try {
      const rateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/xrp/exchange-rate`)
      if (rateResponse.ok) {
        const rateData = await rateResponse.json()
        if (rateData.success && rateData.rate) {
          exchangeRate = rateData.rate
        }
      }
    } catch (error) {
      console.warn('Failed to fetch XRP/USD rate, using default:', error)
    }

    // レスポンスデータを整形
    const formattedData = approvedAttendance.map(record => {
      const workHours = record.totalWorkMinutes / 60
      const amountUSD = workHours * parseFloat(employee.hourlyRate.toString())
      const estimatedXRP = amountUSD / exchangeRate

      // Payrollステータスの判定
      let payrollStatus: 'unpaid' | 'processing' | 'paid' | 'failed' = 'unpaid'
      if (record.payroll) {
        if (record.payroll.status === 'paid') {
          payrollStatus = 'paid'
        } else if (record.payroll.status === 'failed') {
          payrollStatus = 'failed'
        } else if (record.payroll.transactionStatus === 'processing') {
          payrollStatus = 'processing'
        }
      }

      return {
        id: record.id,
        date: record.date.toISOString().split('T')[0],
        checkInTime: record.checkInTime.toString(),
        checkOutTime: record.checkOutTime?.toString() || null,
        totalWorkMinutes: record.totalWorkMinutes,
        totalWorkHours: workHours.toFixed(2),
        hourlyRate: employee.hourlyRate.toString(),
        amountUSD: amountUSD.toFixed(2),
        estimatedXRP: estimatedXRP.toFixed(6),
        currentExchangeRate: exchangeRate.toFixed(4),
        payrollStatus,
        payrollId: record.payroll?.id || null,
        transactionHash: record.payroll?.paymentTransaction?.transactionHash || null,
        paidAt: record.payroll?.paidAt?.toISOString() || null,
        hasWalletAddress: !!employee.walletAddress,
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedData,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hourlyRate: employee.hourlyRate.toString(),
        walletAddress: employee.walletAddress,
        hasWalletAddress: !!employee.walletAddress,
      },
      exchangeRate: exchangeRate.toFixed(4),
    })
  } catch (error) {
    console.error('Error fetching approved attendance:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch approved attendance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
