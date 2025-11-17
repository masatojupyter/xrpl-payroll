import { prisma } from "@/../prisma/client";

export type NotificationType = 
  | "employee_registered" 
  | "payroll_completed" 
  | "payroll_failed"
  | "error" 
  | "system";

export interface NotificationMetadata {
  employeeId?: string;
  employeeName?: string;
  payrollId?: string;
  amount?: string;
  transactionHash?: string;
  errorMessage?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
      },
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  try {
    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: offset + notifications.length < total,
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return {
      notifications: [],
      total: 0,
      hasMore: false,
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        isRead: true,
      },
    });
    return notification.count > 0;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
    });
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

/**
 * Delete all read notifications for a user
 */
export async function deleteAllRead(userId: string) {
  try {
    await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });
    return true;
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return false;
  }
}

/**
 * Helper: Create employee registered notification
 */
export async function notifyEmployeeRegistered(
  userId: string,
  employeeData: { id: string; name: string; email: string }
) {
  return createNotification({
    userId,
    type: "employee_registered",
    title: "New Employee Registered",
    message: `${employeeData.name} (${employeeData.email}) has been successfully registered.`,
    metadata: {
      employeeId: employeeData.id,
      employeeName: employeeData.name,
    },
  });
}

/**
 * Helper: Create payroll completed notification
 */
export async function notifyPayrollCompleted(
  userId: string,
  payrollData: {
    id: string;
    employeeName: string;
    amount: string;
    transactionHash: string;
  }
) {
  return createNotification({
    userId,
    type: "payroll_completed",
    title: "Payroll Payment Completed",
    message: `Payment of ${payrollData.amount} XRP to ${payrollData.employeeName} has been completed successfully.`,
    metadata: {
      payrollId: payrollData.id,
      employeeName: payrollData.employeeName,
      amount: payrollData.amount,
      transactionHash: payrollData.transactionHash,
    },
  });
}

/**
 * Helper: Create payroll failed notification
 */
export async function notifyPayrollFailed(
  userId: string,
  payrollData: {
    id: string;
    employeeName: string;
    amount: string;
    errorMessage: string;
  }
) {
  return createNotification({
    userId,
    type: "payroll_failed",
    title: "Payroll Payment Failed",
    message: `Payment of ${payrollData.amount} XRP to ${payrollData.employeeName} failed: ${payrollData.errorMessage}`,
    metadata: {
      payrollId: payrollData.id,
      employeeName: payrollData.employeeName,
      amount: payrollData.amount,
      errorMessage: payrollData.errorMessage,
    },
  });
}

/**
 * Helper: Create error notification
 */
export async function notifyError(
  userId: string,
  errorData: {
    title: string;
    message: string;
    details?: Record<string, unknown>;
  }
) {
  return createNotification({
    userId,
    type: "error",
    title: errorData.title,
    message: errorData.message,
    metadata: (errorData.details || {}) as NotificationMetadata,
  });
}

/**
 * Helper: Create system notification
 */
export async function notifySystem(
  userId: string,
  systemData: {
    title: string;
    message: string;
    details?: Record<string, unknown>;
  }
) {
  return createNotification({
    userId,
    type: "system",
    title: systemData.title,
    message: systemData.message,
    metadata: (systemData.details || {}) as NotificationMetadata,
  });
}
