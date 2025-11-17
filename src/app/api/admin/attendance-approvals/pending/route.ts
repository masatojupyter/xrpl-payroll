import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'
import { pendingApprovalsQuerySchema } from '@/lib/validators/approval'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * POST - 承認待ち勤怠記録の一覧を取得
 * 
 * リクエストボディ:
 * - employeeId: 従業員ID（オプション）
 * - departmentId: 部門ID（オプション）
 * - startDate: 開始日（YYYY-MM-DD形式、オプション）
 * - endDate: 終了日（YYYY-MM-DD形式、オプション）
 * - page: ページ番号（デフォルト: 1）
 * - limit: 1ページあたりの取得件数（デフォルト: 20、最大: 100）
 * - sortBy: ソート項目（date | employeeName | totalWorkMinutes、デフォルト: date）
 * - sortOrder: ソート順序（asc | desc、デフォルト: desc）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin権限チェック
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // リクエストボディの取得
    let body
    try {
      body = await request.json()
    } catch (error) {
      // ボディが空の場合はデフォルト値を使用
      body = {}
    }

    // デフォルト値の設定
    const queryParams = {
      employeeId: body.employeeId || undefined,
      departmentId: body.departmentId || undefined,
      startDate: body.startDate || undefined,
      endDate: body.endDate || undefined,
      page: body.page || 1,
      limit: body.limit || 20,
      sortBy: body.sortBy || 'date',
      sortOrder: body.sortOrder || 'desc',
    }

    // Zodバリデーション
    let validatedQuery
    try {
      validatedQuery = pendingApprovalsQuerySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request parameters',
            details: error.issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // 組織内のユーザーIDを取得
    const orgUsers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: { id: true },
    })
    const orgUserIds = orgUsers.map(u => u.id)

    // フィルタ条件の構築
    const whereClause: Prisma.AttendanceRecordWhereInput = {
      userId: { in: orgUserIds },
      status: 'COMPLETED',
      approvalStatus: 'PENDING',
    }

    // 従業員IDフィルタ
    if (validatedQuery.employeeId) {
      whereClause.userId = validatedQuery.employeeId
    }

        // 部門IDフィルタ
        if (validatedQuery.departmentId) {
          // 部門に所属する従業員のIDを取得
          const departmentEmployees = await prisma.employee.findMany({
            where: {
              departmentId: validatedQuery.departmentId,
              organizationId: session.user.organizationId,
              isActive: true,
            },
            select: { id: true },
          })
          
          const employeeIds = departmentEmployees.map(e => e.id)
          whereClause.userId = { in: employeeIds }
        }
    
        // 日付フィルタ
        if (validatedQuery.startDate || validatedQuery.endDate) {
          whereClause.date = {}
          if (validatedQuery.startDate) {
            whereClause.date.gte = new Date(validatedQuery.startDate)
          }
          if (validatedQuery.endDate) {
            whereClause.date.lte = new Date(validatedQuery.endDate)
          }
        }
    
        // レコード取得
        const records = await prisma.attendanceRecord.findMany({
          where: whereClause,
          skip: (validatedQuery.page - 1) * validatedQuery.limit,
          take: validatedQuery.limit,
          orderBy: {
            date: validatedQuery.sortOrder,
          },
        })
    
        // 総件数取得
        const total = await prisma.attendanceRecord.count({
          where: whereClause,
        })
    
        return NextResponse.json({
          records,
          total,
          page: validatedQuery.page,
          limit: validatedQuery.limit,
        })
      } catch (error) {
        console.error('Error fetching pending approvals:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
