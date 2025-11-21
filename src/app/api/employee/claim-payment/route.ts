import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'
import { sendXRPPayment } from '@/lib/xrp/testnet-client'
import { z } from 'zod'

/**
 * リクエストボディのバリデーションスキーマ
 */
const claimPaymentSchema = z.object({
  attendanceRecordId: z.string().cuid('Invalid attendance record ID'),
})

/**
 * POST /api/employee/claim-payment
 * 
 * 従業員が承認済み勤怠に対してXRP支払いを受領する
 * - 勤怠記録の検証
 * - 給与計算
 * - XRP送金実行
 * - Payroll + PaymentTransactionレコード作成
 */
export async function POST(request: NextRequest) {
  console.log('[CLAIM-PAYMENT] API endpoint called')
  
  try {
    // 認証チェック
    console.log('[CLAIM-PAYMENT] Starting authentication check')
    const session = await auth()
    console.log('[CLAIM-PAYMENT] Session:', { 
      hasSession: !!session, 
      employeeId: session?.user?.id, // Employee ID is session.user.id
      userType: session?.user?.userType,
      email: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('[CLAIM-PAYMENT] Authentication failed: No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディの取得とバリデーション
    console.log('[CLAIM-PAYMENT] Parsing request body')
    let body
    try {
      body = await request.json()
      console.log('[CLAIM-PAYMENT] Request body:', body)
    } catch (error) {
      console.error('[CLAIM-PAYMENT] Failed to parse JSON:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    console.log('[CLAIM-PAYMENT] Validating request data')
    let validatedData
    try {
      validatedData = claimPaymentSchema.parse(body)
      console.log('[CLAIM-PAYMENT] Validation successful:', validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[CLAIM-PAYMENT] Validation failed:', error.issues)
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // 従業員のユーザータイプをチェック
    console.log('[CLAIM-PAYMENT] Checking user type:', session.user.userType)
    if (session.user.userType !== 'employee') {
      console.log('[CLAIM-PAYMENT] Access denied: User is not an employee')
      return NextResponse.json(
        { error: 'This endpoint is only for employees' },
        { status: 403 }
      )
    }

    // 従業員情報を取得（session.user.idはEmployee IDを含む）
    console.log('[CLAIM-PAYMENT] Fetching employee record for email:', session.user.email)
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user.email || '',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        walletAddress: true,
        organizationId: true,
      },
    })
    console.log('[CLAIM-PAYMENT] Employee record:', {
      found: !!employee,
      id: employee?.id,
      name: employee ? `${employee.firstName} ${employee.lastName}` : null,
      hasWallet: !!employee?.walletAddress,
      organizationId: employee?.organizationId
    })

    if (!employee) {
      console.log('[CLAIM-PAYMENT] Employee record not found')
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      )
    }

    if (!employee.organizationId) {
      console.log('[CLAIM-PAYMENT] Organization ID is missing for employee')
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // TypeScript type narrowing: organizationIdを非nullとして扱う
    const organizationId = employee.organizationId
    console.log('[CLAIM-PAYMENT] Organization ID:', organizationId)

    // 勤怠記録の検証
    console.log('[CLAIM-PAYMENT] Fetching attendance record:', validatedData.attendanceRecordId)
    const attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: { id: validatedData.attendanceRecordId },
      include: {
        payroll: true,
      },
    })
    console.log('[CLAIM-PAYMENT] Attendance record:', {
      found: !!attendanceRecord,
      id: attendanceRecord?.id,
      userId: attendanceRecord?.userId,
      status: attendanceRecord?.status,
      approvalStatus: attendanceRecord?.approvalStatus,
      totalWorkMinutes: attendanceRecord?.totalWorkMinutes,
      hasPayroll: !!attendanceRecord?.payroll
    })

    if (!attendanceRecord) {
      console.log('[CLAIM-PAYMENT] Attendance record not found')
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    // 権限チェック：自分の勤怠記録か（userIdはUser IDを指す）
    console.log('[CLAIM-PAYMENT] Checking ownership:', {
      attendanceUserId: attendanceRecord.userId,
      sessionUserId: session.user.id,
      match: attendanceRecord.userId === session.user.id
    })



    // if (attendanceRecord.userId !==) {
    //   console.log('[CLAIM-PAYMENT] Ownership check failed')
    //   return NextResponse.json(
    //     { error: 'Unauthorized: Cannot claim payment for other employees' },
    //     { status: 403 }
    //   )
    // }

    // 承認済みかチェック
    console.log('[CLAIM-PAYMENT] Checking approval status:', attendanceRecord.approvalStatus)
    if (attendanceRecord.approvalStatus !== 'APPROVED') {
      console.log('[CLAIM-PAYMENT] Not approved yet')
      return NextResponse.json(
        { error: 'Attendance record must be approved before claiming payment' },
        { status: 400 }
      )
    }

    // 完了状態かチェック
    console.log('[CLAIM-PAYMENT] Checking completion status:', attendanceRecord.status)
    if (attendanceRecord.status !== 'COMPLETED') {
      console.log('[CLAIM-PAYMENT] Not completed yet')
      return NextResponse.json(
        { error: 'Attendance record must be completed before claiming payment' },
        { status: 400 }
      )
    }

    // 既に支払い済みかチェック
    console.log('[CLAIM-PAYMENT] Checking existing payroll:', {
      hasPayroll: !!attendanceRecord.payroll,
      payrollStatus: attendanceRecord.payroll?.status,
      transactionStatus: attendanceRecord.payroll?.transactionStatus
    })
    
    let existingPayrollId: string | null = null
    let existingPaymentTransactionId: string | null = null
    
    if (attendanceRecord.payroll) {
      if (attendanceRecord.payroll.status === 'paid') {
        console.log('[CLAIM-PAYMENT] Payment already claimed')
        return NextResponse.json(
          {
            error: 'Payment already claimed',
            payroll: {
              id: attendanceRecord.payroll.id,
              paidAt: attendanceRecord.payroll.paidAt,
              transactionHash: attendanceRecord.payroll.transactionHash,
            },
          },
          { status: 400 }
        )
      } else if (attendanceRecord.payroll.transactionStatus === 'processing') {
        console.log('[CLAIM-PAYMENT] Payment is being processed')
        return NextResponse.json(
          { error: 'Payment is already being processed' },
          { status: 400 }
        )
      } else if (attendanceRecord.payroll.status === 'failed') {
        // failedステータスの場合は既存レコードを再利用
        console.log('[CLAIM-PAYMENT] Found failed payroll, will retry with existing record:', attendanceRecord.payroll.id)
        existingPayrollId = attendanceRecord.payroll.id
        
        // 既存のPaymentTransactionも取得
        const existingTransaction = await prisma.paymentTransaction.findFirst({
          where: { payrollId: attendanceRecord.payroll.id },
          orderBy: { createdAt: 'desc' },
        })
        if (existingTransaction) {
          existingPaymentTransactionId = existingTransaction.id
          console.log('[CLAIM-PAYMENT] Found existing payment transaction:', existingTransaction.id)
        }
      }
    }

    // ウォレットアドレスのチェック
    console.log('[CLAIM-PAYMENT] Checking wallet address:', {
      hasWallet: !!employee.walletAddress,
      walletAddress: employee.walletAddress
    })
    if (!employee.walletAddress) {
      console.log('[CLAIM-PAYMENT] Wallet address not set')
      return NextResponse.json(
        {
          error: 'Wallet address not set',
          message: 'Please set your XRP wallet address in settings before claiming payment',
        },
        { status: 400 }
      )
    }

    // 給与計算
    const workHours = attendanceRecord.totalWorkMinutes / 60
    const amountUSD = workHours * parseFloat(employee.hourlyRate.toString())
    console.log('[CLAIM-PAYMENT] Salary calculation:', {
      totalWorkMinutes: attendanceRecord.totalWorkMinutes,
      workHours,
      hourlyRate: employee.hourlyRate.toString(),
      amountUSD
    })

    // XRP/USDレート取得
    let exchangeRate = 2.0 // デフォルト
    console.log('[CLAIM-PAYMENT] Fetching XRP/USD exchange rate')
    try {
      const rateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/xrp/exchange-rate`)
      console.log('[CLAIM-PAYMENT] Exchange rate API response:', { ok: rateResponse.ok, status: rateResponse.status })
      if (rateResponse.ok) {
        const rateData = await rateResponse.json()
        console.log('[CLAIM-PAYMENT] Exchange rate data:', rateData)
        if (rateData.success && rateData.rate) {
          exchangeRate = rateData.rate
        }
      }
    } catch (error) {
      console.warn('[CLAIM-PAYMENT] Failed to fetch XRP/USD rate, using default:', error)
    }
    console.log('[CLAIM-PAYMENT] Using exchange rate:', exchangeRate)

    // XRP金額計算
    const amountXRP = amountUSD / exchangeRate
    console.log('[CLAIM-PAYMENT] XRP amount:', amountXRP)

    // 会社のウォレットアドレス取得
    const companyWalletAddress = process.env.XRP_TESTNET_WALLET_ADDRESS
    console.log('[CLAIM-PAYMENT] Company wallet:', {
      hasWallet: !!companyWalletAddress,
      walletAddress: companyWalletAddress
    })
    if (!companyWalletAddress) {
      console.log('[CLAIM-PAYMENT] Company wallet not configured')
      return NextResponse.json(
        {
          error: 'Company wallet not configured',
          message: 'Please contact your administrator',
        },
        { status: 500 }
      )
    }

    // トランザクション開始：Payroll作成/更新 → XRP送金 → 結果更新
    console.log('[CLAIM-PAYMENT] Starting database transaction')
    const result = await prisma.$transaction(async (tx) => {
      let payroll
      
      if (existingPayrollId) {
        // 既存のfailedレコードを更新
        console.log('[CLAIM-PAYMENT] Updating existing payroll record:', existingPayrollId)
        payroll = await tx.payroll.update({
          where: { id: existingPayrollId },
          data: {
            totalHours: workHours,
            totalAmountUSD: amountUSD,
            totalAmountXRP: amountXRP,
            totalAmount: amountUSD,
            exchangeRate: exchangeRate,
            status: 'pending',
            transactionStatus: 'processing',
            failureReason: null,
            retryCount: { increment: 1 },
          },
        })
        console.log('[CLAIM-PAYMENT] Payroll updated:', { id: payroll.id, retryCount: payroll.retryCount })
      } else {
        // 新規Payrollレコード作成
        console.log('[CLAIM-PAYMENT] Creating new payroll record')
        payroll = await tx.payroll.create({
          data: {
            employeeId: employee.id,
            organizationId: organizationId,
            period: attendanceRecord.date.toISOString().split('T')[0],
            totalHours: workHours,
            totalAmountUSD: amountUSD,
            totalAmountXRP: amountXRP,
            totalAmount: amountUSD,
            exchangeRate: exchangeRate,
            status: 'pending',
            transactionStatus: 'processing',
            attendanceRecordId: attendanceRecord.id,
          },
        })
        console.log('[CLAIM-PAYMENT] Payroll created:', { id: payroll.id })
      }

      let paymentTransaction
      
      if (existingPaymentTransactionId) {
        // 既存のPaymentTransactionを更新
        console.log('[CLAIM-PAYMENT] Updating existing payment transaction:', existingPaymentTransactionId)
        paymentTransaction = await tx.paymentTransaction.update({
          where: { id: existingPaymentTransactionId },
          data: {
            amountUSD: amountUSD,
            amountXRP: amountXRP,
            exchangeRate: exchangeRate,
            status: 'processing',
            errorMessage: null,
            transactionHash: null,
            ledgerIndex: null,
            completedAt: null,
            metadata: {
              attendanceRecordId: attendanceRecord.id,
              date: attendanceRecord.date.toISOString().split('T')[0],
              workHours: workHours,
              retryAttempt: true,
            },
          },
        })
        console.log('[CLAIM-PAYMENT] Payment transaction updated:', { id: paymentTransaction.id })
      } else {
        // 新規PaymentTransactionレコード作成
        console.log('[CLAIM-PAYMENT] Creating new payment transaction record')
        paymentTransaction = await tx.paymentTransaction.create({
          data: {
            payrollId: payroll.id,
            fromWalletAddress: companyWalletAddress,
            toWalletAddress: employee.walletAddress!,
            amountUSD: amountUSD,
            amountXRP: amountXRP,
            exchangeRate: exchangeRate,
            status: 'processing',
            initiatedBy: session.user.id,
            metadata: {
              attendanceRecordId: attendanceRecord.id,
              date: attendanceRecord.date.toISOString().split('T')[0],
              workHours: workHours,
            },
          },
        })
        console.log('[CLAIM-PAYMENT] Payment transaction created:', { id: paymentTransaction.id })
      }

      return { payroll, paymentTransaction }
    })
    console.log('[CLAIM-PAYMENT] Database transaction completed:', {
      payrollId: result.payroll.id,
      transactionId: result.paymentTransaction.id
    })

    // XRP送金実行（トランザクション外で実行）
    console.log('[CLAIM-PAYMENT] Sending XRP payment:', {
      toAddress: employee.walletAddress,
      amountXRP: amountXRP.toFixed(6),
      fromAddress: companyWalletAddress
    })
    const paymentResult = await sendXRPPayment({
      toAddress: employee.walletAddress!, // Already checked for null above
      amountXRP: amountXRP.toFixed(6),
      memo: `Payroll: ${attendanceRecord.date.toISOString().split('T')[0]} - ${employee.firstName} ${employee.lastName}`,
    })
    console.log('[CLAIM-PAYMENT] XRP payment result:', {
      success: paymentResult.success,
      transactionHash: paymentResult.transactionHash,
      ledgerIndex: paymentResult.ledgerIndex,
      error: paymentResult.error
    })

    // 送金結果に基づいてレコードを更新
    if (paymentResult.success && paymentResult.transactionHash) {
      // 成功時
      console.log('[CLAIM-PAYMENT] Payment successful, updating records')
      await prisma.$transaction([
        prisma.payroll.update({
          where: { id: result.payroll.id },
          data: {
            status: 'paid',
            transactionStatus: 'completed',
            transactionHash: paymentResult.transactionHash,
            paidAt: new Date(),
          },
        }),
        prisma.paymentTransaction.update({
          where: { id: result.paymentTransaction.id },
          data: {
            status: 'completed',
            transactionHash: paymentResult.transactionHash,
            ledgerIndex: paymentResult.ledgerIndex,
            completedAt: new Date(),
          },
        }),
      ])
      console.log('[CLAIM-PAYMENT] Records updated successfully')

      return NextResponse.json({
        success: true,
        message: 'Payment successfully claimed',
        payroll: {
          id: result.payroll.id,
          amountUSD: amountUSD.toFixed(2),
          amountXRP: amountXRP.toFixed(6),
          exchangeRate: exchangeRate.toFixed(4),
          transactionHash: paymentResult.transactionHash,
          paidAt: new Date().toISOString(),
        },
      })
    } else {
      // 失敗時
      const errorMessage = paymentResult.error || 'Unknown payment error'
      console.log('[CLAIM-PAYMENT] Payment failed:', errorMessage)
      
      console.log('[CLAIM-PAYMENT] Updating records with failure status')
      await prisma.$transaction([
        prisma.payroll.update({
          where: { id: result.payroll.id },
          data: {
            status: 'failed',
            transactionStatus: 'failed',
            failureReason: errorMessage,
            retryCount: 0,
          },
        }),
        prisma.paymentTransaction.update({
          where: { id: result.paymentTransaction.id },
          data: {
            status: 'failed',
            errorMessage: errorMessage,
          },
        }),
      ])
      console.log('[CLAIM-PAYMENT] Failure records updated')

      return NextResponse.json(
        {
          error: 'Payment failed',
          message: errorMessage,
          details: {
            amountUSD: amountUSD.toFixed(2),
            amountXRP: amountXRP.toFixed(6),
            exchangeRate: exchangeRate.toFixed(4),
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[CLAIM-PAYMENT] Unexpected error:', error)
    console.error('[CLAIM-PAYMENT] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      {
        error: 'Failed to claim payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
